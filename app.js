/* ==========================================================================
   TikTok AI Creator Assistant - App Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // 1. Initialize Performance Chart (Chart.js)
    const ctx = document.getElementById('performanceChart').getContext('2d');
    
    // Create gradients for smooth visual
    const gradientFill = ctx.createLinearGradient(0, 0, 0, 300);
    gradientFill.addColorStop(0, 'rgba(0, 242, 254, 0.5)'); // Neon blue
    gradientFill.addColorStop(1, 'rgba(0, 242, 254, 0.05)');

    const gradientPink = ctx.createLinearGradient(0, 0, 0, 300);
    gradientPink.addColorStop(0, 'rgba(255, 0, 80, 0.5)'); // Neon pink
    gradientPink.addColorStop(1, 'rgba(255, 0, 80, 0.05)');

    // Mock Data for past 7 days
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const viewsData = [12000, 19000, 15000, 25000, 22000, 30000, 28000];
    const engagementData = [1200, 2100, 1800, 3200, 2900, 4100, 3800];

    // Config
    const config = {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Views',
                    data: viewsData,
                    borderColor: '#00f2fe',
                    backgroundColor: gradientFill,
                    borderWidth: 3,
                    pointBackgroundColor: '#00f2fe',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4 // Smooth curves
                },
                {
                    label: 'Engagement',
                    data: engagementData,
                    borderColor: '#ff0050',
                    backgroundColor: gradientPink,
                    borderWidth: 3,
                    pointBackgroundColor: '#ff0050',
                    pointBorderColor: '#fff',
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#94a3b8',
                        font: { family: 'Inter' },
                        usePointStyle: true,
                        boxWidth: 8
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(22, 24, 31, 0.9)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    padding: 10,
                    displayColors: true,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' }
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)',
                        drawBorder: false
                    },
                    ticks: {
                        color: '#94a3b8',
                        font: { family: 'Inter' }
                    }
                }
            }
        }
    };

    // Render Chart
    window.performanceChart = new Chart(ctx, config);


    // 2. Add Hover Interactions for UI elements
    const kpiCards = document.querySelectorAll('.kpi-card');
    kpiCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.borderColor = 'rgba(255,255,255,0.2)';
        });
        card.addEventListener('mouseleave', () => {
            card.style.borderColor = 'rgba(255,255,255,0.08)';
        });
    });

    // 3. Highlight retention bar animation on click
    const retentionBtn = document.querySelector('.retention-panel .btn');
    if(retentionBtn) {
        retentionBtn.addEventListener('click', () => {
            const fills = document.querySelectorAll('.retention-fill');
            
            // Reset widths
            fills[0].style.width = '100%';
            fills[1].style.width = '0%';
            fills[2].style.width = '0%';
            fills[3].style.width = '0%';

            setTimeout(() => {
                fills[1].style.width = '70%';
                fills[2].style.width = '45%';
                fills[3].style.width = '25%';
            }, 100);
            
            retentionBtn.innerHTML = '<i class="fa-solid fa-check"></i> Analyzed';
            retentionBtn.style.background = '#10b981';
            
            setTimeout(() => {
                retentionBtn.innerHTML = 'Analyze Draft';
                retentionBtn.style.background = '';
            }, 3000);
        });
    }

});
