// src/modules/welcome/index.js
/**
 * Syncord — Karşılama Modülü
 * Canvas tabanlı dinamik karşılama banner'ı (800x300 px)
 * + Discord Embed şablonu
 */

const { AttachmentBuilder, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');
const { renderCard } = require('../../utils/cardRenderer');

const BANNER_FILE_NAME = 'welcome-banner.png';

// Çift gönderim koruması (guildId:userId → true)
const recentlySent = new Set();

class WelcomeModule {
    async buildBanner(member, options = {}) {
        const username = member.user?.username || member.displayName || 'Üye';
        const serverName = member.guild?.name || 'Sunucu';
        const memberCount = (member.guild?.memberCount ?? 1).toLocaleString('tr-TR');
        const avatarURL = member.user?.displayAvatarURL?.({ extension: 'png', size: 256 });

        return renderCard({
            width: options.width,
            height: options.height,
            avatarURL,
            title: 'HOŞ GELDİN, ' + username + '!',
            subtitle: 'Seninle birlikte ' + serverName + ' topluluğu ' + memberCount + ' kişiye ulaştı!'
        });
    }

    buildEmbed(member, client, config) {
        const guild = member.guild;
        const eCfg = config?.welcome?.embed || {};

        const rulesCh = eCfg.rulesChannel ? guild.channels.cache.get(eCfg.rulesChannel) : null;
        const chatCh  = eCfg.chatChannel  ? guild.channels.cache.get(eCfg.chatChannel)  : null;
        const roleCh  = eCfg.roleChannel  ? guild.channels.cache.get(eCfg.roleChannel)  : null;

        const lines = ['Selam ' + member.toString() + ', **' + guild.name + '** sunucusuna hoş geldin!'];

        if (rulesCh) lines.push('', '📜 Kuralları gözden geçirmek için: <#' + rulesCh.id + '>');
        if (chatCh)  lines.push('💬 Sohbet etmek için: <#' + chatCh.id + '>');
        if (roleCh)  lines.push('🎭 Rollerini almak için: <#' + roleCh.id + '>');
        if (!rulesCh && !chatCh && !roleCh) {
            lines.push('', '💬 Sohbet kanallarımızda kendini tanıtabilirsin!');
        }

        const embed = new EmbedBuilder()
            .setTitle(eCfg.title || 'Aramıza Katıldı! 🎉')
            .setDescription(lines.join('\n'))
            .setColor(eCfg.color || '#5865F2')
            .setFooter({
                text: 'Syncord | Üye #' + guild.memberCount,
                iconURL: client.user.displayAvatarURL({ extension: 'png', size: 64 })
            })
            .setTimestamp();

        if (eCfg.thumbnail !== false) {
            embed.setThumbnail(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        }

        return embed;
    }

    formatMessage(template, member) {
        return template
            .replace(/{user}/g, member.toString())
            .replace(/{username}/g, member.user.username)
            .replace(/{server}/g, member.guild.name)
            .replace(/{memberCount}/g, String(member.guild.memberCount));
    }

    async sendWelcome(member, client) {
        const guild = member.guild;

        const dedupeKey = guild.id + ':' + member.id;
        if (recentlySent.has(dedupeKey)) {
            console.warn('[Welcome] Mükerrer engellendi: ' + member.user.tag);
            return false;
        }
        recentlySent.add(dedupeKey);
        setTimeout(() => recentlySent.delete(dedupeKey), 10000);

        try {
            const config = await GuildConfig.findOne({ guildId: guild.id }).catch(() => null);
            const w = config?.welcome;

            if (!w?.enabled || !w.channel) return false;

            const channel = guild.channels.cache.get(w.channel);
            if (!channel || typeof channel.isTextBased !== 'function' || !channel.isTextBased()) return false;

            const perms = channel.permissionsFor(guild.members.me);
            if (perms && (!perms.has('ViewChannel') || !perms.has('SendMessages'))) {
                console.warn('[Welcome] Kanal izni eksik: #' + channel.name);
                return false;
            }

            const payload = {};

            if (w.embed?.enabled === false) {
                payload.content = member.toString() + '\n' + this.formatMessage(w.message || 'Hoş geldin!', member);
            } else {
                payload.content = member.toString();
                payload.embeds = [this.buildEmbed(member, client, config)];
            }

            if (w.banner?.enabled !== false && w.embed?.enabled !== false) {
                try {
                    const buffer = await this.buildBanner(member, w.banner || {});
                    const attachment = new AttachmentBuilder(buffer, { name: BANNER_FILE_NAME });
                    payload.files = [attachment];
                    payload.embeds[0].setImage('attachment://' + BANNER_FILE_NAME);
                } catch (err) {
                    console.error('[Welcome] Banner üretilemedi:', err.message);
                }
            }

            await channel.send(payload);

            if (w.dmMessage) {
                await member.send(this.formatMessage(w.dmMessage, member)).catch(() => {});
            }

            console.log('[Welcome] Karşılama gönderildi: ' + member.user.tag + ' -> #' + channel.name);
            return true;
        } catch (error) {
            console.error('[Welcome] Karşılama hatası:', error);
            return false;
        }
    }
}

module.exports = new WelcomeModule();