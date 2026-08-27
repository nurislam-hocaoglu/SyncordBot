const { Events } = require('discord.js');
const GuildConfig = require('../src/models/GuildConfig');
const logging = require('../src/modules/logging');
const welcome = require('../src/modules/welcome');

// Çift tetiklenmeyi önlemek için geçici önbellek (Deduplication)
const recentJoins = new Set();

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        try {
            const dedupeKey = `${member.guild.id}:${member.id}`;
            if (recentJoins.has(dedupeKey)) {
                return;
            }
            recentJoins.add(dedupeKey);
            setTimeout(() => recentJoins.delete(dedupeKey), 5000);

            // Dinamik bilgi: üye geldiğinde konsola loglanır
            console.log(
                `[Event] 👋 Yeni üye katıldı: ${member.user.tag} (${member.guild.name}) • Üye #${member.guild.memberCount}`
            );

            // 1) Loglama (log kanalı yapılandırılmışsa ve karşılama kanalından farklıysa embed atılır)
            await logging.logMemberJoin(member);

            // 2) Dinamik karşılama: Canvas banner + Embed mesajı
            await welcome.sendWelcome(member, client);

            // 3) Otomatik rol verme
            const config = await GuildConfig.findOne({ guildId: member.guild.id }).catch(() => null);
            if (config?.welcome?.autoRole) {
                const role = member.guild.roles.cache.get(config.welcome.autoRole);
                if (role && member.manageable) {
                    await member.roles.add(role).catch(err => {
                        console.error('[Welcome] Otomatik rol hatası:', err.message);
                    });
                }
            }
        } catch (error) {
            console.error('[Event GuildMemberAdd] Hata:', error);
        }
    }
};