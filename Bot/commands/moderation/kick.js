const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Bir üyeyi sunucudan atar')
        .addUserOption(option =>
            option.setName('target')
                .setDescription('Atılacak üye')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Atılma sebebi')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    async execute(interaction, client) {
        const targetUser = interaction.options.getUser('target', true);
        const reason = interaction.options.getString('reason') || 'Sebep belirtilmedi';
        const member = interaction.guild.members.cache.get(targetUser.id);

        if (!member) {
            return interaction.reply({ content: '⚠️ Belirtilen kullanıcı sunucuda bulunamadı.', ephemeral: true });
        }

        if (!member.kickable) {
            return interaction.reply({ content: '❌ Bu üyeyi atma yetkim yok (Rolü benden yüksek veya eşit olabilir).', ephemeral: true });
        }

        try {
            // Kullanıcıya DM göndermeyi dene
            await targetUser.send(`⚠️ **${interaction.guild.name}** sunucusundan atıldınız. Sebep: ${reason}`).catch(() => {});
            
            await member.kick(`${interaction.user.tag}: ${reason}`);

            const embed = new EmbedBuilder()
                .setTitle('👢 Üye Atıldı')
                .setColor('#e67e22')
                .addFields(
                    { name: 'Atılan Üye', value: `${targetUser.tag} (${targetUser.id})`, inline: true },
                    { name: 'Yetkili', value: `${interaction.user.tag}`, inline: true },
                    { name: 'Sebep', value: reason, inline: false }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            console.error('[Command Kick] Hata:', error);
            await interaction.reply({ content: '⚠️ Üye atılırken bir hata meydana geldi.', ephemeral: true });
        }
    }
};
