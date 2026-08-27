// events/voiceStateUpdate.js - Syncord Ses Kanali XP Sistemi
const { Events } = require('discord.js');
const GuildConfig = require('../src/models/GuildConfig');
const UserLevel = require('../src/models/UserLevel');

const voiceJoinTimes = new Map();

function formatDuration(seconds) {
    if (seconds < 60) return seconds + 'sn';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m < 60) return m + 'd ' + s + 'sn';
    const h = Math.floor(m / 60);
    const mm = m % 60;
    return h + 's ' + mm + 'd';
}

async function awardVoiceXP(guildId, userId, member, guild, elapsedSeconds) {
    try {
        const config = await GuildConfig.findOne({ guildId }).catch(function() { return null; });
        if (config && config.leveling && config.leveling.enabled === false) return;

        let userData = await UserLevel.findOne({ guildId: guildId, userId: userId });
        if (!userData) {
            userData = new UserLevel({ guildId: guildId, userId: userId });
        }

        const result = userData.addVoiceXP(elapsedSeconds);
        await userData.save();

        if (result.xpGained > 0) {
            console.log('[Voice XP] ' + member.user.tag + ' +' + result.xpGained + ' XP (' + formatDuration(elapsedSeconds) + ') - ' + guild.name);
        }

        if (result.leveledUp && config && config.leveling && config.leveling.levelUpChannel) {
            const levelChannel = guild.channels.cache.get(config.leveling.levelUpChannel);
            if (levelChannel) {
                const template = config.leveling.levelUpMessage || '🎉 {user} Level {level} oldu!';
                const msg = template.replace('{user}', member.toString()).replace('{level}', String(result.newLevel));
                levelChannel.send(msg).catch(function() {});
            }
        }
    } catch (error) {
        console.error('[Voice XP] Hata:', error);
    }
}

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    execute: async function(oldState, newState, client) {
        const guild = newState.guild || oldState.guild;
        const member = newState.member || oldState.member;
        if (!member || member.user.bot) return;

        const userId = member.id;
        const guildId = guild.id;
        const key = guildId + ':' + userId;

        const joinedChannel = !oldState.channelId && newState.channelId;
        const leftChannel = oldState.channelId && !newState.channelId;
        const movedChannel = oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId;

        if (joinedChannel) {
            voiceJoinTimes.set(key, Date.now());
            return;
        }

        if (movedChannel) {
            const joinTime = voiceJoinTimes.get(key);
            voiceJoinTimes.set(key, Date.now());
            if (!joinTime) return;
            const elapsed = Math.floor((Date.now() - joinTime) / 1000);
            if (elapsed >= 30) await awardVoiceXP(guildId, userId, member, guild, elapsed);
            return;
        }

        if (leftChannel) {
            const joinTime = voiceJoinTimes.get(key);
            if (!joinTime) return;
            voiceJoinTimes.delete(key);
            const elapsed = Math.floor((Date.now() - joinTime) / 1000);
            if (elapsed >= 30) await awardVoiceXP(guildId, userId, member, guild, elapsed);
        }
    }
};