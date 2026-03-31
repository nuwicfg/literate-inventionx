const https = require('https');

/**
 * Enhanced TikTok Scraper for "Baba" Data (Stats + Videos)
 * @param {string} username TikTok handle
 */
async function scrapeTikTokUser(username) {
  const url = `https://www.tiktok.com/@${username}`;
  
  const options = {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    }
  };

  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        // Find the Universal Data for Rehydration
        const regex = /<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">([\s\S]*?)<\/script>/;
        const match = data.match(regex);
        
        if (match && match[1]) {
          try {
            const json = JSON.parse(match[1]);
            const baseData = json.__DEFAULT_SCOPE__['webapp.user-detail'];
            
            if (!baseData) throw new Error("Could not find user-detail scope in JSON.");

            const userInfo = baseData.userInfo;
            const stats = userInfo.stats;
            const user = userInfo.user;

            // Extract Video Modules ("Baba" Data)
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
                dynamicCover: v.video.dynamicCover,
                duration: v.video.duration
            })).sort((a, b) => b.createTime - a.createTime);

            resolve({
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
            reject({ success: false, message: "Parsing failed: " + e.message });
          }
        } else {
          reject({ success: false, message: "Data script not found. Verify if TikTok blocked the request." });
        }
      });
    }).on('error', (err) => {
      reject({ success: false, message: "Request error: " + err.message });
    });
  });
}

// TEST RUN for MrBeast
const testUser = 'mrbeast';
console.log(`🚀 SCRAPING BABA DATA FOR: @${testUser}...`);
scrapeTikTokUser(testUser)
  .then(data => {
    console.log("✅ SUCCESS!");
    console.log(`👤 Profile: ${data.user.nickname} (@${data.user.uniqueId})`);
    console.log(`📊 Stats: ${data.stats.followerCount} Followers, ${data.stats.heartCount} Likes`);
    console.log(`📹 Captured ${data.videos.length} recent videos.`);
    if (data.videos.length > 0) {
      console.log("🔥 Sample Video Views:", data.videos.slice(0, 3).map(v => v.views));
    }
  })
  .catch(err => console.error("❌ FAILED:", err.message));
