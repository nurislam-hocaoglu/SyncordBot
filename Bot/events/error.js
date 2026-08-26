const { Events } = require('discord.js');

module.exports = {
    name: Events.Error,
    once: false,
    execute(error, client) {
        console.error('[Discord.js Hatası]:', error);
    }
};
