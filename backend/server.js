require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
// GÜVENLİK: Helmet.js - Security headers için
// Kurulum: npm install helmet
let helmet;
try {
    helmet = require('helmet');
} catch (e) {
    console.warn('⚠️  Helmet.js yüklü değil. Güvenlik için yükleyin: npm install helmet');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== RATE LIMITING ====================
// Her endpoint için ayrı rate limit map'leri
const botStatsRateLimitMap = new Map();
const serverStatusRateLimitMap = new Map();

// Rate limit ayarları
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 dakika
const RATE_LIMIT_BAN_DURATION = 2 * 60 * 1000; // 2 dakika ban süresi
const BOT_STATS_MAX_REQUESTS = 10; // 1 dakikada maksimum 10 istek
const SERVER_STATUS_MAX_REQUESTS = 5; // 1 dakikada maksimum 5 istek

// Rate limit middleware factory
function createRateLimitMiddleware(rateLimitMap, maxRequests, endpointName) {
    return (req, res, next) => {
        const clientId = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!rateLimitMap.has(clientId)) {
            rateLimitMap.set(clientId, {
                count: 1,
                windowStart: now,
                bannedUntil: null
            });
            return next();
        }

        const limitData = rateLimitMap.get(clientId);

        // Ban kontrolü
        if (limitData.bannedUntil && now < limitData.bannedUntil) {
            const remainingTime = Math.ceil((limitData.bannedUntil - now) / 1000);
            return res.status(429).json({
                success: false,
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
                retryAfter: remainingTime
            });
        }

        // Ban süresi dolmuşsa sıfırla
        if (limitData.bannedUntil && now >= limitData.bannedUntil) {
            limitData.bannedUntil = null;
            limitData.count = 0;
            limitData.windowStart = now;
        }

        // Yeni window başladıysa sıfırla
        if (now - limitData.windowStart >= RATE_LIMIT_WINDOW) {
            limitData.count = 1;
            limitData.windowStart = now;
            limitData.bannedUntil = null;
            return next();
        }

        // Rate limit kontrolü
        if (limitData.count >= maxRequests) {
            // Ban uygula
            limitData.bannedUntil = now + RATE_LIMIT_BAN_DURATION;
            const remainingTime = Math.ceil(RATE_LIMIT_BAN_DURATION / 1000);
            return res.status(429).json({
                success: false,
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
                retryAfter: remainingTime
            });
        }

        limitData.count++;
        next();
    };
}

// Endpoint-specific rate limit middleware'leri
const botStatsRateLimit = createRateLimitMiddleware(botStatsRateLimitMap, BOT_STATS_MAX_REQUESTS, 'bot-stats');
const serverStatusRateLimit = createRateLimitMiddleware(serverStatusRateLimitMap, SERVER_STATUS_MAX_REQUESTS, 'server-status');

// Eski kayıtları temizle (memory leak önleme)
setInterval(() => {
    const now = Date.now();
    const cleanup = (map) => {
        for (const [key, value] of map.entries()) {
            // Ban süresi dolmuş ve window süresi geçmişse sil
            if ((!value.bannedUntil || now >= value.bannedUntil) &&
                (now - value.windowStart >= RATE_LIMIT_WINDOW + RATE_LIMIT_BAN_DURATION)) {
                map.delete(key);
            }
        }
    };
    cleanup(botStatsRateLimitMap);
    cleanup(serverStatusRateLimitMap);
}, 5 * 60 * 1000); // Her 5 dakikada bir temizle

// CORS Configuration
const allowedOrigins = [];
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        if (!origin) {
            if (process.env.NODE_ENV === 'production') {
                return callback(new Error('Origin required in production'));
            }
            return callback(null, true);
        }

        if (allowedOrigins.length === 0) {
            const devRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
            if (devRegex.test(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS - only localhost allowed in development'));
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// GÜVENLİK: Helmet.js - Security headers
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"], // Inline script'ler için gerekli (güvenlik açığı oluşturur ama çalışır)
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:"],
                connectSrc: ["'self'", "http://localhost:3000", "https://*.onrender.com", "https://*.vercel.app", "https://*.netlify.app", "https://www.githubstatus.com", "https://discordstatus.com", "https://discord.com"]
            }
        }
    }));
} else {
    // Helmet.js yoksa manuel security headers ekle
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    });
}

app.use(cors(corsOptions));
app.use(express.json());

// Discord API Base URL
const DISCORD_API = 'https://discord.com/api/v10';

// Bot Start Time
const BOT_START_TIME = process.env.BOT_START_TIMESTAMP
    ? new Date(process.env.BOT_START_TIMESTAMP)
    : new Date();

// Helper function to fetch from Discord API
async function fetchDiscordAPI(endpoint) {
    try {
        const response = await fetch(`${DISCORD_API}${endpoint}`, {
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Discord API returned ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Discord API Error:', error);
        throw error;
    }
}

// Helper function: Altyapı durumunu kontrol et
async function checkInfrastructureStatus() {
    const services = {
        github: 'https://www.githubstatus.com/api/v2/status.json',
        discord: 'https://discordstatus.com/api/v2/status.json',
        bot: 'https://bot-moi8.onrender.com/'
    };

    // Her servisi ayrı ayrı kontrol et (hata toleranslı)
    const checkService = async (url, isJson = true) => {
        try {
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 5000);
            });

            const fetchPromise = isJson
                ? fetch(url).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r.json();
                })
                : fetch(url, { method: 'HEAD' }).then(r => {
                    if (!r.ok) throw new Error(`HTTP ${r.status}`);
                    return r;
                });

            const result = await Promise.race([fetchPromise, timeoutPromise]);
            return result;
        } catch (error) {
            console.error(`Service check failed for ${url}:`, error.message);
            return null;
        }
    };

    // Paralel olarak tüm servisleri kontrol et
    const [githubData, discordData, botRes] = await Promise.all([
        checkService(services.github, true),
        checkService(services.discord, true),
        checkService(services.bot, false)
    ]);

    return {
        github: githubData && githubData.status ? githubData.status.indicator : 'critical',
        discord: discordData && discordData.status ? discordData.status.indicator : 'critical',
        bot: (botRes && botRes.ok) ? 'none' : 'critical',
        timestamp: new Date().toISOString()
    };
}

// ==================== ENDPOINT: /api/bot/stats ====================
// Bot verileri bu endpoint'te
app.get('/api/bot/stats', botStatsRateLimit, async (req, res) => {
    // GÜVENLİK: CORS kontrolü
    const origin = req.headers.origin;
    if (origin) {
        if (allowedOrigins.length === 0) {
            const devRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
            if (!devRegex.test(origin)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Not allowed by CORS - only localhost allowed in development'
                });
            }
        } else {
            if (!allowedOrigins.includes(origin)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Not allowed by CORS'
                });
            }
        }
    } else if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'Origin required in production'
        });
    }

    try {
        // Altyapı durumu (hata olsa bile devam et - önce bunu al)
        let infraStatus;
        try {
            infraStatus = await checkInfrastructureStatus();
        } catch (error) {
            console.error('Infrastructure check error:', error);
            infraStatus = {
                github: 'critical',
                discord: 'critical',
                bot: 'critical',
                timestamp: new Date().toISOString()
            };
        }

        // Discord API istekleri (hata toleranslı)
        let botData = null;
        let guilds = [];
        let latency = 0;
        let botOnline = false;

        try {
            const gatewayStart = Date.now();

            // Bot bilgilerini al
            try {
                botData = await fetchDiscordAPI('/users/@me');
                botOnline = true;
            } catch (err) {
                console.error('Bot data fetch error:', err.message);
                botData = {
                    id: 'unknown',
                    username: 'Unknown',
                    discriminator: '0000',
                    avatar: null,
                    verified: false
                };
            }

            // Guild bilgilerini al
            try {
                const guildsData = await fetchDiscordAPI('/users/@me/guilds');
                guilds = guildsData || [];
            } catch (err) {
                console.error('Guilds fetch error:', err.message);
                guilds = [];
            }

            // Latency hesapla
            try {
                const latencyStart = Date.now();
                await fetchDiscordAPI('/gateway');
                latency = Date.now() - latencyStart;
            } catch (err) {
                console.error('Gateway fetch error:', err.message);
                latency = 0;
            }
        } catch (error) {
            console.error('Discord API error:', error.message);
            // Discord API hatası olsa bile devam et
        }

        // Her durumda yanıt döndür
        res.json({
            success: true,
            data: {
                bot: botData ? {
                    id: botData.id,
                    username: botData.username,
                    discriminator: botData.discriminator,
                    avatar: botData.avatar,
                    verified: botData.verified
                } : null,
                status: {
                    online: botOnline,
                    latency: latency
                },
                guilds: {
                    count: guilds.length
                },
                infrastructure: infraStatus,
                uptime: {
                    startTime: BOT_START_TIME.toISOString()
                },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Bot stats error:', error);
        // Son çare: Sadece altyapı durumunu döndür
        try {
            const infraStatus = await checkInfrastructureStatus();
            res.json({
                success: true,
                data: {
                    bot: null,
                    status: {
                        online: false,
                        latency: 0
                    },
                    guilds: {
                        count: 0
                    },
                    infrastructure: infraStatus,
                    uptime: {
                        startTime: BOT_START_TIME.toISOString()
                    },
                    timestamp: new Date().toISOString()
                }
            });
        } catch (infraError) {
            console.error('Complete failure:', infraError);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch bot stats',
                message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
            });
        }
    }
});

// ==================== ENDPOINT: /api/server/status ====================
// Altyapı durumu bu endpoint'te
app.get('/api/server/status', serverStatusRateLimit, async (req, res) => {
    // GÜVENLİK: CORS kontrolü
    const origin = req.headers.origin;
    if (origin) {
        if (allowedOrigins.length === 0) {
            const devRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
            if (!devRegex.test(origin)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Not allowed by CORS - only localhost allowed in development'
                });
            }
        } else {
            if (!allowedOrigins.includes(origin)) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied',
                    message: 'Not allowed by CORS'
                });
            }
        }
    } else if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
            success: false,
            error: 'Access denied',
            message: 'Origin required in production'
        });
    }

    try {
        const infraStatus = await checkInfrastructureStatus();

        res.json({
            success: true,
            data: {
                infrastructure: infraStatus,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Server status error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch server status',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
        });
    }
});

// Health check endpoint (opsiyonel)
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: 'Discord Bot Status API',
        version: '1.0.0'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 CORS enabled for: ${process.env.FRONTEND_URL || 'localhost'}`);
});
