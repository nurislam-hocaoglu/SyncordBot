const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const UserLevel = require('../../src/models/UserLevel');
const { renderCard } = require('../../src/utils/cardRenderer');

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

            // Ses süresi formatlama
            const vt = userRankData.voiceTime || 0;
            let voiceLabel;
            if (vt < 60) voiceLabel = `${vt}sn`;
            else if (vt < 3600) voiceLabel = `${Math.floor(vt / 60)}d ${vt % 60}sn`;
            else voiceLabel = `${Math.floor(vt / 3600)}s ${Math.floor((vt % 3600) / 60)}d`;

            // Canvas Seviye Kartı — "Görsel Odaklı Tasarım" şablonu
            // (Koyu gradyan #1E1B2E → #0F0E17, yuvarlak avatar + 4px mor halka)
            const cardBuffer = await renderCard({
                avatarURL: targetUser.displayAvatarURL({ extension: 'png', size: 256 }),
                title: `${targetUser.username}`,
                subtitle: `Seviye ${userRankData.level} • Sıralama #${userRankData.rank} • ${userRankData.xp.toLocaleString('tr-TR')} XP`,
                accent: '#5865F2',
                accentSoft: '#7289DA',
                extraDraw: (ctx, m) => {
                    const barX = m.textX;
                    const barY = m.height - 46;
                    const barW = m.width - m.textX - 48;
                    const barH = 14;

                    // XP etiketleri
                    ctx.font = m.subtitleFont(14);
                    ctx.fillStyle = '#B9BBBE';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'alphabetic';
                    ctx.fillText(
                        `Sonraki seviye: ${neededForNext.toLocaleString('tr-TR')} XP`,
                        barX,
                        barY - 10
                    );
                    ctx.textAlign = 'right';
                    ctx.fillText(`%${progressPercent}`, barX + barW, barY - 10);

                    // İlerleme çubuğu arka planı
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
                    m.roundRect(barX, barY, barW, barH, barH / 2);
                    ctx.fill();

                    // Dolu kısım (mor gradyan)
                    const fillW = Math.max(barH, Math.round((barW * progressPercent) / 100));
                    const pGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
                    pGrad.addColorStop(0, '#5865F2');
                    pGrad.addColorStop(1, '#7289DA');
                    ctx.fillStyle = pGrad;
                    m.roundRect(barX, barY, fillW, barH, barH / 2);
                    ctx.fill();
                }
            });

            const cardFile = new AttachmentBuilder(cardBuffer, { name: 'rank-card.png' });

            const embed = new EmbedBuilder()
                .setTitle(`📊 Seviye Kartı - ${targetUser.username}`)
                .setColor('#5865F2')
                .setThumbnail(targetUser.displayAvatarURL({ extension: 'png', size: 256 }))
                .setImage('attachment://rank-card.png')
                .addFields(
                    { name: '🏆 Sıralama', value: `#${userRankData.rank}`, inline: true },
                    { name: '⭐ Seviye', value: `${userRankData.level}`, inline: true },
                    { name: '💬 Toplam Mesaj', value: `${userRankData.messageCount}`, inline: true },
                    { name: '✨ Mevcut XP', value: `${userRankData.xp.toLocaleString()}`, inline: true },
                    { name: '🎯 Sıradaki Seviye İçin', value: `${neededForNext.toLocaleString()} XP`, inline: true },
                    { name: '🎙️ Ses Süresi', value: voiceLabel, inline: true },
                    { name: '📈 Toplam XP', value: `${userRankData.totalXP.toLocaleString()}`, inline: true }
                )
                .setFooter({ text: 'Syncord | Seviye Kartı' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], files: [cardFile] });
        } catch (error) {
            console.error('[Command Rank] Hata:', error);
            await interaction.reply({ content: '⚠️ Seviye bilgileri yüklenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
