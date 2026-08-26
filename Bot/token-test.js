// token-test.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;

if (!TOKEN) {
    console.error('❌ HATA: .env dosyasında BOT_TOKEN veya DISCORD_TOKEN tanımlanmamış!');
    process.exit(1);
}

console.log('[Token Test] Token bulundu (ilk 10 karakter):', TOKEN.substring(0, 10) + '...');

// Sadece en temel intent ile botu ayağa kaldırmayı deniyoruz
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

client.once('ready', () => {
    console.log(`✅ BAŞARILI: Token geçerli! Bot Giriş Yaptı: ${client.user.tag}`);
    client.destroy(); // Test başarılı oldu, bağlantıyı güvenli bir şekilde kapatıyoruz.
    process.exit(0);
});

client.login(TOKEN).catch(err => {
    console.error('❌ BAŞARISIZ: Giriş yapılamadı!');
    console.error(`Hata Detayı: ${err.message}`);
    process.exit(1);
});