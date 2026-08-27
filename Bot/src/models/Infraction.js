// src/models/Infraction.js
//
// Kullanıcı İhlal Sicili (Infraction) Modeli
//
// Her sunucu için her kullanıcının ihlal geçmişini tutar.
// Bu model kademeli ceza sistemine olanak tanır:
//   1. ihlal → Uyarı
//   2. ihlal → Timeout (X dakika)
//   3. ihlal → Daha uzun timeout / Kick
//
// Kullanım:
//   const Infraction = require('./Infraction');
//   const doc = await Infraction.addInfraction(guildId, userId, 'wordFilter', 'sik');

const mongoose = require('mongoose');

// Tekil ihlal kaydı (geçmiş için)
const infractionEntrySchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        // Mevcut AutoMod filtre tipleri + yeni wordFilter
        enum: ['wordFilter', 'spam', 'caps', 'invite', 'mentions', 'custom'],
    },
    reason: {
        type: String,
        default: 'Belirtilmedi'
    },
    triggeredWord: {
        type: String,
        default: null  // Hangi kelime tetikledi (wordFilter için)
    },
    moderatorId: {
        type: String,
        default: null  // Manuel mod işlemlerinde moderatör ID'si
    },
    actionTaken: {
        type: String,
        enum: ['warn', 'delete', 'timeout', 'kick', 'ban', 'none'],
        default: 'warn'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, { _id: false });

// Ana infraction belgesi
const infractionSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },

    // Toplam ihlal sayacı (hızlı erişim için)
    totalCount: {
        type: Number,
        default: 0
    },

    // Filtreye göre ihlal sayaçları (örn: { wordFilter: 3, spam: 1 })
    counts: {
        type: Map,
        of: Number,
        default: {}
    },

    // Son 90 günlük ihlal geçmişi (TTL ile otomatik silinmez; manuel yönetilir)
    history: {
        type: [infractionEntrySchema],
        default: []
    },

    // Son ihlal zamanı (hızlı sıralama için)
    lastInfractionAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Compound index: sunucudaki kullanıcıya hızlı erişim
infractionSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// ─── Static Methods ───────────────────────────────────────────────────────────

/**
 * Kullanıcıya yeni bir ihlal ekler ve güncel belgeyi döndürür.
 *
 * @param {string} guildId
 * @param {string} userId
 * @param {string} type - İhlal tipi ('wordFilter', 'spam', vb.)
 * @param {object} [details] - Ek bilgiler
 * @param {string} [details.reason]        - İnsan okunur açıklama
 * @param {string} [details.triggeredWord] - Tetikleyen kelime
 * @param {string} [details.actionTaken]   - Uygulanan ceza
 * @param {string} [details.moderatorId]   - Moderatör ID'si
 * @returns {Promise<{ doc: InfractionDoc, typeCount: number, totalCount: number }>}
 */
infractionSchema.statics.addInfraction = async function (guildId, userId, type, details = {}) {
    const entry = {
        type,
        reason:        details.reason        || `AutoMod: ${type}`,
        triggeredWord: details.triggeredWord || null,
        actionTaken:   details.actionTaken   || 'warn',
        moderatorId:   details.moderatorId   || null,
        timestamp:     new Date()
    };

    const doc = await this.findOneAndUpdate(
        { guildId, userId },
        {
            $inc: {
                totalCount: 1,
                [`counts.${type}`]: 1
            },
            $push: {
                history: {
                    $each:     [entry],
                    $slice:    -100,   // En fazla 100 kayıt tut (eski silinir)
                    $position: 0       // Yeniler başa ekle
                }
            },
            $set: { lastInfractionAt: new Date() }
        },
        { upsert: true, returnDocument: 'after' }
    );

    const typeCount  = doc.counts.get(type) || 1;
    const totalCount = doc.totalCount;

    return { doc, typeCount, totalCount };
};

/**
 * Kullanıcının tüm ihlallerini temizler (Admin affı).
 */
infractionSchema.statics.clearInfractions = async function (guildId, userId) {
    return this.findOneAndUpdate(
        { guildId, userId },
        {
            $set: {
                totalCount: 0,
                counts: {},
                history: [],
                lastInfractionAt: null
            }
        },
        { returnDocument: 'after' }
    );
};

/**
 * Belirli bir filtre tipindeki sayacı sıfırlar.
 */
infractionSchema.statics.resetType = async function (guildId, userId, type) {
    return this.findOneAndUpdate(
        { guildId, userId },
        { $set: { [`counts.${type}`]: 0 } },
        { returnDocument: 'after' }
    );
};

/**
 * Sunucudaki en çok ihlal yapan kullanıcıları listeler.
 * @param {string} guildId
 * @param {number} [limit=10]
 */
infractionSchema.statics.getTopOffenders = function (guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ totalCount: -1 })
        .limit(limit)
        .select('userId totalCount counts lastInfractionAt')
        .lean();
};

module.exports = mongoose.model('Infraction', infractionSchema);
