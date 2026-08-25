// bot.js
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Options, 
    Events, 
    MessageFlags, 
    REST, 
    Routes 
} = require('discord.js');

// AI Nemotron Servisi Entegrasyonu
const nemotron = require('./services/nemotron'); 

// Shard kimliğini (ID) almak için süreç ortamını kontrol ediyoruz
const shardId = process.env.SHARD_ID || '0';

const client = new Client({
    // BÜYÜK BOT OPTİMİZASYONU: Sadece gerçekten ihtiyacımız olan intentleri açıyoruz.
    intents: [
        GatewayIntentBits.Guilds,           // Sunucu yapısını anlamak için şart
        GatewayIntentBits.GuildMembers,     // Üye yönetim işlemleri için (Dashboard senkronizasyonu vb.)
        GatewayIntentBits.GuildMessages,    // Mesaj eventlerini dinlemek için
        GatewayIntentBits.MessageContent    // Mesaj içeriğini okumak için (AI algılama için şart)
    ],
    
    // RAM Optimizasyonu: Botun hafızada tutacağı mesaj geçmişini sıfırlıyoruz.
    partials: [Partials.Message, Partials.Channel, Partials.User],
    makeCache: Options.cacheWithLimits({
        MessageManager: 0, // Mesajları RAM'de saklama, bot şişmesin.
        PresenceManager: 0 // Kullanıcı durumlarını RAM'de saklama.
    })
});

// Slash Komut Tanımlamaları
const commands = [
    {
        name: 'chat',
        description: 'Nuro Bot ile sohbet et',
        options: [
            { name: 'prompt', type: 3, description: 'Sorunuz veya mesajınız', required: true, max_length: 2000 },
            { name: 'ephemeral', type: 5, description: 'Cevabı sadece siz görün', required: false }
        ]
    },
    {
        name: 'context',
        description: 'Sohbet geçmişinizi yönetin',
        options: [
            { name: 'clear', type: 1, description: 'Nuro Bot ile olan sohbet hafızanızı temizler' }
        ]
    }
];

// Slash komutlarını Global olarak Discord'a kaydetme fonksiyonu
async function registerCommands() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        console.log(`[Shard #${shardId}] 🔄 Slash komutları kaydediliyor...`);
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID), 
            { body: commands }
        );
        console.log(`[Shard #${shardId}] ✅ Slash komutları başarıyla kaydedildi.`);
    } catch (err) { 
        console.error(`[Shard #${shardId}] ❌ Komut kaydı hatası:`, err); 
    }
}

// Bot hazır olduğunda tetiklenen event
client.once(Events.ClientReady, async () => {
    console.log(`[Shard #${client.shard ? client.shard.ids[0] : shardId}] Bot başarıyla giriş yaptı: ${client.user.tag}`);
    
    // Sadece ilk shard (Shard #0) komut kaydı yapsın ki Discord API'sine gereksiz yük binmesin
    if (!client.shard || client.shard.ids[0] === 0) {
        await registerCommands();
    }
});

// ==========================================
// 1. MESAJ & AI MENTION HANDLER (messageCreate)
// ==========================================
client.on(Events.MessageCreate, async (message) => {
    // Botların ve sistem mesajlarının tetiklemesini engelle
    if (message.author.bot || message.system) return;

    // Test komutu: !ping
    if (message.content === '!ping') {
        const currentShard = client.shard ? client.shard.ids[0] : shardId;
        return message.reply(`Pong! Bu mesaj Shard #${currentShard} tarafından işlendi.`);
    }

    // Bot etiketlendi mi veya DM mi atıldı kontrol et
    const isMentioned = message.mentions.has(client.user.id);
    const isDM = message.channel.type === 1; // ChannelType.DM

    if (!isMentioned && !isDM) return;

    // Etiket etiketini temizle (Sadece prompt kalsın)
    const prompt = message.content
        .replace(`<@${client.user.id}>`, '')
        .replace(`<@!${client.user.id}>`, '')
        .trim();

    if (!prompt) {
        return message.reply('👋 Efendim? Bana bir şey sorabilir veya `/chat` komutunu kullanabilirsin.');
    }

    // "Yazıyor..." efektini başlat
    await message.channel.sendTyping();

    try {
        const reply = await nemotron.getCompletion(message.author.id, prompt, message.guildId);

        await message.reply({
            content: reply,
            allowedMentions: { repliedUser: false } // Kullanıcıyı tekrar pingleyip rahatsız etme
        });

    } catch (error) {
        console.error('[Nuro Bot] Etiket Yanıt Hatası:', error);
        const userMsg = error.message.includes('Rate limited') 
            ? '⏳ NVIDIA API kısıtlamasına takıldım, lütfen birkaç saniye sonra tekrar dene.' 
            : `⚠️ Bir hata oluştu: ${error.message}`;
            
        await message.reply({ content: userMsg, allowedMentions: { repliedUser: false } });
    }
});

// ==========================================
// 2. SLASH COMMAND HANDLER (interactionCreate)
// ==========================================
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName, options, user, guildId } = interaction;

    // --- /chat Komutu ---
    if (commandName === 'chat') {
        const prompt = options.getString('prompt', true);
        const ephemeral = options.getBoolean('ephemeral') ?? false;

        await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

        try {
            const reply = await nemotron.getCompletion(user.id, prompt, guildId);
            
            // Discord mesaj sınırı 2000 karakterdir.
            if (reply.length <= 2000) {
                await interaction.editReply(reply);
            } else {
                // 2000 karakterden uzunsa parçalayarak gönder
                await interaction.editReply(reply.substring(0, 1990) + '...');
                for (let i = 1990; i < reply.length; i += 2000) {
                    await interaction.followUp({ 
                        content: reply.substring(i, i + 2000), 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            }
        } catch (error) {
            console.error('[Nuro Bot] /chat Hatası:', error);
            await interaction.editReply(`⚠️ Hata: ${error.message}`);
        }
        return;
    }

    // --- /context clear Komutu ---
    if (commandName === 'context') {
        const sub = options.getSubcommand();
        if (sub === 'clear') {
            nemotron.clearContext(user.id, guildId);
            return interaction.reply({ 
                content: '🧹 Nuro Bot ile olan sohbet hafızanız temizlendi.', 
                flags: MessageFlags.Ephemeral 
            });
        }
    }
});

// Giriş İşlemi
client.login().catch(err => {
    console.error(`[Shard #${shardId}] Giriş hatası:`, err.message);
});