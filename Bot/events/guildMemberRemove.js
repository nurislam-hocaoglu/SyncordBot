const { Events, EmbedBuilder } = require('discord.js');
const GuildConfig = require('../src/models/GuildConfig');
const logging = require('../src/modules/logging');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member, client) {
        try {
            // 1. Loglama
            await logging.logMemberLeave(member);

            // 2. Güle Güle Mesajı
            const config = await GuildConfig.findOne({ guildId: member.guild.id });
            if (config?.goodbye?.enabled && config?.goodbye?.channel) {
                const channel = member.guild.channels.cache.get(config.goodbye.channel);
                if (channel) {
                    const goodbyeText = (config.goodbye.message || 'Güle güle {user} 👋')
                        .replace(/{user}/g, `${member.user.tag}`)
                        .replace(/{username}/g, member.user.username)
                        .replace(/{server}/g, member.guild.name)
                        .replace(/{memberCount}/g, member.guild.memberCount);

                    if (config.goodbye.embed?.enabled !== false) {
                        const embed = new EmbedBuilder()
                            .setTitle(`👋 Güle Güle ${member.user.username}`)
                            .setDescription(goodbyeText)
                            .setColor(config.goodbye.embed?.color || '#ff4444')
                            .setFooter({ text: `${member.guild.name} • Kalan ${member.guild.memberCount} üye` })
                            .setTimestamp();

                        await channel.send({ embeds: [embed] }).catch(() => {});
                    } else {
                        await channel.send({ content: goodbyeText }).catch(() => {});
                    }
                }
            }
        } catch (error) {
            console.error('[Event GuildMemberRemove] Hata:', error);
        }
    }
};
