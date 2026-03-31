const express = require('express');
const cors = require('cors');
const https = require('https');
const axios = require('axios'); // Easier for multiple jumps in OAuth
const querystring = require('querystring');
const crypto = require('crypto');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from the root directory
app.use(express.static(__dirname));

// Serve index.html as the root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 0. HEALTH CHECK (For frontend verification)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
});

// REAL TIKTOK CREDENTIALS - Move to Environment Variables in Production
const CLIENT_KEY = process.env.TIKTOK_CLIENT_KEY || 'awi3r4wn4yn2rx4g';
const CLIENT_SECRET = process.env.TIKTOK_CLIENT_SECRET || 'BodXLsJbJ1NL2F4LVNuZ2fyQGsT1oNqS';

// PRODUCTION REDIRECT URI
const PRODUCTION_URL = 'https://creatorai.lol';
const REDIRECT_URI = `${PRODUCTION_URL}/callback`; 

// In-memory store for PKCE verifiers (for demo purposes)
const pkceStore = new Map();

function generateCodeChallenge(verifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

app.get('/login', (req, res) => {
    console.log('--- LOGIN REQUEST RECEIVED ---');
    const code_verifier = crypto.randomBytes(32).toString('hex');
    const code_challenge = generateCodeChallenge(code_verifier);
    const state = Math.random().toString(36).substring(7);

    // Save verifier for the callback
    pkceStore.set(state, code_verifier);

    let url = 'https://www.tiktok.com/v2/auth/authorize/';
    const params = {
        client_key: CLIENT_KEY,
        scope: 'user.info.basic,user.info.stats,video.list,video.stats',
        response_type: 'code',
        redirect_uri: REDIRECT_URI,
        state: state,
        code_challenge: code_challenge,
        code_challenge_method: 'S256'
    };
    
    res.redirect(`${url}?${querystring.stringify(params)}`);
});

// 2. Callback from TikTok
app.get('/callback', async (req, res) => {
    const { code, state } = req.query;

    if (!code) {
        return res.send('<h1>Error during TikTok login.</h1>');
    }

    try {
        const code_verifier = pkceStore.get(state);
        pkceStore.delete(state); // Clean up

        // Exchange Code for Access Token
        const tokenResponse = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', 
            querystring.stringify({
                client_key: CLIENT_KEY,
                client_secret: CLIENT_SECRET,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: REDIRECT_URI,
                code_verifier: code_verifier
            }), {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });

        const accessToken = tokenResponse.data.access_token;
        const openId = tokenResponse.data.open_id;

        // Fetch Real User Data from official API
        const userResponse = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
            params: { fields: 'open_id,union_id,avatar_url,display_name' },
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        // Redirect back to our dashboard with the user data
        const userData = userResponse.data.data.user;
        const encodedData = Buffer.from(JSON.stringify(userData)).toString('base64');
        
        // Redirect to the dashboard using the production URL (or relative path)
        res.redirect(`/dashboard.html?auth=success&token=${accessToken}&data=${encodedData}`); 
    } catch (error) {
        console.error('Auth Error Details:', {
            message: error.message,
            response: error.response?.data,
            code: error.code
        });
        res.status(500).send(`
            <div style="font-family: sans-serif; padding: 40px; text-align: center; background: #fff1f2; color: #991b1b; border-radius: 8px; border: 1px solid #fecaca; max-width: 600px; margin: 50px auto;">
                <h1 style="margin-bottom: 20px;">TikTok Auth Failed!</h1>
                <p style="margin-bottom: 20px;">We couldn't complete the login process. This usually means the <b>Redirect URI</b> doesn't match the one in your TikTok Developer Panel.</p>
                <code style="display: block; padding: 10px; background: #fee2e2; border-radius: 4px; margin-bottom: 20px; font-size: 13px;">${JSON.stringify(error.response?.data || error.message)}</code>
                <a href="/login.html" style="display: inline-block; padding: 10px 20px; background: #ef4444; color: white; text-decoration: none; border-radius: 6px;">Back to Login</a>
            </div>
        `);
    }
});

// 3. SECURE ENDPOINT: Fetch real metrics using Access Token
app.get('/api/tiktok/data', async (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(401).json({ success: false, message: 'No token' });

    try {
        // A. Fetch Stats (Followers, Likes)
        const statsRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
            params: { fields: 'follower_count,following_count,heart_count,video_count' },
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // B. Fetch Recent Videos
        const videoRes = await axios.post('https://open.tiktokapis.com/v2/video/list/', 
            { max_count: 10 },
            { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );

        res.json({
            success: true,
            stats: statsRes.data.data.user,
            videos: videoRes.data.data.videos || []
        });
    } catch (error) {
        console.error('Data Fetch Error:', error.response?.data || error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 1. IMPROVED PUBLIC SCRAPER: Fetch comprehensive "Baba" data via Username
app.get('/api/user/:username', (req, res) => {
    const { username } = req.params;
    console.log(`🔍 Scraping Baba Data for: @${username}...`);

    const url = `https://www.tiktok.com/@${username}`;
    const options = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        }
    };

    https.get(url, options, (tikRes) => {
        let data = '';
        tikRes.on('data', chunk => { data += chunk; });
        tikRes.on('end', () => {
            const regex = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/;
            const match = data.match(regex);
            
            if (match && match[1]) {
                try {
                    const json = JSON.parse(match[1]);
                    const baseData = json.__DEFAULT_SCOPE__['webapp.user-detail'];
                    
                    if (!baseData) return res.json({ success: false, message: 'User detail scope missing.' });

                    const userInfo = baseData.userInfo;
                    const stats = userInfo.stats;
                    const user = userInfo.user;

                    // Extract Video Modules
                    const itemModule = baseData.itemModule || {};
                    const videos = Object.values(itemModule).map(v => ({
                        id: v.id,
                        desc: v.desc,
                        createTime: v.createTime,
                        views: v.stats.playCount,
                        likes: v.stats.diggCount,
                        comments: v.stats.commentCount,
                        shares: v.stats.shareCount,
                        cover: v.video.cover,
                        duration: v.video.duration
                    })).sort((a, b) => b.createTime - a.createTime);

                    res.json({
                        success: true,
                        user: {
                            id: user.id,
                            uniqueId: user.uniqueId,
                            nickname: user.nickname,
                            avatar: user.avatarMedium,
                            signature: user.signature,
                            verified: user.verified
                        },
                        stats: {
                            followerCount: stats.followerCount,
                            followingCount: stats.followingCount,
                            heartCount: stats.heartCount,
                            videoCount: stats.videoCount
                        },
                        videos: videos
                    });
                } catch (e) {
                    res.json({ success: false, message: 'Parse error: ' + e.message });
                }
            } else {
                res.json({ success: false, message: 'No universal data found (Bot blocked).' });
            }
        });
    }).on('error', (err) => {
        res.json({ success: false, message: 'Network error: ' + err.message });
    });
});

// Export the app for Vercel
module.exports = app;

// Only listen if run directly (local development)
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`\n🚀 CREATOR AI SERVER RUNNING`);
        console.log(`✅ Mode: Development (Local)`);
        console.log(`✅ Redirect URI: ${REDIRECT_URI}`);
        console.log(`🔗 Accessible at: http://localhost:${PORT}\n`);
    });
}
