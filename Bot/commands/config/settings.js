const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../../src/models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDescription('Sunucu yapılandırmasını görüntüler veya değiştirir')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(sub =>
            sub.setName('view')
                .setDescription('Mevcut sunucu ayarlarını görüntüler')
        )
        .addSubcommand(sub =>
            sub.setName('automod')
                .setDescription('AutoMod korumasını açar/kapatır')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('AutoMod aktif olsun mu?')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('log_channel')
                        .setDescription('AutoMod bildirim kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('leveling')
                .setDescription('Seviye sistemini açar/kapatır')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Seviye sistemi aktif olsun mu?')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Seviye atlama bildirim kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('logging')
                .setDescription('Genel log kanalını ayarlar')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Loglama aktif olsun mu?')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Log kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('welcome')
                .setDescription('Hoş geldin sistemini yapılandırır (banner + embed)')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Karşılama sistemi aktif olsun mu?')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Karşılama mesajının atılacağı kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('banner')
                        .setDescription('Canvas karşılama görseli gönderilsin mi?')
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('rules_channel')
                        .setDescription('📜 Kurallar kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('chat_channel')
                        .setDescription('💬 Genel sohbet kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('role_channel')
                        .setDescription('🎭 Rol seçim kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('autorole')
                        .setDescription('Yeni üyeye otomatik verilecek rol')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('goodbye')
                .setDescription('Ayrılma sistemini yapılandırır (banner + embed)')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Güle güle sistemi aktif olsun mu?')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Güle güle mesajının atılacağı kanal')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('banner')
                        .setDescription('Canvas ayrılma görseli gönderilsin mi?')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('ticket')
                .setDescription('Destek & Bilet sistemini yapılandırır')
                .addBooleanOption(opt =>
                    opt.setName('enabled')
                        .setDescription('Bilet sistemi aktif olsun mu?')
                        .setRequired(true)
                )
                .addChannelOption(opt =>
                    opt.setName('category')
                        .setDescription('Açılan biletlerin toplanacağı kategori')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('log_channel')
                        .setDescription('Bilet log kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('staff_role')
                        .setDescription('Destek yetkilisi rolü')
                        .setRequired(false)
                )
        ),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId });
            }

            if (subcommand === 'view') {
                const embed = new EmbedBuilder()
                    .setTitle(`⚙️ ${interaction.guild.name} Yapılandırması`)
                    .setColor('#34495e')
                    .addFields(
                        {
                            name: '🛡️ AutoMod',
                            value: `• Durum: ${config.automod?.enabled ? '✅ Açık' : '❌ Kapalı'}\n• Log Kanalı: ${config.automod?.logChannel ? `<#${config.automod.logChannel}>` : '*Ayarlanmadı*'}`,
                            inline: false
                        },
                        {
                            name: '🆙 Seviye Sistemi (Leveling)',
                            value: `• Durum: ${config.leveling?.enabled ? '✅ Açık' : '❌ Kapalı'}\n• Bildirim Kanalı: ${config.leveling?.levelUpChannel ? `<#${config.leveling.levelUpChannel}>` : '*Mevcut Kanal*'}\n• Mesaj Başı XP: \`${config.leveling?.xpPerMessage || 20}\``,
                            inline: false
                        },
                        {
                            name: '📋 Loglama (Logging)',
                            value: `• Durum: ${config.logging?.enabled ? '✅ Açık' : '❌ Kapalı'}\n• Ana Kanal: ${config.logging?.channel ? `<#${config.logging.channel}>` : '*Ayarlanmadı*'}`,
                            inline: false
                        },
                        {
                            name: '👋 Karşılama (Welcome)',
                            value: `• Durum: ${config.welcome?.enabled ? '✅ Açık' : '❌ Kapalı'}\n` +
                                `• Kanal: ${config.welcome?.channel ? `<#${config.welcome.channel}>` : '*Ayarlanmadı*'}\n` +
                                `• Banner: ${config.welcome?.banner?.enabled !== false ? '✅ Açık' : '❌ Kapalı'}\n` +
                                `• 📜 Kurallar: ${config.welcome?.embed?.rulesChannel ? `<#${config.welcome.embed.rulesChannel}>` : '*Ayarlanmadı*'}\n` +
                                `• 💬 Sohbet: ${config.welcome?.embed?.chatChannel ? `<#${config.welcome.embed.chatChannel}>` : '*Ayarlanmadı*'}\n` +
                                `• 🎭 Rol Seçim: ${config.welcome?.embed?.roleChannel ? `<#${config.welcome.embed.roleChannel}>` : '*Ayarlanmadı*'}\n` +
                                `• Otomatik Rol: ${config.welcome?.autoRole ? `<@&${config.welcome.autoRole}>` : '*Ayarlanmadı*'}`,
                            inline: false
                        },
                        {
                            name: '👋 Ayrılma (Goodbye)',
                            value: `• Durum: ${config.goodbye?.enabled ? '✅ Açık' : '❌ Kapalı'}\n` +
                                `• Kanal: ${config.goodbye?.channel ? `<#${config.goodbye.channel}>` : '*Ayarlanmadı*'}\n` +
                                `• Banner: ${config.goodbye?.banner?.enabled !== false ? '✅ Açık' : '❌ Kapalı'}`,
                            inline: false
                        },
                        {
                            name: '🎫 Destek & Bilet (Ticket)',
                            value: `• Durum: ${config.ticket?.enabled ? '✅ Açık' : '❌ Kapalı'}\n` +
                                `• Kategori: ${config.ticket?.category ? `<#${config.ticket.category}>` : '*Ayarlanmadı*'}\n` +
                                `• Log Kanalı: ${config.ticket?.logChannel ? `<#${config.ticket.logChannel}>` : '*Ayarlanmadı*'}\n` +
                                `• Yetkili Rolleri: ${config.ticket?.staffRoles?.length ? config.ticket.staffRoles.map(r => `<@&${r}>`).join(', ') : '*Ayarlanmadı*'}\n` +
                                `• Panel Kuralları: ${config.ticket?.panel?.showRules !== false ? '✅ Görünür' : '❌ Gizli / Silinmiş'}\n` +
                                `• Yanıt Süresi Alanı: ${config.ticket?.panel?.showResponseTime !== false ? '✅ Görünür' : '❌ Gizli / Silinmiş'}`,
                            inline: false
                        }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            if (subcommand === 'automod') {
                const enabled = interaction.options.getBoolean('enabled', true);
                const logChannel = interaction.options.getChannel('log_channel');

                config.automod.enabled = enabled;
                if (logChannel) {
                    config.automod.logChannel = logChannel.id;
                }
                await config.save();

                return interaction.reply({
                    content: `✅ AutoMod ayarları güncellendi: Durum: **${enabled ? 'Açık' : 'Kapalı'}**${logChannel ? `, Log Kanalı: <#${logChannel.id}>` : ''}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'leveling') {
                const enabled = interaction.options.getBoolean('enabled', true);
                const channel = interaction.options.getChannel('channel');

                config.leveling.enabled = enabled;
                if (channel) {
                    config.leveling.levelUpChannel = channel.id;
                }
                await config.save();

                return interaction.reply({
                    content: `✅ Seviye sistemi güncellendi: Durum: **${enabled ? 'Açık' : 'Kapalı'}**${channel ? `, Bildirim Kanalı: <#${channel.id}>` : ''}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'logging') {
                const enabled = interaction.options.getBoolean('enabled', true);
                const channel = interaction.options.getChannel('channel');

                config.logging.enabled = enabled;
                if (channel) {
                    config.logging.channel = channel.id;
                }
                await config.save();

                return interaction.reply({
                    content: `✅ Loglama ayarları güncellendi: Durum: **${enabled ? 'Açık' : 'Kapalı'}**${channel ? `, Kanal: <#${channel.id}>` : ''}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'welcome') {
                const enabled = interaction.options.getBoolean('enabled', true);
                const channel = interaction.options.getChannel('channel');
                const banner = interaction.options.getBoolean('banner');
                const rulesChannel = interaction.options.getChannel('rules_channel');
                const chatChannel = interaction.options.getChannel('chat_channel');
                const roleChannel = interaction.options.getChannel('role_channel');
                const autorole = interaction.options.getRole('autorole');

                config.welcome.enabled = enabled;
                if (channel) config.welcome.channel = channel.id;
                if (typeof banner === 'boolean') {
                    config.welcome.banner = config.welcome.banner || {};
                    config.welcome.banner.enabled = banner;
                }
                if (rulesChannel) config.welcome.embed.rulesChannel = rulesChannel.id;
                if (chatChannel) config.welcome.embed.chatChannel = chatChannel.id;
                if (roleChannel) config.welcome.embed.roleChannel = roleChannel.id;
                if (autorole) config.welcome.autoRole = autorole.id;
                await config.save();

                return interaction.reply({
                    content:
                        `✅ Karşılama sistemi güncellendi: Durum: **${enabled ? 'Açık' : 'Kapalı'}**` +
                        `${channel ? `\n• Kanal: <#${channel.id}>` : ''}` +
                        `${typeof banner === 'boolean' ? `\n• Banner: **${banner ? 'Açık' : 'Kapalı'}**` : ''}` +
                        `${rulesChannel ? `\n• 📜 Kurallar: <#${rulesChannel.id}>` : ''}` +
                        `${chatChannel ? `\n• 💬 Sohbet: <#${chatChannel.id}>` : ''}` +
                        `${roleChannel ? `\n• 🎭 Rol Seçim: <#${roleChannel.id}>` : ''}` +
                        `${autorole ? `\n• Otomatik Rol: ${autorole}` : ''}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'goodbye') {
                const enabled = interaction.options.getBoolean('enabled', true);
                const channel = interaction.options.getChannel('channel');
                const banner = interaction.options.getBoolean('banner');

                config.goodbye.enabled = enabled;
                if (channel) config.goodbye.channel = channel.id;
                if (typeof banner === 'boolean') {
                    config.goodbye.banner = config.goodbye.banner || {};
                    config.goodbye.banner.enabled = banner;
                }
                await config.save();

                return interaction.reply({
                    content:
                        `✅ Ayrılma sistemi güncellendi: Durum: **${enabled ? 'Açık' : 'Kapalı'}**` +
                        `${channel ? `\n• Kanal: <#${channel.id}>` : ''}` +
                        `${typeof banner === 'boolean' ? `\n• Banner: **${banner ? 'Açık' : 'Kapalı'}**` : ''}`,
                    ephemeral: true
                });
            }

            if (subcommand === 'ticket') {
                const enabled = interaction.options.getBoolean('enabled', true);
                const category = interaction.options.getChannel('category');
                const logChannel = interaction.options.getChannel('log_channel');
                const staffRole = interaction.options.getRole('staff_role');

                config.ticket.enabled = enabled;
                if (category) config.ticket.category = category.id;
                if (logChannel) config.ticket.logChannel = logChannel.id;
                if (staffRole) {
                    if (!config.ticket.staffRoles.includes(staffRole.id)) {
                        config.ticket.staffRoles.push(staffRole.id);
                    }
                }
                await config.save();

                return interaction.reply({
                    content:
                        `✅ Destek (Ticket) sistemi güncellendi: Durum: **${enabled ? 'Açık' : 'Kapalı'}**` +
                        `${category ? `\n• Kategori: <#${category.id}>` : ''}` +
                        `${logChannel ? `\n• Log Kanalı: <#${logChannel.id}>` : ''}` +
                        `${staffRole ? `\n• Yetkili Rolü: ${staffRole}` : ''}`,
                    ephemeral: true
                });
            }
        } catch (error) {
            console.error('[Command Settings] Hata:', error);
            await interaction.reply({ content: '⚠️ Ayarlar işlenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
