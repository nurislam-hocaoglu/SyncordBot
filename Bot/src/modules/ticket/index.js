// src/modules/ticket/index.js
/**
 * Syncord — Gelişmiş Çoklu Bilet (Ticket) Modülü
 * Çoklu Kategori, Buton/Dropdown Panel, Kanal vs. Thread Desteği, Dinamik Modallar ve Rol Etiketleme
 */

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');

const GuildConfig = require('../../models/GuildConfig');
const Ticket = require('../../models/Ticket');

// Standart Bilet Kategorileri Tanımları
const CATEGORIES = {
    general: {
        id: 'general',
        label: 'Genel Destek',
        emoji: '📩',
        color: '#5865F2',
        description: 'Sunucu, bot ve genel konularla ilgili yardım talepleri',
        buttonStyle: ButtonStyle.Primary,
        questions: [
            {
                id: 'subject',
                label: 'Destek Konusu',
                placeholder: 'Örn: Rol Sorunu / Genel Yardım',
                style: TextInputStyle.Short,
                minLength: 3,
                maxLength: 100,
                required: true
            },
            {
                id: 'details',
                label: 'Detaylar',
                placeholder: 'Lütfen sorununuzu detaylı olarak açıklayınız...',
                style: TextInputStyle.Paragraph,
                minLength: 10,
                maxLength: 1000,
                required: true
            }
        ]
    },
    complaint: {
        id: 'complaint',
        label: 'Şikayet & Bildirim',
        emoji: '⚠️',
        color: '#ED4245',
        description: 'Kural ihlali, oyuncu veya yetkili şikayetleri',
        buttonStyle: ButtonStyle.Danger,
        questions: [
            {
                id: 'target',
                label: 'Şikayet Edilen Kişi / ID',
                placeholder: 'Örn: @Kullanıcı veya 1234567890',
                style: TextInputStyle.Short,
                minLength: 2,
                maxLength: 100,
                required: true
            },
            {
                id: 'details',
                label: 'Olay Detayı ve Kanıtlar',
                placeholder: 'Olayı açıklayın ve varsa ekran görüntüsü / video linklerini ekleyin...',
                style: TextInputStyle.Paragraph,
                minLength: 10,
                maxLength: 1000,
                required: true
            }
        ]
    },
    vip: {
        id: 'vip',
        label: 'VIP & Mağaza Alımı',
        emoji: '💎',
        color: '#FEE75C',
        description: 'VIP üyelik, bağış ve mağaza ürün işlemleri',
        buttonStyle: ButtonStyle.Success,
        questions: [
            {
                id: 'ign',
                label: 'Oyun İçi Adınız (IGN) / Hesap',
                placeholder: 'Örn: Steve_123 veya Kullanıcı Adınız',
                style: TextInputStyle.Short,
                minLength: 2,
                maxLength: 50,
                required: true
            },
            {
                id: 'package',
                label: 'Almak İstediğiniz VIP / Paket',
                placeholder: 'Örn: VIP+, Özel Rol, 1000 Kredi...',
                style: TextInputStyle.Short,
                minLength: 2,
                maxLength: 100,
                required: true
            },
            {
                id: 'details',
                label: 'Ödeme Yöntemi veya Ek Bilgi',
                placeholder: 'Örn: Papara / Havale / Kredi Kartı / İninal...',
                style: TextInputStyle.Paragraph,
                minLength: 3,
                maxLength: 1000,
                required: true
            }
        ]
    },
    partnership: {
        id: 'partnership',
        label: 'Yetkili & Ortaklık Başvurusu',
        emoji: '🤝',
        color: '#57F287',
        description: 'Yetkili alımları ve sunucu ortaklık talepleri',
        buttonStyle: ButtonStyle.Secondary,
        questions: [
            {
                id: 'subject',
                label: 'Başvuru / Ortaklık Türü',
                placeholder: 'Örn: Moderatörlük Başvurusu / Sunucu Ortaklığı',
                style: TextInputStyle.Short,
                minLength: 3,
                maxLength: 100,
                required: true
            },
            {
                id: 'details',
                label: 'Deneyimleriniz ve Kendiniz Hakkında',
                placeholder: 'Yaşınız, yetkili olduğunuz eski sunucular ve deneyimleriniz...',
                style: TextInputStyle.Paragraph,
                minLength: 10,
                maxLength: 1000,
                required: true
            }
        ]
    }
};

class TicketModule {
    constructor() {
        this.categories = CATEGORIES;
    }

    /**
     * Çoklu Kategori veya Tekil Kategoriye Özel Bağımsız Panel (Embed + Butonlar/Dropdown) Oluşturucu
     * @param {Object} options
     * @returns {{ embeds: EmbedBuilder[], components: ActionRowBuilder[] }}
     */
    createPanelPayload(options = {}) {
        const selectedCategoryKey = options.category && options.category !== 'all' ? options.category : null;
        const singleCategory = selectedCategoryKey ? (this.categories[selectedCategoryKey] || null) : null;

        // Varsayılan metin ve renk belirleme
        let defaultTitle = '🎫 Destek & Bilet Sistemi';
        let defaultDescription =
            'Sunucumuzla ilgili yardım almak, bildirimde bulunmak veya satın alım yapmak için ' +
            'aşağıdaki kategorilerden size uygun olanı seçerek **Destek Talebi** oluşturabilirsiniz.\n\n' +
            '📋 Seçim yaptığınızda açılan kısa formu doldurmanız yeterlidir.';
        let defaultColor = '#5865F2';

        if (singleCategory) {
            defaultColor = singleCategory.color || '#5865F2';
            if (singleCategory.id === 'vip') {
                defaultTitle = '💎 VIP & Mağaza Destek Paneli';
                defaultDescription =
                    'Sunucumuzda VIP üyelik, özel roller, oyun içi kredi veya mağaza ürünleri satın almak ve teslim almak için ' +
                    'aşağıdaki butona tıklayarak **VIP Destek Talebi** oluşturabilirsiniz.\n\n' +
                    '📋 Açılan formda oyun içi adınızı ve almak istediğiniz paketi belirtiniz.';
            } else if (singleCategory.id === 'complaint') {
                defaultTitle = '⚠️ Şikayet & Kural İhlali Bildirim Paneli';
                defaultDescription =
                    'Sunucu kurallarını ihlal eden kullanıcıları veya yaşadığınız olumsuzlukları yetkili ekibimize iletmek için ' +
                    'aşağıdaki butona tıklayarak **Şikayet Bildirimi** oluşturabilirsiniz.\n\n' +
                    '📋 Lütfen formu doldururken şikayet edilen kişinin ID/adını ve kanıt linklerini ekleyiniz.';
            } else if (singleCategory.id === 'partnership') {
                defaultTitle = '🤝 Yetkili & Ortaklık Başvuru Paneli';
                defaultDescription =
                    'Sunucu yetkili kadromuza katılmak veya sunucular arası partnerlik/ortaklık kurmak için ' +
                    'aşağıdaki butona tıklayarak **Başvuru Formunu** doldurabilirsiniz.\n\n' +
                    '📋 Deneyimlerinizi ve başvuru türünüzü formda detaylıca açıklayınız.';
            } else {
                defaultTitle = `${singleCategory.emoji} ${singleCategory.label} Paneli`;
                defaultDescription = `${singleCategory.description}\n\nAşağıdaki butona tıklayarak form doldurabilir ve talebinizi iletebilirsiniz.`;
            }
        }

        const title = options.title || defaultTitle;
        const description = options.description || defaultDescription;
        const color = options.color || defaultColor;

        const embed = new EmbedBuilder()
            .setTitle(title)
            .setDescription(description)
            .setColor(color)
            .setFooter({ text: 'Syncord Destek Sistemi • Güvenli ve Hızlı İletişim' })
            .setTimestamp();

        const isFalsey = (val) => val === false || val === 'none' || val === 'yok' || val === 'sil' || val === 'kapali' || val === 'false';

        const fields = [];

        // 1. Talep Kuralları Alanı
        const showRules = options.showRules !== false && !isFalsey(options.rules);
        if (showRules) {
            const rulesContent = (typeof options.rules === 'string' && options.rules.trim() && !isFalsey(options.rules))
                ? options.rules.trim()
                : (singleCategory ? `• ${singleCategory.label} kurallarına riayet ediniz.\n• Formu eksiksiz doldurunuz.` : '• Gereksiz yere talep açmayınız.\n• Sorununuzu formda net ve detaylı belirtiniz.');

            fields.push({
                name: options.rulesTitle || '📌 Talep Kuralları',
                value: rulesContent,
                inline: true
            });
        }

        // 2. Yanıt / Destek Süresi Alanı
        const showResponseTime = options.showResponseTime !== false && !isFalsey(options.responseTime);
        if (showResponseTime) {
            const responseContent = (typeof options.responseTime === 'string' && options.responseTime.trim() && !isFalsey(options.responseTime))
                ? options.responseTime.trim()
                : '• Yetkili ekibimiz en kısa sürede kanal üzerinden sizinle iletişime geçecektir.';

            fields.push({
                name: options.responseTimeTitle || '⏱️ Yanıt Süresi',
                value: responseContent,
                inline: true
            });
        }

        if (fields.length > 0) {
            if (fields.length === 1) fields[0].inline = false;
            embed.addFields(fields);
        }

        const components = [];

        // TEKİL KATEGORİ PANELİ (Örn: Sadece VIP veya Sadece Şikayet için özel tek buton)
        if (singleCategory) {
            const buttonLabel = options.buttonLabel || `${singleCategory.label} Aç`;
            const button = new ButtonBuilder()
                .setCustomId(`ticket_create_${singleCategory.id}`)
                .setLabel(buttonLabel)
                .setEmoji(singleCategory.emoji)
                .setStyle(singleCategory.buttonStyle || ButtonStyle.Primary);

            components.push(new ActionRowBuilder().addComponents(button));
        } else {
            // ÇOKLU KATEGORİ PANELİ (Butonlar veya Dropdown)
            const activeCategoryKeys = options.categories || ['general', 'complaint', 'vip', 'partnership'];
            const style = options.style || 'buttons';

            if (style === 'dropdown') {
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('ticket_select_category')
                    .setPlaceholder('📂 Bir destek kategorisi seçiniz...')
                    .setMinValues(1)
                    .setMaxValues(1);

                for (const key of activeCategoryKeys) {
                    const cat = this.categories[key];
                    if (cat) {
                        selectMenu.addOptions(
                            new StringSelectMenuOptionBuilder()
                                .setLabel(cat.label)
                                .setValue(cat.id)
                                .setDescription(cat.description.slice(0, 100))
                                .setEmoji(cat.emoji)
                        );
                    }
                }

                components.push(new ActionRowBuilder().addComponents(selectMenu));
            } else {
                let currentRow = new ActionRowBuilder();
                let count = 0;

                for (const key of activeCategoryKeys) {
                    const cat = this.categories[key];
                    if (cat) {
                        if (count > 0 && count % 5 === 0) {
                            components.push(currentRow);
                            currentRow = new ActionRowBuilder();
                        }

                        const btn = new ButtonBuilder()
                            .setCustomId(`ticket_create_${cat.id}`)
                            .setLabel(cat.label)
                            .setEmoji(cat.emoji)
                            .setStyle(cat.buttonStyle || ButtonStyle.Primary);

                        currentRow.addComponents(btn);
                        count++;
                    }
                }

                if (currentRow.components.length > 0) {
                    components.push(currentRow);
                }
            }
        }

        return {
            embeds: [embed],
            components
        };
    }

    /**
     * Kategoriye özel dinamik modal penceresini gösterir
     * @param {import('discord.js').Interaction} interaction
     * @param {string} categoryKey
     */
    async showCategoryModal(interaction, categoryKey = 'general') {
        const cat = this.categories[categoryKey] || this.categories.general;

        const modal = new ModalBuilder()
            .setCustomId(`ticket_modal_${cat.id}`)
            .setTitle(`${cat.emoji} ${cat.label}`);

        for (const q of cat.questions) {
            const input = new TextInputBuilder()
                .setCustomId(`ticket_${q.id}`)
                .setLabel(q.label)
                .setPlaceholder(q.placeholder || '')
                .setStyle(q.style || TextInputStyle.Short)
                .setRequired(q.required !== false);

            if (q.minLength) input.setMinLength(q.minLength);
            if (q.maxLength) input.setMaxLength(q.maxLength);

            const row = new ActionRowBuilder().addComponents(input);
            modal.addComponents(row);
        }

        return interaction.showModal(modal);
    }

    /**
     * Dropdown / Select Menu Etkileşimi
     * @param {import('discord.js').StringSelectMenuInteraction} interaction
     */
    async handleSelectMenu(interaction, client) {
        if (interaction.customId === 'ticket_select_category') {
            const selectedCategory = interaction.values[0];
            return this.showCategoryModal(interaction, selectedCategory);
        }
    }

    /**
     * Buton Etkileşimi
     * @param {import('discord.js').ButtonInteraction} interaction
     */
    async handleButton(interaction, client) {
        const { customId } = interaction;

        // 1. Kategori bazlı destek talebi açma butonları
        if (customId.startsWith('ticket_create_')) {
            const categoryKey = customId.replace('ticket_create_', '');
            return this.showCategoryModal(interaction, categoryKey);
        }

        if (customId === 'ticket_create') {
            return this.showCategoryModal(interaction, 'general');
        }

        // 2. Bilet Kapatma Butonu (İlk tıklama - onay isteği)
        if (customId === 'ticket_close') {
            const confirmEmbed = new EmbedBuilder()
                .setTitle('🔒 Talebi Kapat')
                .setDescription('Bu destek talebini kapatmak istediğinizden emin misiniz?')
                .setColor('#ED4245');

            const confirmBtn = new ButtonBuilder()
                .setCustomId('ticket_close_confirm')
                .setLabel('Kapatmayı Onayla')
                .setEmoji('🗑️')
                .setStyle(ButtonStyle.Danger);

            const cancelBtn = new ButtonBuilder()
                .setCustomId('ticket_close_cancel')
                .setLabel('İptal')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(confirmBtn, cancelBtn);

            return interaction.reply({
                embeds: [confirmEmbed],
                components: [row],
                ephemeral: true
            });
        }

        // 3. Kapatma Onayı
        if (customId === 'ticket_close_confirm') {
            return this.closeTicket(interaction, client);
        }

        // 4. Kapatma İptali
        if (customId === 'ticket_close_cancel') {
            return interaction.update({
                content: '✅ Bilet kapatma işlemi iptal edildi.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Form (Modal) Onaylandığında Kanal veya Gizli Thread Oluşturur
     * @param {import('discord.js').ModalSubmitInteraction} interaction
     */
    async handleModalSubmit(interaction, client) {
        if (!interaction.customId.startsWith('ticket_modal_')) return;

        await interaction.deferReply({ ephemeral: true });

        const guild = interaction.guild;
        const user = interaction.user;
        const categoryKey = interaction.customId.replace('ticket_modal_', '') || 'general';
        const cat = this.categories[categoryKey] || this.categories.general;

        // Form alanlarını dinamik olarak topla
        const formResponses = {};
        for (const q of cat.questions) {
            try {
                formResponses[q.id] = interaction.fields.getTextInputValue(`ticket_${q.id}`);
            } catch (e) {
                formResponses[q.id] = 'Belirtilmedi';
            }
        }

        const subject = formResponses.subject || formResponses.target || formResponses.package || cat.label;
        const details = formResponses.details || Object.values(formResponses).join('\n');

        try {
            const config = await GuildConfig.findOne({ guildId: guild.id }).catch(() => null);

            // Kullanıcı başına açık bilet sınırı kontrolü
            const maxOpen = config?.ticket?.maxOpenTickets || 3;
            const openTicketsCount = await Ticket.countDocuments({
                guildId: guild.id,
                userId: user.id,
                status: 'open'
            });

            if (openTicketsCount >= maxOpen) {
                return interaction.editReply({
                    content: `⚠️ Zaten açık **${openTicketsCount}** adet destek talebiniz bulunuyor. Yeni bir talep açmadan önce mevcut taleplerinizi tamamlayınız.`
                });
            }

            // Bilet Numarası
            const totalTickets = await Ticket.countDocuments({ guildId: guild.id });
            const ticketNumber = totalTickets + 1;

            // Mod: 'channel' veya 'thread'
            const mode = config?.ticket?.mode || 'channel';

            // Kategoriye atanmış özel yetkili rolleri veya genel yetkili rolleri
            const catConfig = config?.ticket?.categories?.get ? config?.ticket?.categories?.get(categoryKey) : null;
            const staffRoles = (catConfig?.staffRoles && catConfig.staffRoles.length > 0)
                ? catConfig.staffRoles
                : (config?.ticket?.staffRoles || []);

            const cleanUsername = user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10) || 'uye';
            const ticketName = `ticket-${ticketNumber}-${cat.id}-${cleanUsername}`;

            let ticketTarget; // Kanal veya Thread

            if (mode === 'thread') {
                // --- GİZLİ ALT BAŞLIK (PRIVATE THREAD) MODU ---
                // Mevcut kanal veya panel kanalında özel thread oluştur
                const parentChannel = interaction.channel;

                if (!parentChannel || typeof parentChannel.threads?.create !== 'function') {
                    throw new Error('Bulunulan kanal thread oluşturmayı desteklemiyor.');
                }

                ticketTarget = await parentChannel.threads.create({
                    name: ticketName,
                    type: ChannelType.PrivateThread,
                    autoArchiveDuration: 1440,
                    reason: `Destek Tale #${ticketNumber} (${cat.label}) - ${user.tag}`
                });

                // Kullanıcıyı thread'e ekle
                await ticketTarget.members.add(user.id).catch(() => {});

                // Botu doğrula
                await ticketTarget.members.add(client.user.id).catch(() => {});

            } else {
                // --- AYRI METİN KANALI (CHANNEL) MODU ---
                const categoryId = catConfig?.categoryId || config?.ticket?.category;

                const permissionOverwrites = [
                    // 1. @everyone için gizle
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    // 2. Kullanıcıya tam yetki
                    {
                        id: user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    },
                    // 3. Bot izinleri
                    {
                        id: client.user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.SendMessages,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.ManageMessages,
                            PermissionFlagsBits.EmbedLinks,
                            PermissionFlagsBits.AttachFiles,
                            PermissionFlagsBits.ReadMessageHistory
                        ]
                    }
                ];

                // 4. İlgili Yetkili Rollerini Ekle
                for (const roleId of staffRoles) {
                    if (guild.roles.cache.has(roleId)) {
                        permissionOverwrites.push({
                            id: roleId,
                            allow: [
                                PermissionFlagsBits.ViewChannel,
                                PermissionFlagsBits.SendMessages,
                                PermissionFlagsBits.AttachFiles,
                                PermissionFlagsBits.EmbedLinks,
                                PermissionFlagsBits.ReadMessageHistory
                            ]
                        });
                    }
                }

                const channelOptions = {
                    name: ticketName,
                    type: ChannelType.GuildText,
                    permissionOverwrites,
                    topic: `Destek Talebi #${ticketNumber} | [${cat.label}] | Kullanıcı: ${user.tag} (${user.id})`
                };

                if (categoryId && guild.channels.cache.has(categoryId)) {
                    channelOptions.parent = categoryId;
                }

                ticketTarget = await guild.channels.create(channelOptions);
            }

            // Veritabanına Kaydet
            await Ticket.create({
                guildId: guild.id,
                channelId: ticketTarget.id,
                userId: user.id,
                ticketNumber,
                category: cat.id,
                ticketType: mode,
                subject,
                details,
                formData: formResponses,
                status: 'open'
            });

            // Otomatik Karşılama Embed'i Tasarımı
            const welcomeEmbed = new EmbedBuilder()
                .setTitle(`${cat.emoji} Destek Talebi #${ticketNumber} — ${cat.label}`)
                .setDescription(`Hoş geldiniz ${user}!\nYetkili ekibimiz en kısa sürede talebinizi inceleyip size yanıt verecektir.`)
                .setColor(cat.color || '#5865F2')
                .addFields(
                    { name: '👤 Talep Sahibi', value: `${user} (\`${user.id}\`)`, inline: true },
                    { name: '📂 Kategori', value: `\`${cat.label}\``, inline: true },
                    { name: '⏰ Açılış Tarihi', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
                );

            // Form Yanıtlarını Embed Field Olarak Ekle
            for (const q of cat.questions) {
                const answer = formResponses[q.id];
                if (answer) {
                    welcomeEmbed.addFields({
                        name: `📝 ${q.label}`,
                        value: answer.length > 1024 ? answer.substring(0, 1021) + '...' : answer,
                        inline: false
                    });
                }
            }

            welcomeEmbed.setFooter({ text: 'Talebi sonlandırmak için aşağıdaki butonu kullanabilirsiniz.' });
            welcomeEmbed.setTimestamp();

            const closeButton = new ButtonBuilder()
                .setCustomId('ticket_close')
                .setLabel('Talebi Kapat')
                .setEmoji('🔒')
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder().addComponents(closeButton);

            // Yetkili Rollerini ve Kullanıcıyı Pingleyen Otomatik Karşılama
            const staffPings = staffRoles.map(r => `<@&${r}>`).join(' ');
            const initialContent = `${user} ${staffPings}`.trim();

            await ticketTarget.send({
                content: initialContent || undefined,
                embeds: [welcomeEmbed],
                components: [actionRow]
            });

            // Log Kanalına Bildirim
            await this.logTicketAction(guild, config, {
                title: '🎫 Yeni Bilet Açıldı',
                color: '#2ecc71',
                fields: [
                    { name: 'Bilet No', value: `#${ticketNumber}`, inline: true },
                    { name: 'Kategori', value: `${cat.emoji} ${cat.label}`, inline: true },
                    { name: 'Tür', value: mode === 'thread' ? '🧵 Özel Thread' : '💬 Metin Kanalı', inline: true },
                    { name: 'Kullanıcı', value: `${user.tag} (${user})`, inline: true },
                    { name: 'Kanal/Thread', value: `${ticketTarget}`, inline: true },
                    { name: 'Konu', value: subject, inline: false }
                ]
            });

            return interaction.editReply({
                content: `✅ **${cat.label}** destek talebiniz başarıyla oluşturuldu! Buradan gidebilirsiniz: ${ticketTarget}`
            });

        } catch (error) {
            console.error('[Ticket Module] Talep oluşturma hatası:', error);
            return interaction.editReply({
                content: `❌ Destek alanı oluşturulurken bir hata meydana geldi: ${error.message}`
            });
        }
    }

    /**
     * Bileti kapatır, loglar ve kanalı/thread'i siler
     * @param {import('discord.js').ButtonInteraction} interaction
     */
    async closeTicket(interaction, client) {
        const channel = interaction.channel;
        const guild = interaction.guild;

        const ticketDoc = await Ticket.findOne({ channelId: channel.id, status: 'open' });

        if (ticketDoc) {
            ticketDoc.status = 'closed';
            ticketDoc.closedBy = interaction.user.id;
            ticketDoc.closedAt = new Date();
            await ticketDoc.save();
        }

        const config = await GuildConfig.findOne({ guildId: guild.id }).catch(() => null);

        // Kapanış bildirimi
        await interaction.update({
            content: `🔒 **Bilet Kapatıldı!** Bu alan 5 saniye içinde sonlandırılacaktır. Kapatan: ${interaction.user}`,
            embeds: [],
            components: []
        });

        // Log gönder
        await this.logTicketAction(guild, config, {
            title: '🔒 Bilet Kapatıldı',
            color: '#e74c3c',
            fields: [
                { name: 'Kanal/Thread Adı', value: channel.name, inline: true },
                { name: 'Kapatan Yetkili/Üye', value: `${interaction.user.tag} (${interaction.user})`, inline: true },
                { name: 'Bilet Sahibi', value: ticketDoc ? `<@${ticketDoc.userId}>` : 'Bilinmiyor', inline: true }
            ]
        });

        setTimeout(async () => {
            await channel.delete('Destek talebi kapatıldı').catch(() => {});
        }, 5000);
    }

    /**
     * Bilet işlemlerini log kanalına gönderir
     */
    async logTicketAction(guild, config, { title, color, fields }) {
        try {
            const logChannelId = config?.ticket?.logChannel || config?.logging?.channel;
            if (!logChannelId) return;

            const logChannel = guild.channels.cache.get(logChannelId);
            if (!logChannel || typeof logChannel.send !== 'function') return;

            const logEmbed = new EmbedBuilder()
                .setTitle(title)
                .setColor(color)
                .addFields(fields)
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] }).catch(() => {});
        } catch (e) {
            console.error('[Ticket Module] Log gönderme hatası:', e.message);
        }
    }
}

module.exports = new TicketModule();
