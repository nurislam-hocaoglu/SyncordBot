const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserLevel = require('../../src/models/UserLevel');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Kullanıcının seviye, XP ve sıralama kartını görüntüler')
        .addUserOption(option => 
            option.setName('user')
                .setDescription('Seviyesine bakılacak kullanıcı (Belirtilmezse kendiniz)')
                .setRequired(false)
        ),
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const guildId = interaction.guild.id;

        try {
            const userRankData = await UserLevel.getUserRank(guildId, targetUser.id);

            if (!userRankData) {
                return interaction.reply({
                    content: `ℹ️ **${targetUser.tag}** henüz bu sunucuda hiç mesaj atmamış ve XP kazanmamış.`,
                    ephemeral: true
                });
            }

            const currentLevelXP = Math.pow(userRankData.level / 0.1, 2);
            const nextLevelXP = Math.pow((userRankData.level + 1) / 0.1, 2);
            const neededForNext = Math.max(0, Math.floor(nextLevelXP - userRankData.xp));
            const progress = userRankData.xp - currentLevelXP;
            const levelSpan = nextLevelXP - currentLevelXP;
            const progressPercent = Math.min(100, Math.max(0, Math.floor((progress / levelSpan) * 100)));

            // Basit ASCII ilerleme çubuğu
            const totalBars = 10;
            const filledBars = Math.round((progressPercent / 100) * totalBars);
            const progressBar = '█'.repeat(filledBars) + '░'.repeat(Math.max(0, totalBars - filledBars));

            const embed = new EmbedBuilder()
                .setTitle(`📊 Seviye Kartı - ${targetUser.username}`)
                .setColor('#3498db')
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    { name: '🏆 Sıralama', value: `#${userRankData.rank}`, inline: true },
                    { name: '⭐ Seviye', value: `${userRankData.level}`, inline: true },
                    { name: '💬 Toplam Mesaj', value: `${userRankData.messageCount}`, inline: true },
                    { name: '✨ Mevcut XP', value: `${userRankData.xp.toLocaleString()}`, inline: true },
                    { name: '🎯 Sıradaki Seviye İçin', value: `${neededForNext.toLocaleString()} XP`, inline: true },
                    { name: '📈 Toplam XP', value: `${userRankData.totalXP.toLocaleString()}`, inline: true },
                    { name: `İlerleme (%${progressPercent})`, value: `\`[${progressBar}]\``, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Command Rank] Hata:', error);
            await interaction.reply({ content: '⚠️ Seviye bilgileri yüklenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
