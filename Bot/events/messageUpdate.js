const { Events } = require('discord.js');
const logging = require('../src/modules/logging');

module.exports = {
    name: Events.MessageUpdate,
    once: false,
    async execute(oldMessage, newMessage, client) {
        await logging.logMessageUpdate(oldMessage, newMessage);
    }
};
