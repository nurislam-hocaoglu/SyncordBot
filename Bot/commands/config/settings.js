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
        } catch (error) {
            console.error('[Command Settings] Hata:', error);
            await interaction.reply({ content: '⚠️ Ayarlar işlenirken bir hata oluştu.', ephemeral: true });
        }
    }
};
