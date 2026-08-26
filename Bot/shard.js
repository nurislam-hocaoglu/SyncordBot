// shard.js
const { ShardingManager } = require('discord.js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const TOKEN = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error('[HATA] .env dosyasında BOT_TOKEN veya DISCORD_TOKEN bulunamadı!');
    process.exit(1);
}

const manager = new ShardingManager(path.join(__dirname, 'bot.js'), {
    token: TOKEN,
    totalShards: 'auto',
});

manager.on('shardCreate', shard => {
    console.log(`[Sistem] Shard #${shard.id} başarıyla başlatıldı ve her şeye hazır.`);
});

manager.spawn().catch(err => {
    console.error('[HATA] Shardlar başlatılamadı! Detay:', err);
});