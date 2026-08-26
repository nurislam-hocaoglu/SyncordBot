const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserLevel = require('../../src/models/UserLevel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('Sunucudaki en yüksek seviyeli üyelerin sıralamasını gösterir'),
    async execute(interaction, client) {
        const guildId = interaction.guild.id;

        try {
            const topUsers = await UserLevel.getLeaderboard(guildId, 10);

            if (!topUsers || topUsers.length === 0) {
                return interaction.reply({
                    content: 'ℹ️ Bu sunucuda henüz sıralamaya girecek seviye verisi bulunmuyor.',
                    ephemeral: true
                });
            }

            const medals = ['🥇', '🥈', '🥉'];
            let description = '';

            for (let i = 0; i < topUsers.length; i++) {
                const u = topUsers[i];
                const medal = medals[i] || `**#${i + 1}**`;
                description += `${medal} <@${u.userId}> — **Level ${u.level}** (${u.totalXP.toLocaleString()} XP, ${u.messageCount} Mesaj)\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🏆 ${interaction.guild.name} Seviye Sıralaması`)
                .setColor('#f1c40f')
                .setDescription(description)
                .setFooter({ text: `${interaction.guild.name} • Top 10 Üye` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Command Leaderboard] Hata:', error);
            await interaction.reply({ content: '⚠️ Sıralama tablosu yüklenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
