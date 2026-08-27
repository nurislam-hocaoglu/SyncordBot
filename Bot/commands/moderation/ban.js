const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bir üyeyi sunucudan yasaklar')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Yasaklanacak üye')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Yasaklama sebebi')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
        const member = interaction.guild.members.cache.get(targetUser.id);

        if (member && !member.bannable) {
            return interaction.reply({ content: '❌ Bu üyeyi yasaklama yetkim yok (Rolü benden yüksek veya eşit olabilir).', ephemeral: true });
        }

        try {
            await targetUser.send(`🚫 **${interaction.guild.name}** sunucusundan yasaklandınız. Sebep: ${reason}`).catch(() => {});
            
            await interaction.guild.bans.create(targetUser.id, { reason: `${interaction.user.tag}: ${reason}` });

            const embed = new EmbedBuilder()
                .setTitle('🔨 Üye Yasaklandı')
                .setColor('#c0392b')
                .addFields(
                    { name: 'Yasaklanan Üye', value: `${targetUser.tag}`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Command Ban] Hata:', error);
            await interaction.reply({ content: '⚠️ Üye yasaklanırken bir hata meydana geldi.', ephemeral: true });
        }
    }
};
