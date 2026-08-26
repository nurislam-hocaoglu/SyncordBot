// src/modules/leveling/index.js
const { EmbedBuilder } = require('discord.js');
const UserLevel = require('../../models/UserLevel');
const GuildConfig = require('../../models/GuildConfig');

class LevelingModule {
    /**
     * Mesaj gönderildiğinde XP kazandırır ve seviye atlamayı kontrol eder
     * @param {Message} message 
     */
    async handleMessage(message) {
        if (!message.guild || message.author.bot || message.system) return;

        // Sunucu ayarlarını çek
        let config;
        try {
            config = await GuildConfig.findOne({ guildId: message.guild.id });
        } catch (e) {
            return;
        }

        // Seviye sistemi kapalıysa çık
        if (config && config.leveling && !config.leveling.enabled) return;

        const levelingConfig = config?.leveling || {
            enabled: true,
            xpPerMessage: 20,
            xpCooldown: 60000,
            levelUpChannel: null,
            levelUpMessage: '🎉 Tebrikler {user}! **Level {level}** oldun!',
            rewards: new Map(),
            ignoredChannels: [],
            ignoredRoles: []
        };

        // Yoksayılan kanal kontrolü
        if (levelingConfig.ignoredChannels?.includes(message.channel.id)) return;

        // Yoksayılan rol kontrolü
        if (message.member && levelingConfig.ignoredRoles?.some(roleId => message.member.roles.cache.has(roleId))) {
            return;
        }

        try {
            let userLevel = await UserLevel.findOne({
                guildId: message.guild.id,
                userId: message.author.id
            });

            const now = Date.now();
            const cooldown = levelingConfig.xpCooldown || 60000;

            if (!userLevel) {
                userLevel = new UserLevel({
                    guildId: message.guild.id,
                    userId: message.author.id,
                    xp: 0,
                    totalXP: 0,
                    level: 0,
                    messageCount: 0,
                    lastMessage: 0
                });
            }

            // Cooldown süresi dolmamışsa sadece mesaj sayısını artır
            if (now - userLevel.lastMessage < cooldown) {
                userLevel.messageCount += 1;
                await userLevel.save();
                return;
            }

            // Rastgele XP kazanımı (xpPerMessage civarı)
            const baseXP = levelingConfig.xpPerMessage || 20;
            const earnedXP = Math.floor(Math.random() * 10) + (baseXP - 5);

            const result = userLevel.addXP(earnedXP);
            await userLevel.save();

            // Seviye atlandıysa
            if (result.leveledUp) {
                await this.handleLevelUp(message, userLevel, levelingConfig);
            }
        } catch (err) {
            console.error('[Leveling] XP ekleme hatası:', err.message);
        }
    }

    /**
     * Seviye atlandığında bildirim ve rol ödülü verir
     */
    async handleLevelUp(message, userLevel, levelingConfig) {
        // Rol Ödülü Kontrolü
        if (levelingConfig.rewards && message.member) {
            const rewardRoleId = levelingConfig.rewards instanceof Map 
                ? levelingConfig.rewards.get(String(userLevel.level))
                : levelingConfig.rewards[String(userLevel.level)];

            if (rewardRoleId) {
                const role = message.guild.roles.cache.get(rewardRoleId);
                if (role && !message.member.roles.cache.has(rewardRoleId)) {
                    await message.member.roles.add(role).catch(err => {
                        console.error('[Leveling] Rol verme hatası:', err.message);
                    });
                }
            }
        }

        // Bildirim Mesajı Gönderme
        const customMessage = (levelingConfig.levelUpMessage || '🎉 Tebrikler {user}! **Level {level}** oldun!')
            .replace(/{user}/g, `${message.author}`)
            .replace(/{level}/g, `${userLevel.level}`)
            .replace(/{xp}/g, `${userLevel.xp}`);

        let targetChannel = message.channel;
        if (levelingConfig.levelUpChannel) {
            const configuredChannel = message.guild.channels.cache.get(levelingConfig.levelUpChannel);
            if (configuredChannel) {
                targetChannel = configuredChannel;
            }
        }

        const embed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('🆙 Seviye Atlandı!')
            .setDescription(customMessage)
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setTimestamp();

        await targetChannel.send({ embeds: [embed] }).catch(() => {});
    }
}

module.exports = new LevelingModule();
