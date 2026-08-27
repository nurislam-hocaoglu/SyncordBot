// bot.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    Options, 
    Collection 
} = require('discord.js');

const database = require('./src/services/database');
const { loadCommands } = require('./src/handlers/commandHandler');
const { loadEvents } = require('./src/handlers/eventHandler');

const shardId = process.env.SHARD_ID || '0';
const token = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;

if (!token) {
    console.error(`[Shard #${shardId}] ❌ BOT_TOKEN veya DISCORD_TOKEN bulunamadı!`);
    process.exit(1);
}

const client = new Client({
    // BÜYÜK BOT OPTİMİZASYONU: Sadece gerekli intentler
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ],
    
    // RAM Optimizasyonu: Bellekte gereksiz mesaj ve durum tutulmaz
    partials: [Partials.Message, Partials.Channel, Partials.User],
    makeCache: Options.cacheWithLimits({
        MessageManager: 0,
        PresenceManager: 0
    })
});

// Komut koleksiyonunu istemciye tanımla
client.commands = new Collection();

async function init() {
    try {
        console.log(`[Shard #${shardId}] 🚀 Bot başlatılıyor...`);

        // 1. Veritabanı Bağlantısı
        await database.connect();

        // 2. Eventleri Yükle
        loadEvents(client);

        // 3. Komutları Yükle ve Kaydet
        await loadCommands(client);

        // 4. Discord'a Giriş Yap
        await client.login(token);

    } catch (err) {
        console.error(`[Shard #${shardId}] ❌ Başlatma hatası:`, err);
    }
}

init();

// Beklenmeyen Hataları Yakalama (Process Level)
process.on('unhandledRejection', (reason, promise) => {
    console.error('[HATA] Yakalanmayan Promise Hatası:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('[HATA] Yakalanmayan Sistem Hatası:', err);
});