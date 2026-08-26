const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Kanalda belirtilen miktarda mesajı topluca siler')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Silinecek mesaj sayısı (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    async execute(interaction, client) {
        const amount = interaction.options.getInteger('amount', true);

        try {
            const deleted = await interaction.channel.bulkDelete(amount, true);
            await interaction.reply({
                content: `🧹 Başarıyla **${deleted.size}** adet mesaj silindi.`,
                ephemeral: true
            });
        } catch (error) {
            console.error('[Command Clear] Hata:', error);
            await interaction.reply({
                content: '⚠️ Mesajlar silinirken bir hata oluştu. (14 günden eski mesajlar Discord API kısıtlaması nedeniyle toplu silinemez).',
                ephemeral: true
            });
        }
    }
};
