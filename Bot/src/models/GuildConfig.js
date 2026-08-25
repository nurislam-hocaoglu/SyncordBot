// src/models/GuildConfig.js
const mongoose = require('mongoose');

const guildConfigSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        unique: true,
        index: true
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
        embed: {
            enabled: { type: Boolean, default: true },
            color: { type: String, default: '#00ff00' },
            thumbnail: { type: Boolean, default: true }
        }
    },
    goodbye: {
        enabled: { type: Boolean, default: false },
        channel: { type: String, default: null },
        message: { type: String, default: 'Güle güle {user} 👋' },
        embed: {
            enabled: { type: Boolean, default: true },
            color: { type: String, default: '#ff4444' }
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
    }
}, {
    timestamps: true
});

// Indexler
guildConfigSchema.index({ guildId: 1 }, { unique: true });

module.exports = mongoose.model('GuildConfig', guildConfigSchema);