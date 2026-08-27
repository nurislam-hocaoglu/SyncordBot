// src/models/UserLevel.js
const mongoose = require('mongoose');

const userLevelSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    // Mevcut seviye XP'si
    xp: {
        type: Number,
        default: 0
    },
    // Toplam kazanılan XP (sıralama için)
    totalXP: {
        type: Number,
        default: 0
    },
    // Hesaplanan seviye
    level: {
        type: Number,
        default: 0
    },
    // Toplam mesaj sayısı
    messageCount: {
        type: Number,
        default: 0
    },
    // Son mesaj zamanı (cooldown için)
    lastMessage: {
        type: Number,
        default: 0
    },
    // Özel titreşim/efektler (premium vb.)
    prestige: {
        type: Number,
        default: 0
    },
    // Seviye atlama bildirimi kapatma
    notifications: {
        type: Boolean,
        default: true
    },
    // Toplam ses kanalı süresi (saniye)
    voiceTime: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Compound index für hızlı sorgular
userLevelSchema.index({ guildId: 1, totalXP: -1 });
userLevelSchema.index({ guildId: 1, userId: 1 }, { unique: true });

// Virtual: Bir sonraki seviye için gerekli XP
userLevelSchema.virtual('xpToNextLevel').get(function() {
    const currentLevelXP = Math.pow(this.level / 0.1, 2);
    const nextLevelXP = Math.pow((this.level + 1) / 0.1, 2);
    return Math.max(0, Math.floor(nextLevelXP - this.xp));
});

// Virtual: Seviye ilerleme yüzdesi
userLevelSchema.virtual('progressPercent').get(function() {
    const currentLevelXP = Math.pow(this.level / 0.1, 2);
    const nextLevelXP = Math.pow((this.level + 1) / 0.1, 2);
    const progress = this.xp - currentLevelXP;
    const needed = nextLevelXP - currentLevelXP;
    return Math.min(100, Math.max(0, Math.floor((progress / needed) * 100)));
});

// Static method: Leaderboard getir
userLevelSchema.statics.getLeaderboard = function(guildId, limit = 10) {
    return this.find({ guildId })
        .sort({ totalXP: -1 })
        .limit(limit)
        .select('userId xp totalXP level messageCount voiceTime')
        .lean();
};

// Static method: Kullanıcı sıralaması getir
userLevelSchema.statics.getUserRank = async function(guildId, userId) {
    const user = await this.findOne({ guildId, userId });
    if (!user) return null;

    const higherCount = await this.countDocuments({ 
        guildId, 
        totalXP: { $gt: user.totalXP } 
    });

    return {
        rank: higherCount + 1,
        userId: user.userId,
        xp: user.xp,
        totalXP: user.totalXP,
        level: user.level,
        messageCount: user.messageCount,
        voiceTime: user.voiceTime || 0
    };
};

// Method: XP ekle ve seviye kontrol et
userLevelSchema.methods.addXP = function(amount) {
    this.xp += amount;
    this.totalXP += amount;
    this.messageCount += 1;
    this.lastMessage = Date.now();
    
    // Yeni seviye hesapla
    const newLevel = Math.floor(0.1 * Math.sqrt(this.xp));
    const leveledUp = newLevel > this.level;
    this.level = newLevel;
    
    return { leveledUp, newLevel, oldLevel: newLevel - (leveledUp ? 1 : 0) };
};

// Method: Ses kanalı XP ekle (saniye cinsinden süre alır)
// Her 60 saniye için 5 XP verir
userLevelSchema.methods.addVoiceXP = function(seconds) {
    const xpGained = Math.floor(seconds / 60) * 5;
    this.voiceTime = (this.voiceTime || 0) + seconds;

    if (xpGained <= 0) return { leveledUp: false, xpGained: 0 };

    this.xp += xpGained;
    this.totalXP += xpGained;

    // Yeni seviye hesapla
    const newLevel = Math.floor(0.1 * Math.sqrt(this.xp));
    const leveledUp = newLevel > this.level;
    this.level = newLevel;

    return { leveledUp, newLevel, xpGained };
};

module.exports = mongoose.model('UserLevel', userLevelSchema);