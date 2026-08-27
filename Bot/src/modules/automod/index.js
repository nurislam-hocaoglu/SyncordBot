// src/modules/automod/index.js
const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const GuildConfig  = require('../../models/GuildConfig');
const Infraction   = require('../../models/Infraction');
const wordFilter   = require('./filters/wordFilter');

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

        // ──────────────────────────────────────────────────────────────────────
        // 0. KELIME FİLTRESİ (Word Filter) — En önce kontrol edilir
        // ──────────────────────────────────────────────────────────────────────
        const wfConfig = config.automod.wordFilter;
        if (wfConfig && wfConfig.enabled) {
            const result = wordFilter.checkContent(content, {
                guildBannedWords: wfConfig.bannedWords || [],
                whitelist:        wfConfig.whitelist   || [],
            });

            if (result.triggered) {
                violation = {
                    type:   'wordFilter',
                    reason: `Yasaklı kelime kullanımı`,
                    word:   result.word,
                    source: result.source // 'global' veya 'guild'
                };
            }
        }

        // ──────────────────────────────────────────────────────────────────────
        // 1. Davet Linki Filtresi
        // ──────────────────────────────────────────────────────────────────────
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
        if (!violation && inviteRegex.test(content)) {
            violation = { type: 'invite', reason: 'Sunucu davet linki paylaşımı' };
        }

        // ──────────────────────────────────────────────────────────────────────
        // 2. Büyük Harf (Caps Lock) Filtresi
        // ──────────────────────────────────────────────────────────────────────
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

        // ──────────────────────────────────────────────────────────────────────
        // 3. Çoklu Etiket (Mass Mention) Filtresi
        // ──────────────────────────────────────────────────────────────────────
        if (!violation && (message.mentions.users.size + message.mentions.roles.size) >= 5) {
            violation = { type: 'mentions', reason: 'Toplu etiket atma (5+ etiket)' };
        }

        // ──────────────────────────────────────────────────────────────────────
        // 4. Hızlı Mesaj (Spam) Filtresi
        // ──────────────────────────────────────────────────────────────────────
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

        // ──────────────────────────────────────────────────────────────────────
        // İhlal varsa işlem yap
        // ──────────────────────────────────────────────────────────────────────
        if (violation) {
            try {
                // Mesajı sil
                if (message.deletable) {
                    await message.delete();
                }

                // ── Word Filter özel işlemi ──────────────────────────────────
                if (violation.type === 'wordFilter') {
                    await this._handleWordFilterViolation(message, config, violation);
                    return true;
                }

                // ── Diğer filtreler için standart işlem ─────────────────────
                const warnMsg = await message.channel.send({
                    content: `⚠️ ${message.author}, mesajınız kural ihlali nedeniyle silindi: **${violation.reason}**`
                });
                setTimeout(() => warnMsg.delete().catch(() => {}), 5000);

                // Log kanalına bildir
                await this._sendLog(message, config, violation, content);

                return true;
            } catch (err) {
                console.error('[AutoMod] İşlem hatası:', err.message);
            }
        }

        return false;
    }

    // ──────────────────────────────────────────────────────────────────────────
    // WORD FILTER İHLAL YÖNETİCİSİ
    // ──────────────────────────────────────────────────────────────────────────
    /**
     * Kelime filtresi ihlalini işler: sicil kaydı, kademeli ceza, bildirim, log.
     */
    async _handleWordFilterViolation(message, config, violation) {
        const wfConfig = config.automod.wordFilter;
        const { guildId } = message.guild;
        const userId       = message.author.id;

        // 1. Sicile ihlal ekle ve kaç kez ihlal ettiğini al
        let typeCount = 1;
        try {
            const result = await Infraction.addInfraction(
                guildId,
                userId,
                'wordFilter',
                {
                    reason:        `Yasaklı kelime: "${violation.word}"`,
                    triggeredWord: violation.word,
                    actionTaken:   'delete'
                }
            );
            typeCount = result.typeCount;
        } catch (err) {
            console.error('[AutoMod:WordFilter] Sicil kaydı hatası:', err.message);
        }

        // 2. Kademeli ceza: threshold aşıldıysa timeout uygula
        const threshold = wfConfig.timeoutThreshold || 3;
        let actionTaken = wfConfig.action || 'delete';

        if (
            threshold > 0 &&
            typeCount >= threshold &&
            message.member &&
            message.member.moderatable
        ) {
            try {
                const durationMs = (wfConfig.timeoutDuration || 300) * 1000;
                await message.member.timeout(durationMs, `AutoMod: Tekrarlı yasaklı kelime (${typeCount}. ihlal)`);
                actionTaken = 'timeout';
            } catch (err) {
                console.error('[AutoMod:WordFilter] Timeout hatası:', err.message);
            }
        }

        // 3. Kanala uyarı mesajı
        if (wfConfig.notifyInChannel !== false) {
            let warnText = `⚠️ ${message.author}, mesajınız **yasaklı kelime** içerdiği için silindi.`;
            if (actionTaken === 'timeout') {
                const mins = Math.ceil((wfConfig.timeoutDuration || 300) / 60);
                warnText += ` Tekrarlı ihlal nedeniyle **${mins} dakika** susturuldunuz.`;
            }
            const warnMsg = await message.channel.send({ content: warnText }).catch(() => null);
            if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 6000);
        }

        // 4. DM bildirimi
        if (wfConfig.notifyViaDM) {
            await message.author.send({
                content: `⚠️ **${message.guild.name}** sunucusunda yasaklı kelime kullandığın tespit edildi. Mesajın silindi.`
            }).catch(() => {}); // DM kapalıysa sessizce geç
        }

        // 5. Log kanalına bildir
        const logChannelId = wfConfig.logChannel || config.automod.logChannel;
        if (logChannelId) {
            const logChannel = message.guild.channels.cache.get(logChannelId);
            if (logChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('🔞 Kelime Filtresi İhlali')
                    .setColor('#e74c3c')
                    .addFields(
                        { name: '👤 Kullanıcı',        value: `${message.author} (${message.author.id})`, inline: true },
                        { name: '📢 Kanal',             value: `${message.channel}`,                       inline: true },
                        { name: '🔢 İhlal Sayısı',      value: `${typeCount}. kez`,                        inline: true },
                        { name: '🚫 Tetikleyen Kelime', value: `\`${violation.word}\` (${violation.source === 'global' ? 'Global Liste' : 'Sunucu Listesi'})`, inline: false },
                        { name: '⚖️ Uygulanan Ceza',    value: actionTaken === 'timeout' ? `Timeout (${Math.ceil((wfConfig.timeoutDuration || 300) / 60)} dk)` : 'Mesaj Silindi', inline: true },
                        { name: '📝 Mesaj İçeriği',     value: message.content.substring(0, 900) || '*İçerik yok*', inline: false }
                    )
                    .setFooter({ text: `ID: ${message.author.id}` })
                    .setTimestamp();

                await logChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // STANDART LOG GÖNDERİCİ (Diğer filtreler için)
    // ──────────────────────────────────────────────────────────────────────────
    async _sendLog(message, config, violation, content) {
        const logChannelId = config.automod.logChannel;
        if (!logChannelId) return;

        const logChannel = message.guild.channels.cache.get(logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ AutoMod İhlali')
            .setColor('#ff4444')
            .addFields(
                { name: 'Kullanıcı',      value: `${message.author.tag}`, inline: true },
                { name: 'Kanal',          value: `${message.channel}`,    inline: true },
                { name: 'Sebep',          value: violation.reason,         inline: false },
                { name: 'Mesaj İçeriği', value: content.substring(0, 1000) || '*İçerik yok*', inline: false }
            )
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

module.exports = new AutoModModule();
