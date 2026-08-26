const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../src/models/GuildConfig');
const logging = require('../src/modules/logging');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        try {
            // 1. Loglama
            await logging.logMemberJoin(member);

            // 2. Sunucu Ayarları
            const config = await GuildConfig.findOne({ guildId: member.guild.id });
            if (!config) return;

            // Otomatik Rol Verme
            if (config.welcome?.autoRole) {
                const role = member.guild.roles.cache.get(config.welcome.autoRole);
                if (role) {
                    await member.roles.add(role).catch(err => {
                        console.error('[Welcome] Otomatik rol hatası:', err.message);
                    });
                }
            }

            // Hoş Geldin Mesajı
            if (config.welcome?.enabled && config.welcome?.channel) {
                const channel = member.guild.channels.cache.get(config.welcome.channel);
                if (channel) {
                    const welcomeText = (config.welcome.message || 'Hoş geldin {user}! 🎉')
                        .replace(/{user}/g, `${member}`)
                        .replace(/{username}/g, member.user.username)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{memberCount}/g, member.guild.memberCount);

                    if (config.welcome.embed?.enabled !== false) {
                        const embed = new EmbedBuilder()
                            .setTitle(`🎉 Hoş Geldin ${member.user.username}!`)
                            .setDescription(welcomeText)
                            .setColor(config.welcome.embed?.color || '#00ff00')
                            .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
                            .setFooter({ text: `${member.guild.name} • Toplam ${member.guild.memberCount} üye` })
                            .setTimestamp();

                        await channel.send({ embeds: [embed] }).catch(() => {});
                    } else {
                        await channel.send({ content: welcomeText }).catch(() => {});
                    }
                }
            }
        } catch (error) {
            console.error('[Event GuildMemberAdd] Hata:', error);
        }
    }
};
