const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        const shardId = client.shard ? client.shard.ids[0] : 'Tekil';
        console.log(`[Event Ready] ✅ Bot aktif: ${client.user.tag} (Shard: #${shardId})`);
        console.log(`[Event Ready] 📊 Sunucu: ${client.guilds.cache.size} | Toplam Kullanıcı: ${client.guilds.cache.reduce((a, g) => a + g.memberCount, 0)}`);

        // Bot aktivitesini ayarla
        client.user.setPresence({
            activities: [{ name: '/help | Nuro Bot', type: ActivityType.Playing }],
            status: 'online'
        });
    }
};
