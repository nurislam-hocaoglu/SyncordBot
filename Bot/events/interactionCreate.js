const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        // Slash komutları
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);

            if (!command) {
                console.warn(`[Interaction] ⚠️ Kayıtlı olmayan komut: ${interaction.commandName}`);
                return interaction.reply({
                    content: '⚠️ Bu komut bot sisteminde bulunamadı veya henüz yüklenmedi.',
                    ephemeral: true
                });
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(`[Interaction Error] ${interaction.commandName}:`, error);

                const errorPayload = {
                    content: '❌ Bu komut çalıştırılırken beklenmeyen bir hata oluştu.',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorPayload).catch(() => {});
                } else {
                    await interaction.reply(errorPayload).catch(() => {});
                }
            }
        }
    }
};
