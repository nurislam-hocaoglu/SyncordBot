const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Botun gecikme sürelerini ve shard bilgilerini gösterir'),
    async execute(interaction, client) {
        const sent = await interaction.deferReply({ fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiPing = Math.round(client.ws.ping);
        const currentShard = client.shard ? client.shard.ids[0] : 0;
        const totalShards = client.shard ? client.shard.count : 1;

        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setColor('#3498db')
            .addFields(
                { name: '📡 Bot Gecikmesi', value: `\`${latency}ms\``, inline: true },
                { name: '⚡ Discord API', value: `\`${apiPing}ms\``, inline: true },
                { name: '💎 Shard', value: `\`#${currentShard} / ${totalShards}\``, inline: true }
            )
            .setFooter({ text: `İsteyen: ${interaction.user.tag}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
};
