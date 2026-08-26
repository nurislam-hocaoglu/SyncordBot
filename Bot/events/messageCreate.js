const { Events } = require('discord.js');
const automod = require('../src/modules/automod');
const leveling = require('../src/modules/leveling');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        if (message.author.bot || message.system) return;

        // Sadece sunucu mesajlarını işle
        if (!message.guild) return;

        // 1. AutoMod Kontrolü
        const isViolated = await automod.handleMessage(message);
        if (isViolated) {
            // Mesaj silindi/kural ihlali var, XP kazandırma
            return;
        }

        // 2. Seviye / XP Sistemi
        await leveling.handleMessage(message);

        // 3. Prefix Komutları (Opsiyonel / Hızlı Kontrol)
        const prefix = process.env.PREFIX || '!';
        if (message.content.startsWith(prefix)) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const command = args.shift()?.toLowerCase();

            if (command === 'ping') {
                const currentShard = client.shard ? client.shard.ids[0] : 0;
                return message.reply(`🏓 Pong! (Shard #${currentShard} • API: \`${Math.round(client.ws.ping)}ms\`)`);
            }
        }
    }
};
