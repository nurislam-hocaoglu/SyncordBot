const { Events } = require('discord.js');
const ticketModule = require('../src/modules/ticket');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        // 1. Slash komutları
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
            return;
        }

        // 2. Buton Etkileşimleri
        if (interaction.isButton()) {
            if (interaction.customId.startsWith('ticket_')) {
                try {
                    await ticketModule.handleButton(interaction, client);
                } catch (error) {
                    console.error('[Button Error] Ticket:', error);
                    const errorPayload = {
                        content: '❌ Buton işlemi sırasında bir hata oluştu.',
                        ephemeral: true
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorPayload).catch(() => {});
                    } else {
                        await interaction.reply(errorPayload).catch(() => {});
                    }
                }
            }
            return;
        }

        // 3. Açılır Menü (Select Menu) Etkileşimleri
        if (interaction.isStringSelectMenu()) {
            if (interaction.customId.startsWith('ticket_')) {
                try {
                    await ticketModule.handleSelectMenu(interaction, client);
                } catch (error) {
                    console.error('[Select Menu Error] Ticket:', error);
                    const errorPayload = {
                        content: '❌ Menü seçimi sırasında bir hata oluştu.',
                        ephemeral: true
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorPayload).catch(() => {});
                    } else {
                        await interaction.reply(errorPayload).catch(() => {});
                    }
                }
            }
            return;
        }

        // 4. Modal Gönderim Etkileşimleri
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('ticket_')) {
                try {
                    await ticketModule.handleModalSubmit(interaction, client);
                } catch (error) {
                    console.error('[Modal Error] Ticket:', error);
                    const errorPayload = {
                        content: '❌ Form gönderilirken bir hata oluştu.',
                        ephemeral: true
                    };
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(errorPayload).catch(() => {});
                    } else {
                        await interaction.reply(errorPayload).catch(() => {});
                    }
                }
            }
            return;
        }
    }
};
