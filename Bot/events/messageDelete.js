const { Events } = require('discord.js');
const logging = require('../src/modules/logging');

module.exports = {
    name: Events.MessageDelete,
    once: false,
    async execute(message, client) {
        await logging.logMessageDelete(message);
    }
};
