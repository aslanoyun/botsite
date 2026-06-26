const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.querySelector(".theme-icon");
const html = document.documentElement;

// GÜVENLİK: LocalStorage'dan güvenli şekilde veri oku
function safeGetLocalStorage(key, defaultValue) {
    try {
        const value = localStorage.getItem(key);
        // Sadece geçerli değerlere izin ver
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

themeToggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";

    html.setAttribute("data-theme", newTheme);
    // GÜVENLİK: Sadece geçerli tema değerlerine izin ver
    if (newTheme === 'dark' || newTheme === 'light') {
        localStorage.setItem("theme", newTheme);
    }
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
}

const langToggle = document.getElementById("langToggle");
const langText = document.querySelector(".lang-text");

let currentLang = safeGetLocalStorage("language", "tr");
updateLanguage(currentLang);

langToggle.addEventListener("click", () => {
    currentLang = currentLang === "tr" ? "en" : "tr";
    // GÜVENLİK: Sadece geçerli dil değerlerine izin ver
    if (currentLang === "tr" || currentLang === "en") {
        localStorage.setItem("language", currentLang);
    }
    updateLanguage(currentLang);
});

function updateLanguage(lang) {
    const elements = document.querySelectorAll("[data-tr][data-en]");

    elements.forEach((element) => {
        // botStatus elementi için özel kontrol - dinamik içerik
        if (element.id === 'botStatus') {
            // Bu element dinamik içerik içeriyor, updateStatusLanguage tarafından yönetiliyor
            return; // Normal çeviriyi atla
        }

        // systemStatus ve systemDetail için özel kontrol - dinamik içerik
        if (element.id === 'systemStatus' || element.id === 'systemDetail') {
            // Bu elementler dinamik içerik içeriyor, updateSystemStatusLanguage tarafından yönetiliyor
            return; // Normal çeviriyi atla
        }

        // Ping detay elementi için özel kontrol - dinamik içerik
        if (element.classList && element.classList.contains('status-detail') &&
            element.previousElementSibling && element.previousElementSibling.id === 'ping') {
            // Bu element dinamik içerik içeriyor, updatePingLanguage tarafından yönetiliyor
            return; // Normal çeviriyi atla
        }

        // Altyapı kartlarındaki badge ve detail elementleri için özel kontrol
        if (element.classList && (
            element.classList.contains('status-badge') ||
            element.classList.contains('infra-detail')
        )) {
            // Bu elementler dinamik içerik içeriyor, updateServicesLanguage tarafından yönetiliyor
            return; // Normal çeviriyi atla
        }

        // Diğer elementler için normal çeviri
        const text = element.getAttribute(`data-${lang}`);
        if (text) {
            element.textContent = text;
        }
    });

    langText.textContent = lang === "tr" ? "EN" : "TR";

    if (window.botMonitorInstance) {
        window.botMonitorInstance.updatePingLanguage();
        window.botMonitorInstance.updateStatusLanguage(); // Durum mesajını da güncelle
    }
    if (window.infraMonitorInstance) {
        window.infraMonitorInstance.updateServicesLanguage();
        window.infraMonitorInstance.updateSystemStatusLanguage(); // Genel durum mesajını güncelle
    }
}

class DiscordBotMonitor {
    constructor() {
        // GÜVENLİK: API URL'i private yapıldı, değiştirilemez
        const defaultApiUrl = 'https://aslanbotsite.onrender.com';
        let _apiUrl = defaultApiUrl;

        // API URL'i sadece okunabilir yap ve değiştirmeyi engelle
        Object.defineProperty(this, 'apiUrl', {
            get: function () {
                return _apiUrl;
            },
            set: function (newUrl) {
                // Sadece güvenli origin'lere izin ver - Sıkı validation
                try {
                    // Önce string kontrolü
                    if (typeof newUrl !== 'string' || newUrl.trim() === '') {
                        console.warn('Güvenlik: Geçersiz URL formatı');
                        return;
                    }

                    const urlObj = new URL(newUrl);

                    // Protokol kontrolü - sadece http ve https
                    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                        console.warn('Güvenlik: Sadece http ve https protokolleri izin verilir');
                        return;
                    }

                    // Localhost kontrolü - exact match
                    const isLocalhost = urlObj.hostname === 'localhost' ||
                        urlObj.hostname === '127.0.0.1' ||
                        urlObj.hostname === '[::1]';

                    // Güvenli domain kontrolü - exact match veya endsWith (subdomain saldırılarını önler)
                    const allowedDomains = [
                        'onrender.com',
                        'vercel.app',
                        'netlify.app',
                        'render.com',
                        'onrender.com'
                    ];

                    let isSecure = false;
                    if (urlObj.protocol === 'https:') {
                        // Exact match kontrolü
                        if (allowedDomains.includes(urlObj.hostname)) {
                            isSecure = true;
                        } else {
                            // Subdomain kontrolü - sadece *.domain.com formatına izin ver
                            for (const domain of allowedDomains) {
                                if (urlObj.hostname.endsWith('.' + domain)) {
                                    // Subdomain var mı kontrol et (en az bir nokta olmalı)
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
                        console.log('Güvenlik: API URL güncellendi:', newUrl);
                    } else {
                        console.warn('Güvenlik: Sadece localhost veya güvenli origin\'lere izin verilir');
                    }
                } catch (e) {
                    console.error('Güvenlik: Geçersiz URL:', e.message);
                }
            },
            configurable: false,
            enumerable: true
        });

        this.updateInterval = 30000;
        this.startTime = Date.now();
    }

    // GÜVENLİK: setApiUrl metodu korumalı hale getirildi
    setApiUrl(url) {
        this.apiUrl = url; // Setter kontrolü yapacak
    }

    async fetchBotStatus() {
        try {
            const response = await fetch(`${this.apiUrl}/api/bot/stats`);

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit hatası - uyarı göster
                    this.showRateLimitWarning();
                    this.showErrorMessage(true); // Rate limit olduğunu belirt
                    return;
                }
                if (response.status >= 500) {
                    this.showErrorMessage(false); // Normal hata
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
        const pingDetail = pingElement.nextElementSibling;

        // Bot sunucuları durumunu kontrol et (altyapı durumu)
        const botInfraStatus = data.infrastructure && data.infrastructure.bot;
        const isBotServerDown = botInfraStatus === 'critical';

        // Eğer bot sunucuları bozuksa bot durumunu offline göster
        if (isBotServerDown) {
            const translations = {
                tr: 'Çevrimdışı',
                en: 'Offline'
            };
            statusElement.textContent = translations[currentLang];
            statusElement.style.color = 'var(--danger)';
            statusElement.setAttribute('data-current-status', 'offline');

            // Icon'u kırmızı yap
            const statusIcon = document.querySelector('.status-icon.online');
            if (statusIcon) {
                statusIcon.classList.remove('online');
                statusIcon.classList.add('offline');
            }

            // Ping'i gösterme - bot kapalı mesajı göster
            pingElement.textContent = '--';
            pingElement.style.color = 'var(--text-muted)';
            const pingTranslations = {
                tr: 'Bot Kapalı',
                en: 'Bot Offline'
            };
            pingDetail.textContent = pingTranslations[currentLang];
            pingDetail.setAttribute('data-ping-status', 'offline');
            return;
        }

        // Bot sunucuları çalışıyorsa normal durum
        const translations = {
            tr: 'Çevrimiçi',
            en: 'Online'
        };
        statusElement.textContent = translations[currentLang];
        statusElement.style.color = 'var(--success)';
        // Başarılı durum - status attribute'unu temizle
        statusElement.removeAttribute('data-current-status');

        // Icon'u yeşil yap
        const statusIcon = document.querySelector('.status-icon.offline, .status-icon.online');
        if (statusIcon) {
            statusIcon.classList.remove('offline');
            statusIcon.classList.add('online');
        }

        if (data.status && data.status.latency) {
            this.lastLatency = data.status.latency;
            this.updatePing(data.status.latency);
        }
    }

    showRateLimitWarning() {
        const toast = document.getElementById('rateLimitToast');
        if (toast) {
            // Toast mesajını güncelle
            const messageElement = toast.querySelector('.toast-message');
            if (messageElement) {
                const translations = {
                    tr: 'Çok fazla istek gönderildi. Lütfen birkaç dakika bekleyin.',
                    en: 'Too many requests. Please wait a few minutes.'
                };
                messageElement.textContent = translations[currentLang];
            }

            // Toast'ı göster
            toast.style.display = 'block';

            // 5 saniye sonra otomatik kapat
            setTimeout(() => {
                toast.style.display = 'none';
            }, 5000);
        }
    }

    showErrorMessage(isRateLimit = false) {
        const statusElement = document.getElementById('botStatus');

        // Mevcut durumu sakla (dil değişikliği için)
        statusElement.setAttribute('data-current-status', isRateLimit ? 'rate-limit' : 'error');

        if (isRateLimit) {
            // Rate limit durumunda özel mesaj
            const translations = {
                tr: 'Çok Fazla İstek Bilgiler Alınamadı',
                en: 'Too Many Requests Information Unavailable'
            };
            statusElement.textContent = translations[currentLang];
            statusElement.style.color = 'var(--warning)'; // Sarı renk
        } else {
            // Normal hata durumu
            const translations = {
                tr: 'Bilgiler Alınamadı',
                en: 'Information Unavailable'
            };
            statusElement.textContent = translations[currentLang];
            statusElement.style.color = 'var(--danger)'; // Kırmızı renk
        }

        const pingElement = document.getElementById('ping');
        pingElement.textContent = '--';
        pingElement.style.color = 'var(--text-muted)';

        const pingDetail = pingElement.nextElementSibling;
        const pingTranslations = {
            tr: isRateLimit ? 'Rate Limit Aşıldı' : 'Veri Yok',
            en: isRateLimit ? 'Rate Limit Exceeded' : 'No Data'
        };
        pingDetail.textContent = pingTranslations[currentLang];
        // Ping detay durumunu sakla (dil değişikliği için)
        pingDetail.setAttribute('data-ping-status', isRateLimit ? 'rate-limit' : 'no-data');
    }

    updatePing(latency) {
        const pingElement = document.getElementById('ping');
        const detailElement = pingElement.nextElementSibling;

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
            pingElement.style.color = 'var(--success)';
        }

        this.currentPingStatus = status;
        detailElement.textContent = translations[status][currentLang];
        // Ping durumunu sakla (dil değişikliği için)
        detailElement.setAttribute('data-ping-status', status);
    }
    updateStatusLanguage() {
        const statusElement = document.getElementById('botStatus');
        if (!statusElement) return;

        const currentStatus = statusElement.getAttribute('data-current-status');
        const currentColor = statusElement.style.color;

        // Eğer hata veya rate limit durumundaysa çevir
        if (currentStatus === 'rate-limit' || currentColor === 'var(--warning)') {
            const translations = {
                tr: 'Çok Fazla İstek - Bilgiler Alınamadı',
                en: 'Too Many Requests - Information Unavailable'
            };
            statusElement.textContent = translations[currentLang];
        } else if (currentStatus === 'offline') {
            // Bot offline durumu
            const translations = {
                tr: 'Çevrimdışı',
                en: 'Offline'
            };
            statusElement.textContent = translations[currentLang];
        } else if (currentStatus === 'error' || currentColor === 'var(--danger)') {
            const translations = {
                tr: 'Bilgiler Alınamadı',
                en: 'Information Unavailable'
            };
            statusElement.textContent = translations[currentLang];
        } else if (currentColor === 'var(--success)') {
            // Başarılı durum - normal çeviri
            const translations = {
                tr: 'Çevrimiçi',
                en: 'Online'
            };
            statusElement.textContent = translations[currentLang];
        }
    }

    updatePingLanguage() {
        const pingElement = document.getElementById('ping');
        if (!pingElement) return;

        const detailElement = pingElement.nextElementSibling;
        if (!detailElement) return;

        // Ping detay durumunu kontrol et
        const pingStatus = detailElement.getAttribute('data-ping-status');

        if (pingStatus === 'rate-limit') {
            // Rate limit durumu
            const translations = {
                tr: 'Rate Limit Aşıldı',
                en: 'Rate Limit Exceeded'
            };
            detailElement.textContent = translations[currentLang];
        } else if (pingStatus === 'offline') {
            // Bot offline durumu
            const translations = {
                tr: 'Bot Kapalı',
                en: 'Bot Offline'
            };
            detailElement.textContent = translations[currentLang];
        } else if (pingStatus === 'no-data') {
            // Veri yok durumu
            const translations = {
                tr: 'Veri Yok',
                en: 'No Data'
            };
            detailElement.textContent = translations[currentLang];
        } else if (this.currentPingStatus) {
            // Normal ping durumu (low, medium, high)
            const translations = {
                low: { tr: 'Düşük Gecikme', en: 'Low Latency' },
                medium: { tr: 'Orta Gecikme', en: 'Medium Latency' },
                high: { tr: 'Yüksek Gecikme', en: 'High Latency' }
            };
            detailElement.textContent = translations[this.currentPingStatus][currentLang];
        }
    }

    // Altyapı durumuna göre bot durumunu güncelle
    updateBotStatusFromInfrastructure(botInfraStatus) {
        const statusElement = document.getElementById('botStatus');
        const pingElement = document.getElementById('ping');
        const pingDetail = pingElement.nextElementSibling;

        const isBotServerDown = botInfraStatus === 'critical';

        if (isBotServerDown) {
            // Bot sunucuları bozuksa bot durumunu offline göster
            const translations = {
                tr: 'Çevrimdışı',
                en: 'Offline'
            };
            statusElement.textContent = translations[currentLang];
            statusElement.style.color = 'var(--danger)';
            statusElement.setAttribute('data-current-status', 'offline');

            // Icon'u kırmızı yap
            const statusIcon = document.querySelector('.status-icon.online, .status-icon.offline');
            if (statusIcon) {
                statusIcon.classList.remove('online');
                statusIcon.classList.add('offline');
            }

            // Ping'i gösterme - bot kapalı mesajı göster
            pingElement.textContent = '--';
            pingElement.style.color = 'var(--text-muted)';
            const pingTranslations = {
                tr: 'Bot Kapalı',
                en: 'Bot Offline'
            };
            pingDetail.textContent = pingTranslations[currentLang];
            pingDetail.setAttribute('data-ping-status', 'offline');
        } else {
            // Bot sunucuları çalışıyorsa icon'u yeşil yap
            const statusIcon = document.querySelector('.status-icon.offline');
            if (statusIcon) {
                statusIcon.classList.remove('offline');
                statusIcon.classList.add('online');
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
            api: 'operational'
        };
        this.rateLimitActive = false;
        // GÜVENLİK: API URL'i private yapıldı, değiştirilemez
        const defaultApiUrl = 'https://aslanbotsite.onrender.com';
        let _apiUrl = defaultApiUrl;

        // API URL'i sadece okunabilir yap ve değiştirmeyi engelle
        Object.defineProperty(this, 'apiUrl', {
            get: function () {
                return _apiUrl;
            },
            set: function (newUrl) {
                // Sadece güvenli origin'lere izin ver - Sıkı validation
                try {
                    // Önce string kontrolü
                    if (typeof newUrl !== 'string' || newUrl.trim() === '') {
                        console.warn('Güvenlik: Geçersiz URL formatı');
                        return;
                    }

                    const urlObj = new URL(newUrl);

                    // Protokol kontrolü - sadece http ve https
                    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
                        console.warn('Güvenlik: Sadece http ve https protokolleri izin verilir');
                        return;
                    }

                    // Localhost kontrolü - exact match
                    const isLocalhost = urlObj.hostname === 'localhost' ||
                        urlObj.hostname === '127.0.0.1' ||
                        urlObj.hostname === '[::1]';

                    // Güvenli domain kontrolü - exact match veya endsWith (subdomain saldırılarını önler)
                    const allowedDomains = [
                        'onrender.com',
                        'vercel.app',
                        'netlify.app'
                    ];

                    let isSecure = false;
                    if (urlObj.protocol === 'https:') {
                        // Exact match kontrolü
                        if (allowedDomains.includes(urlObj.hostname)) {
                            isSecure = true;
                        } else {
                            // Subdomain kontrolü - sadece *.domain.com formatına izin ver
                            for (const domain of allowedDomains) {
                                if (urlObj.hostname.endsWith('.' + domain)) {
                                    // Subdomain var mı kontrol et (en az bir nokta olmalı)
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
                        console.log('Güvenlik: API URL güncellendi:', newUrl);
                    } else {
                        console.warn('Güvenlik: Sadece localhost veya güvenli origin\'lere izin verilir');
                    }
                } catch (e) {
                    console.error('Güvenlik: Geçersiz URL:', e.message);
                }
            },
            configurable: false,
            enumerable: true
        });
    }

    // Altyapı durumu /api/server/status endpoint'inden geliyor
    async checkServices() {
        try {
            const apiUrl = window.botMonitorInstance ? window.botMonitorInstance.apiUrl : this.apiUrl;
            const response = await fetch(`${apiUrl}/api/server/status`);

            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit hatası
                    this.rateLimitActive = true;
                    this.showRateLimitStatus();
                    return;
                }
                throw new Error(`API returned ${response.status}`);
            }

            const result = await response.json();

            // Rate limit yoksa normal duruma dön
            this.rateLimitActive = false;

            if (result.success && result.data && result.data.infrastructure) {
                const infra = result.data.infrastructure;
                this.updateServiceStatus("github", infra.github);
                this.updateServiceStatus("discord", infra.discord);
                this.updateServiceStatus("bot", infra.bot);
                this.updateServiceStatus('api', 'none');

                // Bot sunucuları durumuna göre bot durumunu güncelle
                if (window.botMonitorInstance && infra.bot) {
                    window.botMonitorInstance.updateBotStatusFromInfrastructure(infra.bot);
                }
            } else {
                // Eğer infrastructure verisi yoksa varsayılan olarak operational yap
                this.updateServiceStatus("github", "none");
                this.updateServiceStatus("discord", "none");
                this.updateServiceStatus("bot", "none");
                this.updateServiceStatus("api", "none");
            }

        } catch (error) {
            console.error('Error checking services:', error);
            // Rate limit değilse normal hata göster
            if (!this.rateLimitActive) {
                this.updateServiceStatus("github", "critical");
                this.updateServiceStatus("discord", "critical");
                this.updateServiceStatus("bot", "critical");
                this.updateServiceStatus("api", "critical");

                // Bot sunucuları critical olduğunda bot durumunu da güncelle
                if (window.botMonitorInstance) {
                    window.botMonitorInstance.updateBotStatusFromInfrastructure('critical');
                }
            }
        }

        setTimeout(() => this.updateSystemStatus(), 1000);
    }

    showRateLimitStatus() {
        // Tüm servislerde rate limit göster
        const serviceNames = ['github', 'bot', 'discord', 'api'];
        serviceNames.forEach(serviceName => {
            const card = document.querySelector(`.infra-icon.${serviceName}`)?.closest('.infra-card');
            if (card) {
                const badge = card.querySelector('.status-badge');
                const detail = card.querySelector('.infra-detail');

                if (badge) {
                    badge.className = 'status-badge outage';
                    const translations = {
                        tr: 'Rate Limit',
                        en: 'Rate Limit'
                    };
                    badge.textContent = translations[currentLang];
                    badge.setAttribute('data-service-status', 'rate-limit');
                    badge.setAttribute('data-service-name', serviceName);
                }

                if (detail) {
                    const translations = {
                        tr: 'Rate Limit Aşıldı',
                        en: 'Rate Limit Exceeded'
                    };
                    detail.textContent = translations[currentLang];
                    detail.setAttribute('data-service-status', 'rate-limit');
                    detail.setAttribute('data-service-name', serviceName);
                }
            }
        });

        // Genel durum mesajını da güncelle
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
        const iconElement = document.querySelector('.status-icon.infrastructure-status');

        let finalStatus = 'operational';
        if (statuses.includes('outage')) finalStatus = 'outage';
        else if (statuses.includes('degraded')) finalStatus = 'degraded';

        const statusTitles = {
            operational: { tr: 'Sistem Normal', en: 'Systems Normal' },
            degraded: { tr: 'Sıkıntılı', en: 'Systems Degraded' },
            outage: { tr: 'Kesinti Var', en: 'System Outage' }
        };

        const statusDetails = {
            operational: { tr: 'Tüm servisler aktif', en: 'All services active' },
            degraded: { tr: 'Bazı servislerde sorun var', en: 'Issues with some services' },
            outage: { tr: 'Kritik servis kesintisi', en: 'Critical service outage' }
        };

        systemElement.textContent = statusTitles[finalStatus][currentLang];
        detailElement.textContent = statusDetails[finalStatus][currentLang];

        // Durumu sakla (dil değişikliği için)
        systemElement.setAttribute('data-system-status', finalStatus);
        detailElement.setAttribute('data-system-status', finalStatus);

        if (finalStatus === 'operational') {
            systemElement.style.color = 'var(--success)';
            iconElement.style.background = 'linear-gradient(135deg, #43b581, #3ea06d)';
        } else if (finalStatus === 'degraded') {
            systemElement.style.color = 'var(--warning)';
            iconElement.style.background = 'linear-gradient(135deg, #faa61a, #f04747)';
        } else {
            systemElement.style.color = 'var(--danger)';
            iconElement.style.background = 'linear-gradient(135deg, #f04747, #d0021b)';
        }
    }

    updateSystemStatusLanguage() {
        const systemElement = document.getElementById('systemStatus');
        const detailElement = document.getElementById('systemDetail');

        if (!systemElement || !detailElement) return;

        const status = systemElement.getAttribute('data-system-status');

        // Eğer durum yoksa, mevcut içerikten durumu tespit et
        let finalStatus = status;
        if (!finalStatus) {
            const currentText = systemElement.textContent;
            if (currentText.includes('Kesinti Var') || currentText.includes('System Outage')) {
                finalStatus = 'outage';
            } else if (currentText.includes('Sıkıntılı') || currentText.includes('Systems Degraded')) {
                finalStatus = 'degraded';
            } else {
                finalStatus = 'operational';
            }
            systemElement.setAttribute('data-system-status', finalStatus);
        }

        const statusTitles = {
            operational: { tr: 'Sistem Normal', en: 'Systems Normal' },
            degraded: { tr: 'Sıkıntılı', en: 'Systems Degraded' },
            outage: { tr: 'Kesinti Var', en: 'System Outage' }
        };

        const statusDetails = {
            operational: { tr: 'Tüm servisler aktif', en: 'All services active' },
            degraded: { tr: 'Bazı servislerde sorun var', en: 'Issues with some services' },
            outage: { tr: 'Kritik servis kesintisi', en: 'Critical service outage' }
        };

        systemElement.textContent = statusTitles[finalStatus][currentLang];
        detailElement.textContent = statusDetails[finalStatus][currentLang];
    }

    updateServiceStatus(serviceName, indicator) {
        const infraCards = document.querySelectorAll(".infra-card");
        const translations = {
            operational: { tr: "Normal", en: "Operational" },
            degraded: { tr: "Olaylı", en: "Degraded" },
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

                let status = "operational";
                if (indicator === "minor" || indicator === "major") {
                    status = "degraded";
                } else if (indicator === "critical") {
                    status = "outage";
                } else if (indicator === "none") {
                    status = "operational";
                }

                badge.className = `status-badge ${status}`;
                badge.textContent = translations[status][currentLang];
                // Durumu sakla (dil değişikliği için)
                badge.setAttribute('data-service-status', status);
                badge.setAttribute('data-service-name', serviceName);

                detail.textContent = detailTranslations[status][currentLang];
                // Detay durumunu da sakla
                detail.setAttribute('data-service-status', status);
                detail.setAttribute('data-service-name', serviceName);

                this.serviceStates[serviceName] = status;
            }
        });
    }

    updateServicesLanguage() {
        const translations = {
            operational: { tr: "Normal", en: "Operational" },
            degraded: { tr: "Olaylı", en: "Degraded" },
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
                    // Önce attribute'dan durumu al, yoksa serviceStates'ten
                    const status = badge.getAttribute('data-service-status') ||
                        this.serviceStates[serviceName] ||
                        'operational';

                    // Rate limit durumunu kontrol et
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
                    // Önce attribute'dan durumu al, yoksa serviceStates'ten
                    const status = detail.getAttribute('data-service-status') ||
                        this.serviceStates[serviceName] ||
                        'operational';

                    // Rate limit durumunu kontrol et
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
        this.checkServices();

        setInterval(() => {
            this.checkServices();
        }, 120000);
    }
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    const botMonitor = new DiscordBotMonitor();

    // botMonitor.setApiUrl('https://your-backend-api.onrender.com');

    // GÜVENLİK: Kritik metodları koruma altına al (freeze yerine)
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

    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, observerOptions);

    document
        .querySelectorAll(".status-card, .infra-card, .support-card")
        .forEach((card) => {
            card.style.opacity = "0";
            card.style.transform = "translateY(30px)";
            card.style.transition = "opacity 0.6s ease, transform 0.6s ease";
            observer.observe(card);
        });

    // GÜVENLİK: Toast close button event listener (inline onclick yerine)
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

// formatNumber ve formatTime fonksiyonları kaldırıldı - kullanılmıyor
