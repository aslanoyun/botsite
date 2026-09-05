const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-icon");
const html = document.documentElement;

class SoundManager {
    constructor() {
        this.enabled = safeGetLocalStorage("sound_fx", "true") === "true";
        this.audioCtx = null;
        this.initButton();
    }

    getAudioContext() {
        if (!this.audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.audioCtx = new AudioContext();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    playPop() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(480, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(760, ctx.currentTime + 0.06);

            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.06);
        } catch (e) {}
    }

    playToggle() {
        if (!this.enabled) return;
        try {
            const ctx = this.getAudioContext();
            if (!ctx) return;

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(320, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {}
    }

    toggle() {
        this.enabled = !this.enabled;
        try {
            localStorage.setItem("sound_fx", this.enabled ? "true" : "false");
        } catch (e) {}
        this.updateIcon();
        if (this.enabled) {
            this.playPop();
        }
    }

    updateIcon() {
        const soundIcon = document.getElementById("soundIcon");
        if (!soundIcon) return;
        if (this.enabled) {
            soundIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
            `;
        } else {
            soundIcon.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg>
            `;
        }
    }

    initButton() {
        const soundBtn = document.getElementById("soundToggle");
        this.updateIcon();
        if (soundBtn) {
            soundBtn.addEventListener("click", () => this.toggle());
        }
    }
}

const sounds = new SoundManager();

document.addEventListener("click", (e) => {
    if (e.target.closest("button, .btn-primary, .support-action-btn, .nav-link, .faq-question")) {
        sounds.playPop();
    }
});

function safeGetLocalStorage(key, defaultValue) {
    try {
        const value = localStorage.getItem(key);
        if (key === 'theme' && value !== 'dark' && value !== 'light') {
            return defaultValue;
        }
        if (key === 'language' && value !== 'tr' && value !== 'en') {
            return defaultValue;
        }
        return value || defaultValue;
    } catch (e) {
        return defaultValue;
    }
}

const savedTheme = safeGetLocalStorage("theme", "dark");
html.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        const currentTheme = html.getAttribute("data-theme");
        const newTheme = currentTheme === "dark" ? "light" : "dark";

        html.setAttribute("data-theme", newTheme);
        if (newTheme === 'dark' || newTheme === 'light') {
            try {
                localStorage.setItem("theme", newTheme);
            } catch (e) {}
        }
        updateThemeIcon(newTheme);
        sounds.playToggle();
    });
}

function updateThemeIcon(theme) {
    if (!themeIcon) return;
    if (theme === "dark") {
        themeIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="4"></circle>
                <path d="M12 2v2"></path>
                <path d="M12 20v2"></path>
                <path d="m4.93 4.93 1.41 1.41"></path>
                <path d="m17.66 17.66 1.41 1.41"></path>
                <path d="M2 12h2"></path>
                <path d="M20 12h2"></path>
                <path d="m6.34 17.66-1.41 1.41"></path>
                <path d="m19.07 4.93-1.41 1.41"></path>
            </svg>
        `;
    } else {
        themeIcon.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
        `;
    }
}

const langToggle = document.getElementById("langToggle");
const langText = document.querySelector(".lang-text");

let currentLang = safeGetLocalStorage("language", "tr");
updateLanguage(currentLang);

if (langToggle) {
    langToggle.addEventListener("click", () => {
        currentLang = currentLang === "tr" ? "en" : "tr";
        if (currentLang === "tr" || currentLang === "en") {
            try {
                localStorage.setItem("language", currentLang);
            } catch (e) {}
        }
        updateLanguage(currentLang);
        sounds.playToggle();
    });
}

function updateLanguage(lang) {
    const elements = document.querySelectorAll("[data-tr][data-en]");

    elements.forEach((element) => {
        if (element.id === 'botStatus') return;
        if (element.id === 'systemStatus' || element.id === 'systemDetail') return;
        if (element.classList && element.classList.contains('status-detail') &&
            element.closest('.glass-card') && element.closest('.glass-card').querySelector('#ping')) {
            return;
        }
        if (element.classList && (
            element.classList.contains('status-badge') ||
            element.classList.contains('infra-detail')
        )) {
            return;
        }

        const text = element.getAttribute(`data-${lang}`);
        if (text) {
            element.textContent = text;
        }
    });

    if (langText) {
        langText.textContent = lang === "tr" ? "EN" : "TR";
    }

    if (window.botMonitorInstance) {
        window.botMonitorInstance.updatePingLanguage();
        window.botMonitorInstance.updateStatusLanguage();
    }
    if (window.infraMonitorInstance) {
        window.infraMonitorInstance.updateServicesLanguage();
        window.infraMonitorInstance.updateSystemStatusLanguage();
    }
}

document.querySelectorAll(".faq-question").forEach((btn) => {
    btn.addEventListener("click", () => {
        const item = btn.closest(".faq-item");
        const isOpen = item.classList.contains("open");

        document.querySelectorAll(".faq-item").forEach((other) => {
            other.classList.remove("open");
            other.querySelector(".faq-question")?.setAttribute("aria-expanded", "false");
        });

        if (!isOpen) {
            item.classList.add("open");
            btn.setAttribute("aria-expanded", "true");
        }
    });
});

window.addEventListener('scroll', () => {
    const sections = document.querySelectorAll('.fullscreen-section');
    const navLinks = document.querySelectorAll('.nav-link');

    let currentSection = '';
    const scrollPos = window.scrollY + 250;

    sections.forEach(section => {
        const top = section.offsetTop;
        const height = section.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
            currentSection = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${currentSection}`) {
            link.classList.add('active');
        }
    });
});

class DiscordBotMonitor {
    constructor() {
        const defaultApiUrl = 'https://aslanbotsite.onrender.com';
        let _apiUrl = defaultApiUrl;

        Object.defineProperty(this, 'apiUrl', {
            get: function () {
                return _apiUrl;
            },
            set: function (newUrl) {
                try {
                    if (typeof newUrl !== 'string' || newUrl.trim() === '') return;
                    const urlObj = new URL(newUrl);
                    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return;
                    
                    const isLocalhost = urlObj.hostname === 'localhost' ||
                        urlObj.hostname === '127.0.0.1' ||
                        urlObj.hostname === '[::1]';

                    const allowedDomains = ['onrender.com', 'vercel.app', 'netlify.app', 'render.com'];

                    let isSecure = false;
                    if (urlObj.protocol === 'https:') {
                        if (allowedDomains.includes(urlObj.hostname)) {
                            isSecure = true;
                        } else {
                            for (const domain of allowedDomains) {
                                if (urlObj.hostname.endsWith('.' + domain)) {
                                    const parts = urlObj.hostname.split('.');
                                    if (parts.length >= 3 && urlObj.hostname.endsWith('.' + domain)) {
                                        isSecure = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (isLocalhost || isSecure) {
                        _apiUrl = newUrl;
                    }
                } catch (e) {
                    console.error('Güvenlik: Geçersiz URL:', e.message);
                }
            },
            configurable: false,
            enumerable: true
        });

        this.updateInterval = 30000;
        this.botStartTime = null;
        this.currentPingStatus = 'low';
        this.startUptimeClock();
    }

    setApiUrl(url) {
        this.apiUrl = url;
    }

    startUptimeClock() {

        setInterval(() => {
            const uptimeEl = document.getElementById("liveUptimeText");
            if (!uptimeEl) return;

            if (!this.botStartTime) {

                const fallbackTime = Date.now() - (14 * 86400000 + 7 * 3600000);
                this.updateClockDisplay(fallbackTime, uptimeEl);
                return;
            }

            this.updateClockDisplay(this.botStartTime, uptimeEl);
        }, 1000);
    }

    updateClockDisplay(startTime, element) {
        const now = Date.now();
        const diff = Math.max(0, now - startTime);

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (currentLang === 'tr') {
            element.textContent = `${days}g ${hours}s ${minutes}d ${seconds}sn`;
        } else {
            element.textContent = `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }
    }

    async fetchBotStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/api/bot/stats`);

            if (!response.ok) {
                if (response.status === 429) {
                    this.showRateLimitWarning();
                    this.showErrorMessage(true);
                    return;
                }
                if (response.status >= 500) {
                    this.showErrorMessage(false);
                    return;
                }
                throw new Error(`API returned ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                this.updateBotInfo(result.data);
            } else {
                throw new Error(result.error || 'Failed to fetch bot stats');
            }

        } catch (error) {
            console.error('Error fetching bot status:', error);
            this.showErrorMessage();
        }
    }

    updateBotInfo(data) {
        const statusElement = document.getElementById('botStatus');
        const pingElement = document.getElementById('ping');
        const beaconElement = document.querySelector('.status-beacon');
        const pingCard = pingElement ? pingElement.closest('.glass-card') : null;
        const pingDetail = pingCard ? pingCard.querySelector('.status-detail') : null;

        if (data.uptime && data.uptime.startTime) {
            this.botStartTime = new Date(data.uptime.startTime).getTime();
        }

        const botInfraStatus = data.infrastructure && data.infrastructure.bot;
        const isBotServerDown = botInfraStatus === 'critical';

        if (isBotServerDown) {
            const translations = { tr: 'Çevrimdışı', en: 'Offline' };
            if (statusElement) {
                statusElement.textContent = translations[currentLang];
                statusElement.style.color = 'var(--danger)';
                statusElement.setAttribute('data-current-status', 'offline');
            }

            if (beaconElement) {
                beaconElement.className = 'status-beacon beacon-offline';
            }

            if (pingElement) {
                pingElement.textContent = '--';
                pingElement.style.color = 'var(--text-muted)';
            }
            if (pingDetail) {
                const pingTranslations = { tr: 'Bot Kapalı', en: 'Bot Offline' };
                pingDetail.textContent = pingTranslations[currentLang];
                pingDetail.setAttribute('data-ping-status', 'offline');
            }
            return;
        }

        const translations = { tr: 'Çevrimiçi', en: 'Online' };
        if (statusElement) {
            statusElement.textContent = translations[currentLang];
            statusElement.style.color = 'var(--success)';
            statusElement.removeAttribute('data-current-status');
        }

        if (beaconElement) {
            beaconElement.className = 'status-beacon beacon-online';
        }

        if (data.status && typeof data.status.latency !== 'undefined') {
            this.lastLatency = data.status.latency;
            this.updatePing(data.status.latency);

            const avgLatEl = document.getElementById("avgLatencyText");
            if (avgLatEl) {
                avgLatEl.textContent = `${data.status.latency}ms`;
            }
        }
    }

    showRateLimitWarning() {
        const toast = document.getElementById('rateLimitToast');
        if (toast) {
            const messageElement = toast.querySelector('.toast-message');
            if (messageElement) {
                const translations = {
                    tr: 'Çok fazla istek gönderildi. Lütfen birkaç dakika bekleyin.',
                    en: 'Too many requests. Please wait a few minutes.'
                };
                messageElement.textContent = translations[currentLang];
            }

            toast.style.display = 'block';
            setTimeout(() => {
                toast.style.display = 'none';
            }, 5000);
        }
    }

    showErrorMessage(isRateLimit = false) {
        const statusElement = document.getElementById('botStatus');
        const beaconElement = document.querySelector('.status-beacon');

        if (statusElement) {
            statusElement.setAttribute('data-current-status', isRateLimit ? 'rate-limit' : 'error');

            if (isRateLimit) {
                const translations = { tr: 'İstek Sınırı', en: 'Rate Limited' };
                statusElement.textContent = translations[currentLang];
                statusElement.style.color = 'var(--warning)';
            } else {
                const translations = { tr: 'Bağlantı Yok', en: 'Unavailable' };
                statusElement.textContent = translations[currentLang];
                statusElement.style.color = 'var(--danger)';
            }
        }

        if (beaconElement) {
            beaconElement.className = 'status-beacon beacon-offline';
        }

        const pingElement = document.getElementById('ping');
        if (pingElement) {
            pingElement.textContent = '--';
            pingElement.style.color = 'var(--text-muted)';
            const pingCard = pingElement.closest('.glass-card');
            const pingDetail = pingCard ? pingCard.querySelector('.status-detail') : null;

            if (pingDetail) {
                const pingTranslations = {
                    tr: isRateLimit ? 'Rate Limit Aşıldı' : 'Veri Yok',
                    en: isRateLimit ? 'Rate Limit Exceeded' : 'No Data'
                };
                pingDetail.textContent = pingTranslations[currentLang];
                pingDetail.setAttribute('data-ping-status', isRateLimit ? 'rate-limit' : 'no-data');
            }
        }
    }

    updatePing(latency) {
        const pingElement = document.getElementById('ping');
        if (!pingElement) return;

        const pingCard = pingElement.closest('.glass-card');
        const detailElement = pingCard ? pingCard.querySelector('.status-detail') : null;

        pingElement.textContent = `${latency}ms`;

        const translations = {
            low: { tr: 'Düşük Gecikme', en: 'Low Latency' },
            medium: { tr: 'Orta Gecikme', en: 'Medium Latency' },
            high: { tr: 'Yüksek Gecikme', en: 'High Latency' }
        };

        let status = 'low';
        if (latency > 100 && latency < 200) {
            status = 'medium';
            pingElement.style.color = 'var(--warning)';
        } else if (latency >= 200) {
            status = 'high';
            pingElement.style.color = 'var(--danger)';
        } else {
            status = 'low';
            pingElement.style.color = 'var(--success)';
        }

        this.currentPingStatus = status;
        if (detailElement) {
            detailElement.textContent = translations[status][currentLang];
            detailElement.setAttribute('data-ping-status', status);
        }
    }

    updateStatusLanguage() {
        const statusElement = document.getElementById('botStatus');
        if (!statusElement) return;

        const currentStatus = statusElement.getAttribute('data-current-status');
        const currentColor = statusElement.style.color;

        if (currentStatus === 'rate-limit' || currentColor === 'var(--warning)') {
            const translations = { tr: 'İstek Sınırı', en: 'Rate Limited' };
            statusElement.textContent = translations[currentLang];
        } else if (currentStatus === 'offline') {
            const translations = { tr: 'Çevrimdışı', en: 'Offline' };
            statusElement.textContent = translations[currentLang];
        } else if (currentStatus === 'error' || currentColor === 'var(--danger)') {
            const translations = { tr: 'Bağlantı Yok', en: 'Unavailable' };
            statusElement.textContent = translations[currentLang];
        } else if (currentColor === 'var(--success)') {
            const translations = { tr: 'Çevrimiçi', en: 'Online' };
            statusElement.textContent = translations[currentLang];
        }
    }

    updatePingLanguage() {
        const pingElement = document.getElementById('ping');
        if (!pingElement) return;

        const pingCard = pingElement.closest('.glass-card');
        const detailElement = pingCard ? pingCard.querySelector('.status-detail') : null;
        if (!detailElement) return;

        const pingStatus = detailElement.getAttribute('data-ping-status');

        if (pingStatus === 'rate-limit') {
            const translations = { tr: 'Rate Limit Aşıldı', en: 'Rate Limit Exceeded' };
            detailElement.textContent = translations[currentLang];
        } else if (pingStatus === 'offline') {
            const translations = { tr: 'Bot Kapalı', en: 'Bot Offline' };
            detailElement.textContent = translations[currentLang];
        } else if (pingStatus === 'no-data') {
            const translations = { tr: 'Veri Yok', en: 'No Data' };
            detailElement.textContent = translations[currentLang];
        } else if (this.currentPingStatus) {
            const translations = {
                low: { tr: 'Düşük Gecikme', en: 'Low Latency' },
                medium: { tr: 'Orta Gecikme', en: 'Medium Latency' },
                high: { tr: 'Yüksek Gecikme', en: 'High Latency' }
            };
            detailElement.textContent = translations[this.currentPingStatus][currentLang];
        }
    }

    updateBotStatusFromInfrastructure(botInfraStatus) {
        const statusElement = document.getElementById('botStatus');
        const pingElement = document.getElementById('ping');
        const beaconElement = document.querySelector('.status-beacon');
        const pingCard = pingElement ? pingElement.closest('.glass-card') : null;
        const pingDetail = pingCard ? pingCard.querySelector('.status-detail') : null;

        const isBotServerDown = botInfraStatus === 'critical';

        if (isBotServerDown) {
            const translations = { tr: 'Çevrimdışı', en: 'Offline' };
            if (statusElement) {
                statusElement.textContent = translations[currentLang];
                statusElement.style.color = 'var(--danger)';
                statusElement.setAttribute('data-current-status', 'offline');
            }

            if (beaconElement) {
                beaconElement.className = 'status-beacon beacon-offline';
            }

            if (pingElement) {
                pingElement.textContent = '--';
                pingElement.style.color = 'var(--text-muted)';
            }
            if (pingDetail) {
                const pingTranslations = { tr: 'Bot Kapalı', en: 'Bot Offline' };
                pingDetail.textContent = pingTranslations[currentLang];
                pingDetail.setAttribute('data-ping-status', 'offline');
            }
        }
    }

    start() {
        this.fetchBotStatus();
        setInterval(() => {
            this.fetchBotStatus();
        }, this.updateInterval);
    }
}

class InfrastructureMonitor {
    constructor() {
        this.serviceStates = {
            github: 'operational',
            bot: 'operational',
            discord: 'operational',
            api: 'degraded'
        };
        this.rateLimitActive = false;
        const defaultApiUrl = 'https://aslanbotsite.onrender.com';
        let _apiUrl = defaultApiUrl;

        Object.defineProperty(this, 'apiUrl', {
            get: function () {
                return _apiUrl;
            },
            set: function (newUrl) {
                try {
                    if (typeof newUrl !== 'string' || newUrl.trim() === '') return;
                    const urlObj = new URL(newUrl);
                    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') return;

                    const isLocalhost = urlObj.hostname === 'localhost' ||
                        urlObj.hostname === '127.0.0.1' ||
                        urlObj.hostname === '[::1]';

                    const allowedDomains = ['onrender.com', 'vercel.app', 'netlify.app'];

                    let isSecure = false;
                    if (urlObj.protocol === 'https:') {
                        if (allowedDomains.includes(urlObj.hostname)) {
                            isSecure = true;
                        } else {
                            for (const domain of allowedDomains) {
                                if (urlObj.hostname.endsWith('.' + domain)) {
                                    const parts = urlObj.hostname.split('.');
                                    if (parts.length >= 3 && urlObj.hostname.endsWith('.' + domain)) {
                                        isSecure = true;
                                        break;
                                    }
                                }
                            }
                        }
                    }

                    if (isLocalhost || isSecure) {
                        _apiUrl = newUrl;
                    }
                } catch (e) {
                    console.error('Güvenlik: Geçersiz URL:', e.message);
                }
            },
            configurable: false,
            enumerable: true
        });
    }

    async checkServices() {
        try {
            const apiUrl = window.botMonitorInstance ? window.botMonitorInstance.apiUrl : this.apiUrl;
            const response = await fetch(`${apiUrl}/api/server/status`);

            if (!response.ok) {
                if (response.status === 429) {
                    this.rateLimitActive = true;
                    this.showRateLimitStatus();
                    return;
                }
                throw new Error(`API returned ${response.status}`);
            }

            const result = await response.json();
            this.rateLimitActive = false;

            if (result.success && result.data && result.data.infrastructure) {
                const infra = result.data.infrastructure;
                this.updateServiceStatus("github", infra.github);
                this.updateServiceStatus("discord", infra.discord);
                this.updateServiceStatus("bot", infra.bot);
                this.updateServiceStatus('api', 'none');

                if (window.botMonitorInstance && infra.bot) {
                    window.botMonitorInstance.updateBotStatusFromInfrastructure(infra.bot);
                }
            } else {
                this.updateServiceStatus("github", "none");
                this.updateServiceStatus("discord", "none");
                this.updateServiceStatus("bot", "none");
                this.updateServiceStatus("api", "none");
            }

        } catch (error) {
            console.error('Error checking services:', error);
            if (!this.rateLimitActive) {
                this.updateServiceStatus("github", "critical");
                this.updateServiceStatus("discord", "critical");
                this.updateServiceStatus("bot", "critical");
                this.updateServiceStatus("api", "critical");

                if (window.botMonitorInstance) {
                    window.botMonitorInstance.updateBotStatusFromInfrastructure('critical');
                }
            }
        }

        setTimeout(() => this.updateSystemStatus(), 500);
    }

    showRateLimitStatus() {
        const serviceNames = ['github', 'bot', 'discord', 'api'];
        serviceNames.forEach(serviceName => {
            const card = document.querySelector(`.infra-icon.${serviceName}`)?.closest('.infra-card');
            if (card) {
                const badge = card.querySelector('.status-badge');
                const detail = card.querySelector('.infra-detail');
                const barFill = card.querySelector('.infra-bar-fill');

                if (badge) {
                    badge.className = 'status-badge outage';
                    const translations = { tr: 'Rate Limit', en: 'Rate Limit' };
                    badge.textContent = translations[currentLang];
                    badge.setAttribute('data-service-status', 'rate-limit');
                    badge.setAttribute('data-service-name', serviceName);
                }

                if (detail) {
                    const translations = { tr: 'Rate Limit Aşıldı', en: 'Rate Limit Exceeded' };
                    detail.textContent = translations[currentLang];
                    detail.setAttribute('data-service-status', 'rate-limit');
                    detail.setAttribute('data-service-name', serviceName);
                }

                if (barFill) {
                    barFill.style.background = 'var(--warning)';
                }
            }
        });

        setTimeout(() => this.updateSystemStatus(), 100);
    }

    updateSystemStatus() {
        const statuses = [];
        const serviceNames = ['github', 'bot', 'discord', 'api'];

        serviceNames.forEach(serviceName => {
            const card = document.querySelector(`.infra-icon.${serviceName}`)?.closest('.infra-card');
            if (!card) return;

            const badge = card.querySelector('.status-badge');
            if (!badge) return;

            if (badge.classList.contains('operational')) statuses.push('operational');
            else if (badge.classList.contains('degraded')) statuses.push('degraded');
            else if (badge.classList.contains('outage')) statuses.push('outage');
        });

        if (statuses.length === 0) return;

        const systemElement = document.getElementById('systemStatus');
        const detailElement = document.getElementById('systemDetail');

        const botCard = document.querySelector('.infra-icon.bot')?.closest('.infra-card');
        const discordCard = document.querySelector('.infra-icon.discord')?.closest('.infra-card');
        const githubCard = document.querySelector('.infra-icon.github')?.closest('.infra-card');
        const apiCard = document.querySelector('.infra-icon.api')?.closest('.infra-card');

        const botBadge = botCard?.querySelector('.status-badge');
        const discordBadge = discordCard?.querySelector('.status-badge');
        const githubBadge = githubCard?.querySelector('.status-badge');
        const apiBadge = apiCard?.querySelector('.status-badge');

        const isBotDown = botBadge?.classList.contains('outage') || botBadge?.getAttribute('data-service-status') === 'outage';
        const isDiscordDown = discordBadge?.classList.contains('outage') || discordBadge?.getAttribute('data-service-status') === 'outage';
        const isGithubDown = githubBadge?.classList.contains('outage') || githubBadge?.getAttribute('data-service-status') === 'outage';
        const isApiIssue = apiBadge?.classList.contains('degraded') || apiBadge?.classList.contains('outage') || apiBadge?.getAttribute('data-service-status') === 'degraded';

        let statusText = { tr: 'Sistem Normal', en: 'Systems Normal' };
        let detailText = { tr: 'Tüm servisler aktif', en: 'All services active' };
        let statusType = 'operational';

        if (this.rateLimitActive) {
            statusType = 'rate-limit';
            statusText = { tr: 'Rate Limit', en: 'Rate Limit' };
            detailText = { tr: 'Rate limit aşıldı, lütfen bekleyin', en: 'Rate limit exceeded, please wait' };
        } else if (isBotDown) {
            statusType = 'outage';
            statusText = { tr: 'Kritik Sistem Arızası', en: 'Critical System Outage' };
            detailText = { tr: 'Bot sunucularına erişilemiyor', en: 'Bot servers unreachable' };
        } else if (isDiscordDown) {
            statusType = 'degraded';
            statusText = { tr: 'Discord Ağ Sorunu', en: 'Discord Network Issue' };
            detailText = { tr: 'Discord sunucularında kesinti var', en: 'Discord API servers degraded' };
        } else if (isGithubDown) {
            statusType = 'degraded';
            statusText = { tr: 'Ufak Sistem Hataları', en: 'Minor System Glitches' };
            detailText = { tr: 'GitHub sunucularında gecikme yaşanıyor', en: 'GitHub API latency detected' };
        } else if (isApiIssue) {
            statusType = 'degraded';
            statusText = { tr: 'API Kesintisi', en: 'API Outage' };
            detailText = { tr: 'Yapay zeka api bozuk', en: 'AI API is down' };
        } else if (statuses.includes('outage')) {
            statusType = 'outage';
            statusText = { tr: 'Kritik Sistem Arızası', en: 'Critical System Outage' };
            detailText = { tr: 'Kritik servis kesintisi tespit edildi', en: 'Critical service outage' };
        } else if (statuses.includes('degraded')) {
            statusType = 'degraded';
            statusText = { tr: 'Performans Düşüşü', en: 'Degraded State' };
            detailText = { tr: 'Bazı servislerde gecikme var', en: 'Issues with some services' };
        }

        if (systemElement) {
            systemElement.textContent = statusText[currentLang];
            systemElement.setAttribute('data-system-status', statusType);

            if (statusType === 'operational') {
                systemElement.style.color = 'var(--success)';
            } else if (statusType === 'degraded' || statusType === 'rate-limit') {
                systemElement.style.color = 'var(--warning)';
            } else {
                systemElement.style.color = 'var(--danger)';
            }
        }

        if (detailElement) {
            detailElement.textContent = detailText[currentLang];
            detailElement.setAttribute('data-system-status', statusType);
        }
    }

    updateSystemStatusLanguage() {
        this.updateSystemStatus();
    }

    updateServiceStatus(serviceName, indicator) {
        const infraCards = document.querySelectorAll(".infra-card");
        const translations = {
            operational: { tr: "Normal", en: "Operational" },
            degraded: { tr: "Kesinti", en: "Outage" },
            outage: { tr: "Bozuk", en: "Outage" },
        };

        const detailTranslations = {
            operational: {
                tr: "Tüm sistemler çalışıyor",
                en: "All systems operational",
            },
            degraded: {
                tr: "Bazı sorunlar yaşanıyor",
                en: "Experiencing some issues",
            },
            outage: { tr: "Servis kullanılamıyor", en: "Service unavailable" },
        };

        infraCards.forEach((card) => {
            const icon = card.querySelector(`.infra-icon.${serviceName}`);
            if (icon) {
                const badge = card.querySelector(".status-badge");
                const detail = card.querySelector(".infra-detail");
                const barFill = card.querySelector(".infra-bar-fill");

                let status = "operational";
                if (indicator === "minor" || indicator === "major") {
                    status = "degraded";
                } else if (indicator === "critical") {
                    status = "outage";
                } else if (indicator === "none") {
                    status = "operational";
                }

                if (badge) {
                    badge.className = `status-badge ${status}`;
                    badge.textContent = translations[status][currentLang];
                    badge.setAttribute('data-service-status', status);
                    badge.setAttribute('data-service-name', serviceName);
                }

                if (detail) {
                    detail.textContent = detailTranslations[status][currentLang];
                    detail.setAttribute('data-service-status', status);
                    detail.setAttribute('data-service-name', serviceName);
                }

                if (barFill) {
                    if (status === 'operational') barFill.style.background = 'var(--success)';
                    else if (status === 'degraded') barFill.style.background = 'var(--warning)';
                    else barFill.style.background = 'var(--danger)';
                }

                this.serviceStates[serviceName] = status;
            }
        });
    }

    updateServicesLanguage() {
        const translations = {
            operational: { tr: "Normal", en: "Operational" },
            degraded: { tr: "Kesinti", en: "Outage" },
            outage: { tr: "Bozuk", en: "Outage" },
            'rate-limit': { tr: "Rate Limit", en: "Rate Limit" },
        };

        const detailTranslations = {
            operational: {
                tr: "Tüm sistemler çalışıyor",
                en: "All systems operational",
            },
            degraded: {
                tr: "Bazı sorunlar yaşanıyor",
                en: "Experiencing some issues",
            },
            outage: { tr: "Servis kullanılamıyor", en: "Service unavailable" },
            'rate-limit': { tr: "Rate Limit Aşıldı", en: "Rate Limit Exceeded" },
        };

        const serviceNames = ['github', 'bot', 'discord', 'api'];

        serviceNames.forEach(serviceName => {
            const card = document.querySelector(`.infra-icon.${serviceName}`)?.closest('.infra-card');

            if (card) {
                const badge = card.querySelector(".status-badge");
                const detail = card.querySelector(".infra-detail");

                if (badge) {
                    const status = badge.getAttribute('data-service-status') ||
                        this.serviceStates[serviceName] ||
                        'operational';

                    if (status === 'rate-limit' || this.rateLimitActive) {
                        badge.textContent = translations['rate-limit'][currentLang];
                        badge.setAttribute('data-service-status', 'rate-limit');
                    } else {
                        badge.textContent = translations[status] ? translations[status][currentLang] : translations.operational[currentLang];
                        badge.setAttribute('data-service-status', status);
                    }
                    badge.setAttribute('data-service-name', serviceName);
                }

                if (detail) {
                    const status = detail.getAttribute('data-service-status') ||
                        this.serviceStates[serviceName] ||
                        'operational';

                    if (status === 'rate-limit' || this.rateLimitActive) {
                        detail.textContent = detailTranslations['rate-limit'][currentLang];
                        detail.setAttribute('data-service-status', 'rate-limit');
                    } else {
                        detail.textContent = detailTranslations[status] ? detailTranslations[status][currentLang] : detailTranslations.operational[currentLang];
                        detail.setAttribute('data-service-status', status);
                    }
                    detail.setAttribute('data-service-name', serviceName);
                }
            }
        });
    }

    start() {
        this.fetchBotStatus();
        setInterval(() => {
            this.fetchBotStatus();
        }, 120000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const botMonitor = new DiscordBotMonitor();

    const originalFetchBotStatus = botMonitor.fetchBotStatus.bind(botMonitor);
    Object.defineProperty(botMonitor, 'fetchBotStatus', {
        value: originalFetchBotStatus,
        writable: false,
        configurable: false,
        enumerable: true
    });

    const originalSetApiUrl = botMonitor.setApiUrl.bind(botMonitor);
    Object.defineProperty(botMonitor, 'setApiUrl', {
        value: originalSetApiUrl,
        writable: false,
        configurable: false,
        enumerable: true
    });

    window.botMonitorInstance = botMonitor;
    botMonitor.start();

    const infraMonitor = new InfrastructureMonitor();
    window.infraMonitorInstance = infraMonitor;
    infraMonitor.start();

    const toastCloseBtn = document.getElementById('toastClose');
    if (toastCloseBtn) {
        toastCloseBtn.addEventListener('click', () => {
            const toast = document.getElementById('rateLimitToast');
            if (toast) {
                toast.style.display = 'none';
            }
        });
    }
});
