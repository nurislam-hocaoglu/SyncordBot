const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Tüm bot komutlarını ve özelliklerini listeler'),
    async execute(interaction, client) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Nuro Bot Komut Rehberi')
            .setDescription('Aşağıda sunucuda kullanabileceğiniz tüm komutlar listelenmiştir:')
            .setColor('#2ecc71')
            .addFields(
                {
                    name: '🛠️ Genel & Yardımcı (Utility)',
                    value: '• `/ping` - Bot ve API gecikme süreleri\n• `/help` - Komut listesi ve yardım\n• `/botinfo` - Bot istatistikleri ve donanım bilgisi'
                },
                {
                    name: '🆙 Seviye Sistemi (Leveling)',
                    value: '• `/rank` - Seviye, XP ve sunucu sıralaması\n• `/leaderboard` - Sunucunun en yüksek seviyeli üyeleri'
                },
                {
                    name: '🛡️ Moderasyon (Moderation)',
                    value: '• `/clear` - Belirtilen sayıda mesajı topluca siler\n• `/kick` - Bir üyeyi sunucudan atar\n• `/ban` - Bir üyeyi sunucudan yasaklar'
                },
                {
                    name: '⚙️ Yönetim & Yapılandırma (Config)',
                    value: '• `/settings` - Sunucu ayarlarını görüntüleme ve yapılandırma'
                },
                {
                    name: '🤖 Arka Plan Modülleri',
                    value: '• **AutoMod**: Davet linki, spam, caps lock ve çoklu etiket koruması\n• **Logging**: Üye giriş/çıkış ve mesaj silinme logları\n• **Sharding**: Yüksek trafikli sunucular için optimize edilmiş shard mimarisi'
                }
            )
            .setFooter({ text: 'Nuro Bot v1.0.0' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
