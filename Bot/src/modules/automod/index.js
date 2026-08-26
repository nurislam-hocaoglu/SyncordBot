// src/modules/automod/index.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

// Kullanıcı spam takip tablosu (Hafızada tutulur)
const messageTimestamps = new Map();

class AutoModModule {
    /**
     * Mesajı AutoMod filtrelerinden geçirir
     * @param {Message} message 
     * @returns {Promise<boolean>} true: mesaj silindi/engellendi, false: mesaj temiz
     */
    async handleMessage(message) {
        if (!message.guild || message.author.bot || message.system) return false;

        // Yönetici veya Yetkili kontrolü (Yetkililer filtrelere takılmaz)
        if (message.member && (
            message.member.permissions.has(PermissionFlagsBits.Administrator) ||
            message.member.permissions.has(PermissionFlagsBits.ManageMessages)
        )) {
            return false;
        }

        // Sunucu ayarlarını çek
        let config;
        try {
            config = await GuildConfig.findOne({ guildId: message.guild.id });
        } catch (e) {
            return false;
        }

        if (!config || !config.automod || !config.automod.enabled) {
            return false;
        }

        const content = message.content;
        let violation = null;

        // 1. Davet Linki Filtresi
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
        if (inviteRegex.test(content)) {
            violation = { type: 'invite', reason: 'Sunucu davet linki paylaşımı' };
        }

        // 2. Büyük Harf (Caps Lock) Filtresi
        if (!violation && content.length >= 10) {
            const letters = content.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ]/g, '');
            if (letters.length >= 8) {
                const upperLetters = letters.replace(/[^A-ZĞÜŞİÖÇ]/g, '');
                const upperRatio = upperLetters.length / letters.length;
                if (upperRatio >= 0.7) {
                    violation = { type: 'caps', reason: 'Aşırı büyük harf kullanımı (%70+)' };
                }
            }
        }

        // 3. Çoklu Etiket (Mass Mention) Filtresi
        if (!violation && (message.mentions.users.size + message.mentions.roles.size) >= 5) {
            violation = { type: 'mentions', reason: 'Toplu etiket atma (5+ etiket)' };
        }

        // 4. Hızlı Mesaj (Spam) Filtresi
        if (!violation) {
            const userId = message.author.id;
            const now = Date.now();
            const userHistory = messageTimestamps.get(userId) || [];
            
            // Son 5 saniyedeki mesajlar
            const recentMessages = userHistory.filter(t => now - t < 5000);
            recentMessages.push(now);
            messageTimestamps.set(userId, recentMessages);

            if (recentMessages.length >= 5) {
                violation = { type: 'spam', reason: 'Çok hızlı mesaj gönderme (Spam)' };
            }
        }

        // İhlal varsa işlem yap
        if (violation) {
            try {
                if (message.deletable) {
                    await message.delete();
                }

                // Kullanıcıya uyarı mesajı
                const warnMsg = await message.channel.send({
                    content: `⚠️ ${message.author}, mesajınız kural ihlali nedeniyle silindi: **${violation.reason}**`
                });
                setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                // Log kanalına bildir
                if (config.automod.logChannel) {
                    const logChannel = message.guild.channels.cache.get(config.automod.logChannel);
                    if (logChannel) {
                        const embed = new EmbedBuilder()
                            .setTitle('🛡️ AutoMod İhlali')
                            .setColor('#ff4444')
                            .addFields(
                                { name: 'Kullanıcı', value: `${message.author.tag} (${message.author.id})`, inline: true },
                                { name: 'Kanal', value: `${message.channel}`, inline: true },
                                { name: 'Sebep', value: violation.reason, inline: false },
                                { name: 'Mesaj İçeriği', value: content.substring(0, 1000) || '*İçerik yok*', inline: false }
                            )
                            .setTimestamp();

                        await logChannel.send({ embeds: [embed] }).catch(() => {});
                    }
                }
                return true;
            } catch (err) {
                console.error('[AutoMod] İşlem hatası:', err.message);
            }
        }

        return false;
    }
}

module.exports = new AutoModModule();
