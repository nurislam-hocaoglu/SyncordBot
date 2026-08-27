const { Events } = require('discord.js');
const GuildConfig = require('../src/models/GuildConfig');
const logging = require('../src/modules/logging');
const goodbye = require('../src/modules/goodbye');

// Çift tetiklenmeyi önlemek için geçici önbellek (Deduplication)
const recentLeaves = new Set();

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member, client) {
        try {
            const dedupeKey = `${member.guild.id}:${member.id}`;
            if (recentLeaves.has(dedupeKey)) {
                return;
            }
            recentLeaves.add(dedupeKey);
            setTimeout(() => recentLeaves.delete(dedupeKey), 5000);

            // Dinamik bilgi: üye ayrıldığında konsola loglanır
            console.log(
                `[Event] 👋 Üye ayrıldı: ${member.user.tag} (${member.guild.name}) • Kalan Üye #${member.guild.memberCount}`
            );

            // 1. Loglama (log kanalı yapılandırılmışsa embed atılır)
            await logging.logMemberLeave(member);

            // 2. Dinamik güle güle: Canvas banner + Embed mesajı
            await goodbye.sendGoodbye(member, client);
        } catch (error) {
            console.error('[Event GuildMemberRemove] Hata:', error);
        }
    }
};
