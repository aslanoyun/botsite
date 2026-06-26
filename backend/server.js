require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// GÜVENLİK: Helmet.js - Security headers için
let helmet;
try {
    helmet = require('helmet');
} catch (e) {
    console.warn('⚠️  Helmet.js yüklü değil. Güvenlik için yükleyin: npm install helmet');
}

const app = express();
const PORT = process.env.PORT || 3000;

// ==================== RATE LIMITING ====================
const botStatsRateLimitMap = new Map();
const serverStatusRateLimitMap = new Map();

const RATE_LIMIT_WINDOW = 60 * 1000;
const RATE_LIMIT_BAN_DURATION = 2 * 60 * 1000;
const BOT_STATS_MAX_REQUESTS = 10;
const SERVER_STATUS_MAX_REQUESTS = 5;

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

        if (limitData.bannedUntil && now < limitData.bannedUntil) {
            const remainingTime = Math.ceil((limitData.bannedUntil - now) / 1000);
            return res.status(429).json({
                success: false,
                error: 'Too many requests',
                message: `Rate limit exceeded. Try again in ${remainingTime} seconds.`,
                retryAfter: remainingTime
            });
        }

        if (limitData.bannedUntil && now >= limitData.bannedUntil) {
            limitData.bannedUntil = null;
            limitData.count = 0;
            limitData.windowStart = now;
        }

        if (now - limitData.windowStart >= RATE_LIMIT_WINDOW) {
            limitData.count = 1;
            limitData.windowStart = now;
            limitData.bannedUntil = null;
            return next();
        }

        if (limitData.count >= maxRequests) {
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

const botStatsRateLimit = createRateLimitMiddleware(botStatsRateLimitMap, BOT_STATS_MAX_REQUESTS, 'bot-stats');
const serverStatusRateLimit = createRateLimitMiddleware(serverStatusRateLimitMap, SERVER_STATUS_MAX_REQUESTS, 'server-status');

setInterval(() => {
    const now = Date.now();
    const cleanup = (map) => {
        for (const [key, value] of map.entries()) {
            if ((!value.bannedUntil || now >= value.bannedUntil) &&
                (now - value.windowStart >= RATE_LIMIT_WINDOW + RATE_LIMIT_BAN_DURATION)) {
                map.delete(key);
            }
        }
    };
    cleanup(botStatsRateLimitMap);
    cleanup(serverStatusRateLimitMap);
}, 5 * 60 * 1000);

// ==================== CORS AYARLARI ====================
const allowedOrigins = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000',
    'https://aslanbotsite.onrender.com'
];

if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
}

const corsOptions = {
    origin: function (origin, callback) {
        // Tarayıcı içi doğrudan erişim veya origin göndermeyen isteklerde güvenlik kilidini açıyoruz
        if (!origin) {
            return callback(null, true);
        }

        const devRegex = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
        if (allowedOrigins.includes(origin) || devRegex.test(origin) || origin.includes('.onrender.com')) {
            return callback(null, true);
        }

        return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    optionsSuccessStatus: 200
};

// ==================== GÜVENLİK HEADERS ====================
if (helmet) {
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'", "'unsafe-inline'"],
                styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
                fontSrc: ["'self'", "https://fonts.gstatic.com"],
                imgSrc: ["'self'", "data:", "https://*"],
                connectSrc: ["'self'", "http://localhost:3000", "https://*.onrender.com", "https://*.vercel.app", "https://*.netlify.app", "https://www.githubstatus.com", "https://discordstatus.com", "https://discord.com"]
            }
        }
    }));
} else {
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
app.get('/api/bot/stats', botStatsRateLimit, async (req, res) => {
    // 🟢 FIX: İstekleri engelleyen production köken zorunluluğu kaldırıldı.
    try {
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

        let botData = null;
        let guilds = [];
        let latency = 0;
        let botOnline = false;

        try {
            if (process.env.DISCORD_BOT_TOKEN) {
                try {
                    botData = await fetchDiscordAPI('/users/@me');
                    botOnline = true;
                } catch (err) {
                    console.error('Bot data fetch error:', err.message);
                }

                try {
                    const guildsData = await fetchDiscordAPI('/users/@me/guilds');
                    guilds = guildsData || [];
                } catch (err) {
                    console.error('Guilds fetch error:', err.message);
                }

                try {
                    const latencyStart = Date.now();
                    await fetchDiscordAPI('/gateway');
                    latency = Date.now() - latencyStart;
                } catch (err) {
                    console.error('Gateway fetch error:', err.message);
                }
            }
        } catch (error) {
            console.error('Discord API ana işleme hatası:', error.message);
        }

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
                status: { online: botOnline, latency: latency },
                guilds: { count: guilds.length },
                infrastructure: infraStatus,
                uptime: { startTime: BOT_START_TIME.toISOString() },
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Bot stats ana hata bloğu:', error);
        const infraStatus = await checkInfrastructureStatus().catch(() => ({ github: 'critical', discord: 'critical', bot: 'critical' }));
        res.json({
            success: true,
            data: {
                bot: null,
                status: { online: false, latency: 0 },
                guilds: { count: 0 },
                infrastructure: infraStatus,
                uptime: { startTime: BOT_START_TIME.toISOString() },
                timestamp: new Date().toISOString()
            }
        });
    }
});

// ==================== ENDPOINT: /api/server/status ====================
app.get('/api/server/status', serverStatusRateLimit, async (req, res) => {
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
        console.error('Server status hatası:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch server status'
        });
    }
});

// ==================== FRONTEND DOSYALARI SUNUMU ====================
const path = require('path');
const frontendPath = path.resolve(__dirname, '..');

app.use(express.static(frontendPath));

app.get('/', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'), (err) => {
        if (err) {
            res.status(404).send("index.html bulunamadı kanka.");
        }
    });
});

app.use((err, req, res, next) => {
    console.error('Global Error:', err.stack);
    res.status(500).json({
        success: false,
        error: 'Internal server error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});