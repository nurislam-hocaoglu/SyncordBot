const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder } = require('discord.js');
const ticketModule = require('../../src/modules/ticket');
const Ticket = require('../../src/models/Ticket');
const GuildConfig = require('../../src/models/GuildConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Destek ve bilet sistemi komutları')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addSubcommand(sub =>
            sub.setName('panel')
                .setDescription('Belirtilen kanala amaca özel, özel amaçlı veya karma destek paneli gönderir')
                .addStringOption(opt =>
                    opt.setName('category')
                        .setDescription('Hazır kategori veya tümü (Özel amaç için boş bırakıp custom_name doldurabilirsiniz)')
                        .addChoices(
                            { name: '💎 VIP & Mağaza Alım Paneli (Hazır Embed)', value: 'vip' },
                            { name: '⚠️ Şikayet & Bildirim Paneli (Hazır Embed)', value: 'complaint' },
                            { name: '🤝 Yetkili & Ortaklık Başvuru Paneli (Hazır Embed)', value: 'partnership' },
                            { name: '📩 Genel Destek & Yardım Paneli (Hazır Embed)', value: 'general' },
                            { name: '🎛️ Tüm Hazır Kategorileri İçeren Karma Panel', value: 'all' }
                        )
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('custom_name')
                        .setDescription('Tamamen özel bir amaç/kategori adı (Örn: Turnuva Kaydı, Bug Raporu, İade Talebi)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('custom_emoji')
                        .setDescription('Özel panel için emoji (Örn: 🏆, 🐛, 🎨, 💳)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('custom_color')
                        .setDescription('Özel panel Embed rengi Hex kodu (Örn: #FFAA00 veya #9B59B6)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('question1')
                        .setDescription('Formda kullanıcıya sorulacak 1. Soru (Örn: Takım Adı / Sipariş No)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('question2')
                        .setDescription('Formda kullanıcıya sorulacak 2. Soru (Örn: Kaptan Discord ID / Hata Nerede Oluştu)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('question3')
                        .setDescription('Formda kullanıcıya sorulacak 3. Soru (Örn: Oyuncu Listesi / Kanıt Linki)')
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('channel')
                        .setDescription('Panelin gönderileceği kanal (boş bırakılırsa mevcut kanal)')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('parent_category')
                        .setDescription('Bu panelden açılan biletlerin toplanacağı Discord Kategorisi')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('staff_role')
                        .setDescription('Bu panele özel yetkili rolü')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('style')
                        .setDescription('Karma panel için görünüm tarzı')
                        .addChoices(
                            { name: '🔘 Butonlar (Kategori Başına Renkli Buton)', value: 'buttons' },
                            { name: '📂 Açılır Menü (Dropdown / Select Menu)', value: 'dropdown' }
                        )
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('button_label')
                        .setDescription('Buton üzerindeki özel yazı (isteğe bağlı)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('title')
                        .setDescription('Panel başlığı (isteğe bağlı)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('description')
                        .setDescription('Panel açıklaması (isteğe bağlı)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('rules')
                        .setDescription('Talep kuralları metni (Kaldırmak için "yok" veya "sil" yazın)')
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('show_rules')
                        .setDescription('Talep kuralları alanı gösterilsin mi? (False: alanı tamamen siler)')
                        .setRequired(false)
                )
                .addStringOption(opt =>
                    opt.setName('response_time')
                        .setDescription('Yanıt / Destek süresi metni (Kaldırmak için "yok" veya "sil" yazın)')
                        .setRequired(false)
                )
                .addBooleanOption(opt =>
                    opt.setName('show_response_time')
                        .setDescription('Yanıt süresi alanı gösterilsin mi? (False: alanı tamamen siler)')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Bilet açılış modunu (Kanal vs Thread) ve kategori ayarlarını yapılandırır')
                .addStringOption(opt =>
                    opt.setName('mode')
                        .setDescription('Biletlerin açılma türü')
                        .addChoices(
                            { name: '💬 Ayrı Metin Kanalı (Channel)', value: 'channel' },
                            { name: '🧵 Gizli Alt Başlık (Private Thread)', value: 'thread' }
                        )
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('default_category')
                        .setDescription('Genel bilet kanallarının toplanacağı Discord Kategorisi')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('vip_category')
                        .setDescription('VIP bilet kanallarının toplanacağı Discord Kategorisi')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('complaint_category')
                        .setDescription('Şikayet bilet kanallarının toplanacağı Discord Kategorisi')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(false)
                )
                .addChannelOption(opt =>
                    opt.setName('log_channel')
                        .setDescription('Bilet kayıtlarının tutulacağı log kanalı')
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('general_staff')
                        .setDescription('Genel Destek Yetkili Rolü')
                        .setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('vip_staff')
                        .setDescription('VIP / Satış Yetkili Rolü')
                        .setRequired(false)
                )
                .addRoleOption(opt =>
                    opt.setName('mod_staff')
                        .setDescription('Şikayet / Moderatör Rolü')
                        .setRequired(false)
                )
        )
        .addSubcommand(sub =>
            sub.setName('close')
                .setDescription('Mevcut bilet kanalını / thread alanını kapatır')
        )
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Bilet alanına bir kullanıcı ekler')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Eklenecek kullanıcı')
                        .setRequired(true)
                )
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Bilet alanından bir kullanıcıyı çıkarır')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Çıkarılacak kullanıcı')
                        .setRequired(true)
                )
        ),
    async execute(interaction, client) {
        const subcommand = interaction.options.getSubcommand();

        // 1. Panel Gönderme (Hazır veya Tamamen Özel Amaçlı)
        if (subcommand === 'panel') {
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const categoryOption = interaction.options.getString('category');
            const customName = interaction.options.getString('custom_name');
            const customEmoji = interaction.options.getString('custom_emoji') || '📋';
            const customColor = interaction.options.getString('custom_color') || '#5865F2';
            const q1 = interaction.options.getString('question1');
            const q2 = interaction.options.getString('question2');
            const q3 = interaction.options.getString('question3');
            const parentCategory = interaction.options.getChannel('parent_category');
            const staffRole = interaction.options.getRole('staff_role');
            const style = interaction.options.getString('style');
            const buttonLabel = interaction.options.getString('button_label');
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const rules = interaction.options.getString('rules');
            const showRules = interaction.options.getBoolean('show_rules');
            const responseTime = interaction.options.getString('response_time');
            const showResponseTime = interaction.options.getBoolean('show_response_time');

            let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            if (!config) config = new GuildConfig({ guildId: interaction.guild.id });
            config.ticket.enabled = true;
            if (!config.ticket.categories) config.ticket.categories = new Map();

            let targetCategoryKey = categoryOption || 'all';

            // --- TAMAMEN ÖZEL AMAÇLI KATEGORİ OLUŞTURMA ---
            if (customName) {
                // Temiz anahtar oluştur
                const customKey = 'c_' + customName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15) + '_' + Math.random().toString(36).substring(2, 6);
                targetCategoryKey = customKey;

                const customQuestions = [];
                if (q1) customQuestions.push({ id: 'q1', label: q1, style: 'short', required: true });
                if (q2) customQuestions.push({ id: 'q2', label: q2, style: 'paragraph', required: true });
                if (q3) customQuestions.push({ id: 'q3', label: q3, style: 'paragraph', required: false });

                if (customQuestions.length === 0) {
                    customQuestions.push(
                        { id: 'subject', label: 'Konu / Başlık', style: 'short', required: true },
                        { id: 'details', label: 'Detaylar ve Açıklama', style: 'paragraph', required: true }
                    );
                }

                config.ticket.categories.set(customKey, {
                    enabled: true,
                    name: customName,
                    emoji: customEmoji,
                    color: customColor,
                    categoryId: parentCategory ? parentCategory.id : config.ticket.category,
                    staffRoles: staffRole ? [staffRole.id] : (config.ticket.staffRoles || []),
                    questions: customQuestions
                });

                await config.save();

                // Özel Panel Payload Oluştur
                const embedTitle = title || `${customEmoji} ${customName} Paneli`;
                const embedDesc = description ||
                    `**${customName}** için aşağıdaki butona tıklayarak talep formunu doldurabilirsiniz.\n\n` +
                    `Yetkili ekibimiz talebinizi en kısa sürede inceleyecektir.`;

                const payloadOptions = {
                    title: embedTitle,
                    description: embedDesc,
                    color: customColor,
                    rules: rules !== null ? rules : undefined,
                    showRules: showRules !== null ? showRules : true,
                    responseTime: responseTime !== null ? responseTime : undefined,
                    showResponseTime: showResponseTime !== null ? showResponseTime : true
                };

                const isFalsey = (val) => val === false || val === 'none' || val === 'yok' || val === 'sil' || val === 'kapali' || val === 'false';
                const embed = new EmbedBuilder()
                    .setTitle(payloadOptions.title)
                    .setDescription(payloadOptions.description)
                    .setColor(payloadOptions.color)
                    .setFooter({ text: 'Syncord Destek Sistemi' })
                    .setTimestamp();

                if (payloadOptions.showRules && !isFalsey(payloadOptions.rules)) {
                    embed.addFields({
                        name: '📌 Kurallar',
                        value: typeof payloadOptions.rules === 'string' && payloadOptions.rules.trim() ? payloadOptions.rules.trim() : '• Formu eksiksiz doldurunuz.\n• Doğru bilgiler veriniz.',
                        inline: true
                    });
                }

                if (payloadOptions.showResponseTime && !isFalsey(payloadOptions.responseTime)) {
                    embed.addFields({
                        name: '⏱️ Yanıt Süresi',
                        value: typeof payloadOptions.responseTime === 'string' && payloadOptions.responseTime.trim() ? payloadOptions.responseTime.trim() : '• Yetkili ekibimiz en kısa sürede dönüş sağlayacaktır.',
                        inline: true
                    });
                }

                const btn = new ButtonBuilder()
                    .setCustomId(`ticket_create_${customKey}`)
                    .setLabel(buttonLabel || `${customName} Formunu Aç`)
                    .setEmoji(customEmoji)
                    .setStyle(ButtonStyle.Primary);

                const customPayload = {
                    embeds: [embed],
                    components: [new ActionRowBuilder().addComponents(btn)]
                };

                try {
                    await targetChannel.send(customPayload);
                    return interaction.reply({
                        content: `✅ **Özel Amaçlı Panel (${customName})** başarıyla ${targetChannel} kanalına gönderildi!\n• **Form Soruları:** ${customQuestions.map(q => `\`${q.label}\``).join(', ')}${parentCategory ? `\n• **Bilet Kategorisi:** <#${parentCategory.id}>` : ''}${staffRole ? `\n• **Yetkili Rolü:** ${staffRole}` : ''}`,
                        ephemeral: true
                    });
                } catch (err) {
                    console.error('[Ticket Custom Panel Error]:', err);
                    return interaction.reply({
                        content: '❌ Özel panel gönderilirken bir hata oluştu. Botun kanalda mesaj gönderme iznini kontrol ediniz.',
                        ephemeral: true
                    });
                }
            }

            // --- HAZIR STANDART VEYA KARMA PANEL ---
            const savedPanel = config?.ticket?.panel || {};

            const payloadOptions = {
                category: targetCategoryKey,
                style: style || savedPanel.style || 'buttons',
                buttonLabel: buttonLabel || undefined,
                title: title || undefined,
                description: description || undefined,
                rules: rules !== null ? rules : undefined,
                showRules: showRules !== null ? showRules : (savedPanel.showRules !== false),
                responseTime: responseTime !== null ? responseTime : undefined,
                showResponseTime: showResponseTime !== null ? showResponseTime : (savedPanel.showResponseTime !== false)
            };

            const payload = ticketModule.createPanelPayload(payloadOptions);

            try {
                const message = await targetChannel.send(payload);

                if (targetCategoryKey !== 'all' && (parentCategory || staffRole)) {
                    const existingCat = config.ticket.categories.get ? config.ticket.categories.get(targetCategoryKey) : {};
                    config.ticket.categories.set(targetCategoryKey, {
                        enabled: true,
                        name: existingCat?.name || targetCategoryKey,
                        emoji: existingCat?.emoji || '🎫',
                        categoryId: parentCategory ? parentCategory.id : existingCat?.categoryId,
                        staffRoles: staffRole ? [staffRole.id] : (existingCat?.staffRoles || [])
                    });
                }

                await config.save();

                const catName = targetCategoryKey !== 'all' ? (ticketModule.categories[targetCategoryKey]?.label || targetCategoryKey) : 'Tüm Kategoriler';

                return interaction.reply({
                    content: `✅ **${catName}** paneli başarıyla ${targetChannel} kanalına gönderildi!${parentCategory ? `\n• Biletler <#${parentCategory.id}> kategorisinde açılacak.` : ''}${staffRole ? `\n• Yetkili: ${staffRole}` : ''}`,
                    ephemeral: true
                });
            } catch (err) {
                console.error('[Ticket Command] Panel gönderme hatası:', err);
                return interaction.reply({
                    content: '❌ Destek paneli gönderilirken bir hata oluştu. Botun kanalda mesaj yazma iznini kontrol ediniz.',
                    ephemeral: true
                });
            }
        }

        // 2. Setup (Yapılandırma)
        if (subcommand === 'setup') {
            const mode = interaction.options.getString('mode');
            const defaultCategory = interaction.options.getChannel('default_category');
            const vipCategory = interaction.options.getChannel('vip_category');
            const complaintCategory = interaction.options.getChannel('complaint_category');
            const logChannel = interaction.options.getChannel('log_channel');
            const generalStaff = interaction.options.getRole('general_staff');
            const vipStaff = interaction.options.getRole('vip_staff');
            const modStaff = interaction.options.getRole('mod_staff');

            let config = await GuildConfig.findOne({ guildId: interaction.guild.id });
            if (!config) config = new GuildConfig({ guildId: interaction.guild.id });

            config.ticket.enabled = true;
            if (mode) config.ticket.mode = mode;
            if (defaultCategory) config.ticket.category = defaultCategory.id;
            if (logChannel) config.ticket.logChannel = logChannel.id;

            if (generalStaff && !config.ticket.staffRoles.includes(generalStaff.id)) {
                config.ticket.staffRoles.push(generalStaff.id);
            }

            // Kategoriye özel ayarlar
            if (!config.ticket.categories) config.ticket.categories = new Map();

            if (vipStaff || vipCategory) {
                const existing = config.ticket.categories.get ? config.ticket.categories.get('vip') : {};
                config.ticket.categories.set('vip', {
                    enabled: true,
                    name: 'VIP & Mağaza Alımı',
                    emoji: '💎',
                    categoryId: vipCategory ? vipCategory.id : existing?.categoryId,
                    staffRoles: vipStaff ? [vipStaff.id] : (existing?.staffRoles || [])
                });
            }

            if (modStaff || complaintCategory) {
                const existing = config.ticket.categories.get ? config.ticket.categories.get('complaint') : {};
                config.ticket.categories.set('complaint', {
                    enabled: true,
                    name: 'Şikayet & Bildirim',
                    emoji: '⚠️',
                    categoryId: complaintCategory ? complaintCategory.id : existing?.categoryId,
                    staffRoles: modStaff ? [modStaff.id] : (existing?.staffRoles || [])
                });
            }

            await config.save();

            return interaction.reply({
                content:
                    `✅ **Bilet Sistemi Yapılandırması Güncellendi:**\n` +
                    `• **Mod:** ${config.ticket.mode === 'thread' ? '🧵 Gizli Alt Başlık (Private Thread)' : '💬 Ayrı Metin Kanalı (Channel)'}\n` +
                    `${defaultCategory ? `• **Varsayılan Kategori:** <#${defaultCategory.id}>\n` : ''}` +
                    `${vipCategory ? `• **VIP Kategorisi:** <#${vipCategory.id}>\n` : ''}` +
                    `${complaintCategory ? `• **Şikayet Kategorisi:** <#${complaintCategory.id}>\n` : ''}` +
                    `${logChannel ? `• **Log Kanalı:** <#${logChannel.id}>\n` : ''}` +
                    `${generalStaff ? `• **Genel Destek Rolü:** ${generalStaff}\n` : ''}` +
                    `${vipStaff ? `• **VIP/Satış Rolü:** ${vipStaff}\n` : ''}` +
                    `${modStaff ? `• **Şikayet/Mod Rolü:** ${modStaff}\n` : ''}`,
                ephemeral: true
            });
        }

        // 3. Bilet Kapatma
        if (subcommand === 'close') {
            const ticketDoc = await Ticket.findOne({
                channelId: interaction.channel.id,
                status: 'open'
            });

            if (!ticketDoc) {
                return interaction.reply({
                    content: '⚠️ Bu alan aktif bir destek bileti kanalı/thread\'i değil veya zaten kapatılmış.',
                    ephemeral: true
                });
            }

            return ticketModule.closeTicket(interaction, client);
        }

        // 4. Kullanıcı Ekleme
        if (subcommand === 'add') {
            const user = interaction.options.getUser('user');
            const channel = interaction.channel;
            const ticketDoc = await Ticket.findOne({
                channelId: channel.id,
                status: 'open'
            });

            if (!ticketDoc) {
                return interaction.reply({
                    content: '⚠️ Bu komut yalnızca aktif bir bilet kanalında kullanılabilir.',
                    ephemeral: true
                });
            }

            if (channel.isThread()) {
                await channel.members.add(user.id);
            } else {
                await channel.permissionOverwrites.edit(user.id, {
                    ViewChannel: true,
                    SendMessages: true,
                    AttachFiles: true,
                    EmbedLinks: true,
                    ReadMessageHistory: true
                });
            }

            return interaction.reply({
                content: `✅ ${user} bu bilet alanına eklendi.`
            });
        }

        // 5. Kullanıcı Çıkarma
        if (subcommand === 'remove') {
            const user = interaction.options.getUser('user');
            const channel = interaction.channel;
            const ticketDoc = await Ticket.findOne({
                channelId: channel.id,
                status: 'open'
            });

            if (!ticketDoc) {
                return interaction.reply({
                    content: '⚠️ Bu komut yalnızca aktif bir bilet kanalında kullanılabilir.',
                    ephemeral: true
                });
            }

            if (user.id === ticketDoc.userId) {
                return interaction.reply({
                    content: '⚠️ Bilet sahibini alandan çıkaramazsınız.',
                    ephemeral: true
                });
            }

            if (channel.isThread()) {
                await channel.members.remove(user.id).catch(() => {});
            } else {
                await channel.permissionOverwrites.delete(user.id).catch(() => {});
            }

            return interaction.reply({
                content: `✅ ${user} bu bilet alanından çıkarıldı.`
            });
        }
    }
};
