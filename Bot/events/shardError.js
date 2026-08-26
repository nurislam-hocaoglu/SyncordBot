const { Events } = require('discord.js');

module.exports = {
    name: Events.ShardError,
    once: false,
    execute(error, shardId, client) {
        console.error(`[Shard #${shardId} Hatası]:`, error);
    }
};
