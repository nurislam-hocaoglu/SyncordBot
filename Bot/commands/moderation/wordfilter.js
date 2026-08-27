const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuildConfig = require('../../src/models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wordfilter')
        .setDescription('Configure swear / bad word filter (AutoMod)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('View current word filter configuration and stats')
        )
        .addSubcommand(sub =>
            sub.setName('enable')
                .setDescription('Enable the word / profanity filter')
                .addStringOption(opt =>
                    opt.setName('action')
                        .setDescription('Action to take on violation (Default: delete & warn)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'Delete Message & Warn (Default)', value: 'delete' },
                            { name: 'Timeout Member & Delete', value: 'timeout' },
                            { name: 'Warn Only in Channel', value: 'warn' }
                        )
                )
                .addIntegerOption(opt =>
                    opt.setName('timeout_threshold')
                        .setDescription('Number of violations before timeout (Default: 3, 0 to disable)')
                        .setMinValue(0)
                        .setMaxValue(20)
                        .setRequired(false)
                )
                .addIntegerOption(opt =>
                    opt.setName('timeout_duration')
                        .setDescription('Timeout duration in minutes (Default: 5 mins)')
                        .setMinValue(1)
                        .setMaxValue(1440)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('log_channel')
                        .setDescription('Channel where filter violation logs will be sent')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable the word / profanity filter')
        )
        .addSubcommandGroup(group =>
            group.setName('custom')
                .setDescription('Manage server-specific banned words')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a custom word to the banned list')
                        .addStringOption(opt =>
                            opt.setName('word')
                                .setDescription('The word to ban (case-insensitive)')
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a custom word from the banned list')
                        .addStringOption(opt =>
                            opt.setName('word')
                                .setDescription('The word to remove')
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all server-specific banned words')
                )
        )
        .addSubcommandGroup(group =>
            group.setName('whitelist')
                .setDescription('Manage whitelist to prevent false positives')
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a word to whitelist (will never be blocked)')
                        .addStringOption(opt =>
                            opt.setName('word')
                                .setDescription('The word to whitelist')
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a word from whitelist')
                        .addStringOption(opt =>
                            opt.setName('word')
                                .setDescription('The word to remove')
                                .setRequired(true)
                        )
                )
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all whitelisted words')
                )
        ),

    async execute(interaction, client) {
        const group = interaction.options.getSubcommandGroup(false);
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            let config = await GuildConfig.findOne({ guildId });
            if (!config) {
                config = new GuildConfig({ guildId });
            }

            if (!config.automod) {
                config.automod = { enabled: true, filters: new Map(), wordFilter: {} };
            }

            if (!config.automod.wordFilter) {
                config.automod.wordFilter = {
                    enabled: false,
                    action: 'delete',
                    timeoutThreshold: 3,
                    timeoutDuration: 300,
                    logChannel: null,
                    bannedWords: [],
                    whitelist: [],
                    notifyInChannel: true,
                    notifyViaDM: false
                };
            }

            const wf = config.automod.wordFilter;

            // 1. Status View (Durum Görüntüleme)
            if (subcommand === 'status') {
                const actionNames = {
                    delete: '🗑️ Mesajı Sil & Uyar',
                    timeout: '⏳ Sustur (Timeout) & Mesajı Sil',
                    warn: '⚠️ Sadece Kanalda Uyar'
                };

                const embed = new EmbedBuilder()
                    .setTitle(`🛡️ Küfür & Kelime Filtresi — ${interaction.guild.name}`)
                    .setColor(wf.enabled ? '#2ecc71' : '#e74c3c')
                    .addFields(
                        {
                            name: 'Durum',
                            value: wf.enabled ? '✅ **Aktif (Açık)**' : '❌ **Devre Dışı (Kapalı)**',
                            inline: true
                        },
                        {
                            name: 'Uygulanan Eylem',
                            value: actionNames[wf.action] || wf.action || 'Mesajı Sil',
                            inline: true
                        },
                        {
                            name: 'Log Kanalı',
                            value: wf.logChannel ? `<#${wf.logChannel}>` : (config.automod.logChannel ? `<#${config.automod.logChannel}> *(Genel AutoMod)*` : '*Ayarlanmadı*'),
                            inline: true
                        },
                        {
                            name: 'Kademeli Ceza (Susturma)',
                            value: wf.timeoutThreshold > 0 
                                ? `• **${wf.timeoutThreshold}** ihlalden sonra susturur\n• Süre: **${Math.ceil((wf.timeoutDuration || 300) / 60)} dakika**`
                                : '• Devre Dışı (Otomatik susturma kapalı)',
                            inline: false
                        },
                        {
                            name: 'Sunucuya Özel Yasaklı Kelimeler',
                            value: wf.bannedWords && wf.bannedWords.length > 0 
                                ? `\`${wf.bannedWords.slice(0, 15).join('`, `')}\`${wf.bannedWords.length > 15 ? ` *(+${wf.bannedWords.length - 15} kelime daha)*` : ''}`
                                : '*Eklenmedi (Sadece Global Liste aktif)*',
                            inline: false
                        },
                        {
                            name: 'Beyaz Liste (İstisnalar)',
                            value: wf.whitelist && wf.whitelist.length > 0 
                                ? `\`${wf.whitelist.slice(0, 15).join('`, `')}\`${wf.whitelist.length > 15 ? ` *(+${wf.whitelist.length - 15} kelime daha)*` : ''}`
                                : '*Yok*',
                            inline: false
                        }
                    )
                    .setFooter({ text: 'Açmak veya yapılandırmak için /wordfilter enable kullanabilirsiniz.' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // 2. Enable Filter (Filtreyi Açma)
            if (subcommand === 'enable') {
                const action = interaction.options.getString('action');
                const threshold = interaction.options.getInteger('timeout_threshold');
                const duration = interaction.options.getInteger('timeout_duration');
                const logChannel = interaction.options.getChannel('log_channel');

                config.automod.enabled = true;
                wf.enabled = true;

                if (action) wf.action = action;
                if (threshold !== null) wf.timeoutThreshold = threshold;
                if (duration !== null) wf.timeoutDuration = duration * 60; // saniyeye çevir
                if (logChannel) wf.logChannel = logChannel.id;

                await config.save();

                const actionDisplay = {
                    delete: 'Mesajı Sil & Uyar',
                    timeout: 'Sustur & Mesajı Sil',
                    warn: 'Sadece Uyar'
                };

                const embed = new EmbedBuilder()
                    .setTitle('✅ Küfür & Kelime Filtresi Aktifleştirildi')
                    .setColor('#2ecc71')
                    .setDescription('Sunucuda küfür ve yasaklı kelime koruması başarıyla devreye alındı!')
                    .addFields(
                        { name: 'Eylem', value: `\`${actionDisplay[wf.action] || wf.action}\``, inline: true },
                        { name: 'Susturma Eşiği', value: wf.timeoutThreshold > 0 ? `\`${wf.timeoutThreshold} ihlal\`` : '`Kapalı`', inline: true },
                        { name: 'Susturma Süresi', value: `\`${Math.ceil((wf.timeoutDuration || 300) / 60)} dakika\``, inline: true },
                        { name: 'Log Kanalı', value: wf.logChannel ? `<#${wf.logChannel}>` : '*Ayarlanmadı*', inline: true }
                    )
                    .setTimestamp();

                return interaction.reply({ embeds: [embed] });
            }

            // 3. Disable Filter (Filtreyi Kapatma)
            if (subcommand === 'disable') {
                wf.enabled = false;
                await config.save();

                return interaction.reply({
                    content: '🛑 **Küfür & Kelime Filtresi kapatıldı.** Artık mesajlar taranmayacak.',
                    ephemeral: true
                });
            }

            // 4. Custom Banned Words Group (Özel Yasaklı Kelimeler)
            if (group === 'custom') {
                if (subcommand === 'add') {
                    const word = interaction.options.getString('word', true).toLowerCase().trim();

                    if (!wf.bannedWords) wf.bannedWords = [];

                    if (wf.bannedWords.includes(word)) {
                        return interaction.reply({
                            content: `⚠️ \`${word}\` kelimesi zaten sunucu yasaklı kelime listesinde ekli.`,
                            ephemeral: true
                        });
                    }

                    wf.bannedWords.push(word);
                    await config.save();

                    return interaction.reply({
                        content: `✅ \`${word}\` kelimesi sunucu yasaklı listesine eklendi.`,
                        ephemeral: true
                    });
                }

                if (subcommand === 'remove') {
                    const word = interaction.options.getString('word', true).toLowerCase().trim();

                    if (!wf.bannedWords || !wf.bannedWords.includes(word)) {
                        return interaction.reply({
                            content: `⚠️ \`${word}\` kelimesi sunucunun yasaklı listesinde bulunamadı.`,
                            ephemeral: true
                        });
                    }

                    wf.bannedWords = wf.bannedWords.filter(w => w !== word);
                    await config.save();

                    return interaction.reply({
                        content: `✅ \`${word}\` kelimesi sunucu yasaklı listesinden kaldırıldı.`,
                        ephemeral: true
                    });
                }

                if (subcommand === 'list') {
                    const words = wf.bannedWords || [];
                    if (words.length === 0) {
                        return interaction.reply({
                            content: 'ℹ️ Henüz sunucuya özel yasaklı kelime eklenmemiş. (Filtre açıkken Global Liste devrededir)',
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        content: `📋 **Sunucuya Özel Yasaklı Kelimeler (${words.length}):**\n\`${words.join('`, `')}\``,
                        ephemeral: true
                    });
                }
            }

            // 5. Whitelist Group (Beyaz Liste / İstisnalar)
            if (group === 'whitelist') {
                if (subcommand === 'add') {
                    const word = interaction.options.getString('word', true).toLowerCase().trim();

                    if (!wf.whitelist) wf.whitelist = [];

                    if (wf.whitelist.includes(word)) {
                        return interaction.reply({
                            content: `⚠️ \`${word}\` kelimesi zaten beyaz listede mevcut.`,
                            ephemeral: true
                        });
                    }

                    wf.whitelist.push(word);
                    await config.save();

                    return interaction.reply({
                        content: `✅ \`${word}\` kelimesi beyaz listeye eklendi (artık asla engellenmeyecek).`,
                        ephemeral: true
                    });
                }

                if (subcommand === 'remove') {
                    const word = interaction.options.getString('word', true).toLowerCase().trim();

                    if (!wf.whitelist || !wf.whitelist.includes(word)) {
                        return interaction.reply({
                            content: `⚠️ \`${word}\` kelimesi beyaz listede bulunamadı.`,
                            ephemeral: true
                        });
                    }

                    wf.whitelist = wf.whitelist.filter(w => w !== word);
                    await config.save();

                    return interaction.reply({
                        content: `✅ \`${word}\` kelimesi beyaz listeden kaldırıldı.`,
                        ephemeral: true
                    });
                }

                if (subcommand === 'list') {
                    const list = wf.whitelist || [];
                    if (list.length === 0) {
                        return interaction.reply({
                            content: 'ℹ️ Bu sunucu için tanımlanmış beyaz liste kelimesi yok.',
                            ephemeral: true
                        });
                    }

                    return interaction.reply({
                        content: `📋 **Beyaz Listedeki Kelimeler (${list.length}):**\n\`${list.join('`, `')}\``,
                        ephemeral: true
                    });
                }
            }
        } catch (error) {
            console.error('[Command WordFilter] Hata:', error);
            return interaction.reply({
                content: '⚠️ Kelime filtresi komutu işlenirken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};

