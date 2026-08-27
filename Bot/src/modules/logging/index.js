// src/modules/logging/index.js
const { EmbedBuilder } = require('discord.js');
const GuildConfig = require('../../models/GuildConfig');

class LoggingModule {
    /**
     * Sunucunun ilgili log kanalını getirir
     */
    async getLogChannel(guild, logType = 'general') {
        try {
            const config = await GuildConfig.findOne({ guildId: guild.id });
            if (!config || !config.logging || !config.logging.enabled) return null;

            let channelId = null;
            if (config.logging.channels && config.logging.channels.get) {
                channelId = config.logging.channels.get(logType);
            } else if (config.logging.channels && config.logging.channels[logType]) {
                channelId = config.logging.channels[logType];
            }

            // Özel kanal yoksa ana log kanalını kullan
            if (!channelId) {
                channelId = config.logging.channel;
            }

            if (!channelId) return null;
            return guild.channels.cache.get(channelId) || null;
        } catch (e) {
            return null;
        }
    }

    /**
     * Üye katıldığında loglar
     */
    async logMemberJoin(member) {
        const channel = await this.getLogChannel(member.guild, 'joins');
        if (!channel) return;

        // Karşılama (welcome) kanalı ile aynı kanalsa mükerrer mesajı engelle
        const config = await GuildConfig.findOne({ guildId: member.guild.id }).catch(() => null);
        if (config?.welcome?.enabled && config?.welcome?.channel === channel.id) {
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📥 Üye Katıldı')
            .setColor('#2ecc71')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Kullanıcı', value: `${member.user.tag}`, inline: true },
                { name: 'Hesap Oluşturulma', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
                { name: 'Toplam Üye', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
    }

    /**
     * Üye ayrıldığında loglar
     */
    async logMemberLeave(member) {
        const channel = await this.getLogChannel(member.guild, 'leaves');
        if (!channel) return;

        // Uğurlama (goodbye) kanalı ile aynı kanalsa mükerrer mesajı engelle
        const config = await GuildConfig.findOne({ guildId: member.guild.id }).catch(() => null);
        if (config?.goodbye?.enabled && config?.goodbye?.channel === channel.id) {
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('📤 Üye Ayrıldı')
            .setColor('#e74c3c')
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: 'Kullanıcı', value: `${member.user.tag}`, inline: true },
                { name: 'Toplam Üye', value: `${member.guild.memberCount}`, inline: true }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
    }

    /**
     * Silinen mesajı loglar
     */
    async logMessageDelete(message) {
        if (!message.guild || message.author?.bot) return;
        const channel = await this.getLogChannel(message.guild, 'messages');
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('🗑️ Mesaj Silindi')
            .setColor('#e67e22')
            .addFields(
                { name: 'Yazar', value: `${message.author?.tag || 'Bilinmiyor'}`, inline: true },
                { name: 'Kanal', value: `${message.channel}`, inline: true },
                { name: 'İçerik', value: message.content?.substring(0, 1000) || '*İçerik okunamadı veya medya*', inline: false }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
    }

    /**
     * Düzenlenen mesajı loglar
     */
    async logMessageUpdate(oldMessage, newMessage) {
        if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
        const channel = await this.getLogChannel(newMessage.guild, 'messages');
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle('✏️ Mesaj Düzenlendi')
            .setColor('#3498db')
            .addFields(
                { name: 'Yazar', value: `${newMessage.author?.tag}`, inline: true },
                { name: 'Kanal', value: `${newMessage.channel}`, inline: true },
                { name: 'Eski İçerik', value: oldMessage.content?.substring(0, 500) || '*Boş*', inline: false },
                { name: 'Yeni İçerik', value: newMessage.content?.substring(0, 500) || '*Boş*', inline: false }
            )
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(() => {});
    }
}

module.exports = new LoggingModule();
