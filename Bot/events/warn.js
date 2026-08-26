const { Events } = require('discord.js');

module.exports = {
    name: Events.Warn,
    once: false,
    execute(warning, client) {
        console.warn('[Discord.js Uyarısı]:', warning);
    }
};
