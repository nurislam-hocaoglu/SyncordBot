// src/modules/goodbye/index.js
/**
 * Syncord — Ayrılma (Güle Güle) Modülü
 * Canvas tabanlı dinamik ayrılma banner'ı (800x300 px)
 * Kırmızımsı halka vurgusu (#ED4245) ile Welcome ile aynı tasarım dili
 */

const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const { renderCard } = require('../../utils/cardRenderer');

const BANNER_FILE_NAME = 'goodbye-banner.png';

// Çift gönderim koruması
const recentlySent = new Set();

class GoodbyeModule {
    async buildBanner(member, options = {}) {
        const username = member.user?.username || member.displayName || 'Üye';
        const serverName = member.guild?.name || 'Sunucu';
        const memberCount = (member.guild?.memberCount ?? 1).toLocaleString('tr-TR');
        const avatarURL = member.user?.displayAvatarURL?.({ extension: 'png', size: 256 })
            || (typeof member.displayAvatarURL === 'function' ? member.displayAvatarURL({ extension: 'png', size: 256 }) : null);

        return renderCard({
            width: options.width,
            height: options.height,
            avatarURL,
            title: 'GÜLE GÜLE, ' + username + '!',
            subtitle: serverName + ' topluluğu şu an ' + memberCount + ' kişi, seni bekleriz!',
            accent: '#ED4245',
            accentSoft: '#C93B40'
        });
    }

    buildEmbed(member, client, config) {
        const guild = member.guild;
        const gCfg = config?.goodbye?.embed || {};
        const userTag = member.user?.tag || member.displayName || member.user?.username || 'Bir üye';

        const embed = new EmbedBuilder()
            .setTitle(gCfg.title || 'Aramızdan Ayrıldı 👋')
            .setDescription(
                '**' + userTag + '** sunucudan ayrıldı.\n\n' +
                'Seninle güzel bir topluluk oluşturduk, yolun açık olsun! 🌟'
            )
            .setColor(gCfg.color || '#ED4245')
            .setFooter({
                text: 'Syncord | Kalan Üye #' + guild.memberCount,
                iconURL: client.user.displayAvatarURL({ extension: 'png', size: 64 })
            })
            .setTimestamp();

        const avatarURL = member.user?.displayAvatarURL?.({ extension: 'png', size: 256 })
            || (typeof member.displayAvatarURL === 'function' ? member.displayAvatarURL({ extension: 'png', size: 256 }) : null);

        if (gCfg.thumbnail !== false && avatarURL) {
            embed.setThumbnail(avatarURL);
        }

        return embed;
    }

    formatMessage(template, member) {
        const tag = member.user?.tag || member.displayName || 'Üye';
        const username = member.user?.username || member.displayName || 'Üye';
        const serverName = member.guild?.name || 'Sunucu';
        const count = String(member.guild?.memberCount || '');

        return template
            .replace(/{user}/g, tag)
            .replace(/{username}/g, username)
            .replace(/{server}/g, serverName)
            .replace(/{memberCount}/g, count);
    }

    async sendGoodbye(member, client) {
        const guild = member.guild;
        if (!guild) return false;

        const memberId = member.id || member.user?.id;
        const dedupeKey = guild.id + ':' + memberId;
        if (recentlySent.has(dedupeKey)) {
            return false;
        }
        recentlySent.add(dedupeKey);
        setTimeout(() => recentlySent.delete(dedupeKey), 10000);

        try {
            const config = await GuildConfig.findOne({ guildId: guild.id }).catch(() => null);
            const g = config?.goodbye;

            // Kanal tespiti: goodbye kanalı yoksa karşılama kanalına yedekle
            const targetChannelId = g?.channel || (g?.enabled ? config?.welcome?.channel : null);

            // Eğer ayrılma sistemi açık değilse ve özel kanal atanmamışsa
            if (!g?.enabled && !g?.channel) {
                console.log('[Goodbye] ℹ️ Ayrılma modülü kapalıdır veya kanal ayarlanmamıştır (/settings goodbye).');
                return false;
            }

            if (!targetChannelId) {
                console.warn('[Goodbye] ⚠️ Ayrılma kanalı bulunamadı. /settings goodbye channel:#kanal ile ayarlayınız.');
                return false;
            }

            const channel = guild.channels.cache.get(targetChannelId);
            if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) {
                console.warn('[Goodbye] ⚠️ Hedef kanal bulunamadı veya metin kanalı değil: ' + targetChannelId);
                return false;
            }

            const perms = channel.permissionsFor(guild.members.me);
            if (perms && (!perms.has('ViewChannel') || !perms.has('SendMessages'))) {
                console.warn('[Goodbye] ⚠️ Kanal izni eksik: #' + channel.name);
                return false;
            }

            const payload = {};

            if (g?.embed?.enabled === false) {
                payload.content = this.formatMessage(g?.message || 'Güle güle {user}!', member);
            } else {
                payload.embeds = [this.buildEmbed(member, client, config)];
            }

            if (g?.banner?.enabled !== false && g?.embed?.enabled !== false) {
                try {
                    const buffer = await this.buildBanner(member, g?.banner || {});
                    const attachment = new AttachmentBuilder(buffer, { name: BANNER_FILE_NAME });
                    payload.files = [attachment];
                    if (payload.embeds && payload.embeds[0]) {
                        payload.embeds[0].setImage('attachment://' + BANNER_FILE_NAME);
                    }
                } catch (err) {
                    console.error('[Goodbye] ⚠️ Banner üretilemedi:', err.message);
                }
            }

            await channel.send(payload);

            const userTag = member.user?.tag || member.displayName || 'Üye';
            console.log('[Goodbye] ✅ Güle güle mesajı ve bannerı gönderildi: ' + userTag + ' -> #' + channel.name);
            return true;
        } catch (error) {
            console.error('[Goodbye] ❌ Güle güle hatası:', error);
            return false;
        }
    }
}

module.exports = new GoodbyeModule();