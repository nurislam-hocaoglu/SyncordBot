// token-test.js
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const TOKEN = process.env.BOT_TOKEN;
console.log(TOKEN);


if (!TOKEN) {
    console.error('❌ HATA: .env dosyasında BOT_TOKEN tanımlanmamış!');
    process.exit(1);
}

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
    console.error('❌ BAŞARISIZ: Token hatalı veya geçersiz!');
    console.error(`Hata Detayı: ${err.message}`);
    process.exit(1);
});