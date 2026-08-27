const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { reloadCommand } = require('../../src/handlers/commandHandler');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Belirtilen komutu botu yeniden başlatmadan (Hot-Reload) günceller')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Yeniden yüklenecek komut adı (örn: ping, help, rank)')
                .setRequired(true)
        ),
    async execute(interaction, client) {
        const commandName = interaction.options.getString('command', true).toLowerCase();

        try {
            const success = await reloadCommand(client, commandName);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('🔄 Komut Yeniden Yüklendi (Hot-Reload)')
                    .setDescription(`\`/${commandName}\` komutu başarıyla belleğe yeniden yüklendi ve güncellendi!`)
                    .setColor('#2ecc71')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                return interaction.reply({
                    content: `❌ \`${commandName}\` adında bir komut dosyası bulunamadı.`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('[Command Reload] Hata:', error);
            return interaction.reply({
                content: `⚠️ Komut yeniden yüklenirken hata oluştu: \`${error.message}\``,
                ephemeral: true
            });
        }
    }
};

