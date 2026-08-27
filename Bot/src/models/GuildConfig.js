// src/models/GuildConfig.js
const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true
    },
    // Genel ayarlar
    prefix: {
        type: String,
        default: '!'
    },
    language: {
        type: String,
        default: 'tr'
    },
    
    // AutoMod ayarları
    automod: {
        enabled: { type: Boolean, default: true },
        logChannel: { type: String, default: null },
        filters: {
            type: Map,
            of: new mongoose.Schema({
                enabled: { type: Boolean, default: true },
                action: { type: String, default: 'delete' }, // delete, timeout, warn
                threshold: { type: Number },
                whitelist: [String]
            }, { _id: false }),
            default: {}
        },

        // Kelime Filtresi (Word Filter) ayarları
        wordFilter: {
            // Filtre açık/kapalı
            enabled: { type: Boolean, default: false },

            // Eylem: 'delete' → sil + uyar, 'timeout' → sil + sustur, 'warn' → sadece uyar
            action: { type: String, enum: ['delete', 'timeout', 'warn'], default: 'delete' },

            // Timeout süresi (saniye) — action = 'timeout' ise uygulanır
            timeoutDuration: { type: Number, default: 300 }, // 5 dakika

            // Kademeli ceza: X ihlalden sonra timeout uygula (0 = kapalı)
            timeoutThreshold: { type: Number, default: 3 },

            // Log kanalı (boşsa genel automod.logChannel kullanılır)
            logChannel: { type: String, default: null },

            // Sunucuya özel ek kara liste (admin tarafından eklenir)
            bannedWords: { type: [String], default: [] },

            // Beyaz liste — bu kelimeler asla filtrelenmez (false-positive önleme)
            whitelist: { type: [String], default: [] },

            // Herkese açık bildirim mi, yoksa sadece DM mi?
            notifyInChannel: { type: Boolean, default: true },
            notifyViaDM: { type: Boolean, default: false }
        }
    },

    // Leveling ayarları
    leveling: {
        enabled: { type: Boolean, default: true },
        xpPerMessage: { type: Number, default: 20 },
        xpCooldown: { type: Number, default: 60000 },
        levelUpChannel: { type: String, default: null },
        levelUpMessage: { type: String, default: '🎉 {user} **Level {level}** oldu!' },
        rewards: {
            type: Map,
            of: String, // level -> roleId
            default: {}
        },
        ignoredChannels: [String],
        ignoredRoles: [String]
    },

    // Logging ayarları
    logging: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null }, // Ana log kanalı
        channels: {
            type: Map,
            of: String, // logType -> channelId
            default: {}
        },
        ignoredChannels: [String]
    },

    // Hoş geldin / Güle güle
    welcome: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null },
        message: { type: String, default: 'Hoş geldin {user}! 🎉' },
        dmMessage: { type: String, default: '' },
        autoRole: { type: String, default: null },
        // Canvas banner ayarları (800x300 px)
        banner: {
            enabled: { type: Boolean, default: true },
            width: { type: Number, default: 800 },
            height: { type: Number, default: 300 }
        },
        embed: {
            enabled: { type: Boolean, default: true },
            color: { type: String, default: '#5865F2' }, // Discord Mavisi
            thumbnail: { type: Boolean, default: true },
            title: { type: String, default: 'Aramıza Katıldı! 🎉' },
            rulesChannel: { type: String, default: null }, // 📜 Kurallar kanalı
            chatChannel: { type: String, default: null },  // 💬 Genel sohbet kanalı
            roleChannel: { type: String, default: null }   // 🎭 Rol seçim kanalı
        }
    },
    goodbye: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null },
        message: { type: String, default: 'Güle güle {user} 👋' },
        // Canvas banner ayarları (800x300 px)
        banner: {
            enabled: { type: Boolean, default: true },
            width: { type: Number, default: 800 },
            height: { type: Number, default: 300 }
        },
        embed: {
            enabled: { type: Boolean, default: true },
            color: { type: String, default: '#ED4245' }, // Discord Kırmızısı
            thumbnail: { type: Boolean, default: true },
            title: { type: String, default: 'Aramızdan Ayrıldı 👋' }
        }
    },

    // Moderasyon
    moderation: {
        muteRole: { type: String, default: null },
        logChannel: { type: String, default: null },
        dmOnAction: { type: Boolean, default: true }
    },

    // Müzik / Eğlence
    music: {
        enabled: { type: Boolean, default: true },
        djRole: { type: String, default: null },
        maxQueueSize: { type: Number, default: 50 },
        defaultVolume: { type: Number, default: 50 }
    },

    // Ekonomi (gelecek için)
    economy: {
        enabled: { type: Boolean, default: false },
        dailyAmount: { type: Number, default: 100 },
        workAmount: { type: Number, default: 50 },
        currency: { type: String, default: '🪙' }
    },

    // Ticket / Destek Sistemi
    ticket: {
        enabled: { type: Boolean, default: false },
        mode: { type: String, enum: ['channel', 'thread'], default: 'channel' }, // 'channel' = Metin Kanalı, 'thread' = Özel Alt Başlık (Private Thread)
        category: { type: String, default: null }, // Ticket kategorisi (Channel ID)
        logChannel: { type: String, default: null }, // Ticket log kanalı
        staffRoles: [String], // Genel yetkili rolleri
        panelChannel: { type: String, default: null }, // Panel gönderilecek kanal
        panelMessageId: { type: String, default: null }, // Panel mesaj ID'si
        maxOpenTickets: { type: Number, default: 3 }, // Kullanıcı başına max açık ticket
        autoCloseHours: { type: Number, default: 48 }, // İnaktif ticket kapanma süresi (saat)
        transcriptChannel: { type: String, default: null }, // Transcript log kanalı
        categories: {
            type: Map,
            of: new mongoose.Schema({
                enabled: { type: Boolean, default: true },
                name: { type: String },
                emoji: { type: String },
                staffRoles: [String],
                categoryId: { type: String }
            }, { _id: false }),
            default: {}
        },
        panel: {
            title: { type: String, default: '🎫 Destek & Bilet Sistemi' },
            description: { type: String, default: null },
            style: { type: String, enum: ['buttons', 'dropdown'], default: 'buttons' },
            rules: { type: String, default: '• Gereksiz yere talep açmayınız.\n• Sorununuzu formda net ve detaylı belirtiniz.' },
            showRules: { type: Boolean, default: true },
            responseTime: { type: String, default: '• Yetkili ekibimiz en kısa sürede kanal üzerinden sizinle iletişime geçecektir.' },
            showResponseTime: { type: Boolean, default: true }
        }
    }
}, {
    timestamps: true
});

// Model export
module.exports = mongoose.model('GuildConfig', guildConfigSchema);