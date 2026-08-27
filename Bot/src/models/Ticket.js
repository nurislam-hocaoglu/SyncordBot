// src/models/Ticket.js
const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
    guildId: {
        type: String,
        required: true,
        index: true
    },
    channelId: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: String,
        required: true,
        index: true
    },
    ticketNumber: {
        type: Number,
        default: 1
    },
    category: {
        type: String,
        default: 'general' // general, complaint, vip, partnership, etc.
    },
    ticketType: {
        type: String,
        enum: ['channel', 'thread'],
        default: 'channel'
    },
    subject: {
        type: String,
        required: true
    },
    details: {
        type: String,
        required: true
    },
    formData: {
        type: Map,
        of: String,
        default: {}
    },
    status: {
        type: String,
        enum: ['open', 'closed'],
        default: 'open'
    },
    closedBy: {
        type: String,
        default: null
    },
    closedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Ticket', ticketSchema);

