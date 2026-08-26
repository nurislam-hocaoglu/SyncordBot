const { SlashCommandBuilder, EmbedBuilder, version: djsVersion } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botinfo')
        .setDescription('Bot hakkında teknik detayları ve istatistikleri görüntüler'),
    async execute(interaction, client) {
        const totalGuilds = client.guilds.cache.size;
        const totalUsers = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
        const memUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
        const currentShard = client.shard ? client.shard.ids[0] : 0;
        const totalShards = client.shard ? client.shard.count : 1;

        // Uptime hesaplama
        const totalSeconds = (client.uptime / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor(((totalSeconds % 86400) % 3600) / 60);
        const seconds = Math.floor(((totalSeconds % 86400) % 3600) % 60);
        const uptimeString = `${days}g ${hours}s ${minutes}d ${seconds}sn`;

        const embed = new EmbedBuilder()
            .setTitle('🤖 Nuro Bot Bilgi ve İstatistikler')
            .setColor('#9b59b6')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: '👑 Geliştirici', value: 'Nurislam Hocaoğlu', inline: true },
                { name: '⏱️ Çalışma Süresi (Uptime)', value: uptimeString, inline: true },
                { name: '💎 Shard Bilgisi', value: `Shard #${currentShard} / ${totalShards}`, inline: true },
                { name: '🌐 Sunucu Sayısı', value: `${totalGuilds}`, inline: true },
                { name: '👥 Toplam Kullanıcı', value: `${totalUsers}`, inline: true },
                { name: '🧠 RAM Kullanımı', value: `${memUsage} MB`, inline: true },
                { name: '📦 Node.js', value: process.version, inline: true },
                { name: '📘 Discord.js', value: `v${djsVersion}`, inline: true },
                { name: '💻 İşletim Sistemi', value: `${os.type()} (${os.arch()})`, inline: true }
            )
            .setFooter({ text: 'Nuro Bot Sistem Durumu' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
