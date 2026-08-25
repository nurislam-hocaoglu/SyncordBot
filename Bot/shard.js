// shard.js
const { ShardingManager } = require('discord.js');
require('dotenv').config();

// Buraya Discord Developer Portal'dan aldığın bot tokenini koyacaksın.
// Büyük projelerde token asla kodun içine düz metin olarak yazılmaz, .env dosyasından çekilir.
const TOKEN = process.env.BOT_TOKEN;
 

const manager = new ShardingManager('./bot.js', {
    token: TOKEN,
    // 'auto' ayarı, botun girdiği sunucu sayısına göre shard sayısını Discord'un önerisine göre otomatik belirler.
    // Geliştirme aşamasında (lokalindeyken) bunu zorunlu olarak test etmek için sayı da verebilirsin (örn: 2).
    totalShards: 'auto', 
});

// Bir shard ayağa kalktığında konsola log basıyoruz ki hangi parçanın çalıştığını görelim.
manager.on('shardCreate', shard => {
    console.log(`[Sistem] Shard #${shard.id} başarıyla başlatıldı ve her şeye hazır.`);
});

// Ve şef orkestrayı başlatır...
manager.spawn().catch(err => {
    console.error('[HATA] Shardlar başlatılamadı! Detay:', err);
});