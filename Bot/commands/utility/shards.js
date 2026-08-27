const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('shards')
        .setDescription('Toplam shard sayısını ve detaylarını loglar / listeler')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction, client) {
        if (!client.shard) {
            console.log('[Shard Bilgisi] Bot sharding olmadan tekil (single process) modda çalışıyor. Toplam Shard: 1');
            return interaction.reply({
                content: 'ℹ️ Bot tekil modda çalışıyor (Sharding aktif değil). **Toplam Shard: 1**',
                ephemeral: true
            });
        }

        try {
            const totalShards = client.shard.count;
            const currentShardId = client.shard.ids[0];

            // Tüm shardlardan sunucu, kullanıcı, ping ve ram kullanım verilerini çek
            const results = await client.shard.broadcastEval(c => ({
                id: c.shard.ids[0],
                guilds: c.guilds.cache.size,
                users: c.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0),
                ping: c.ws.ping,
                ram: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)
            }));

            const totalGuilds = results.reduce((acc, s) => acc + s.guilds, 0);
            const totalUsers = results.reduce((acc, s) => acc + s.users, 0);
            const totalRam = results.reduce((acc, s) => acc + parseFloat(s.ram), 0).toFixed(2);

            // Konsola/terminale logla
            console.log(`\n================== [ SHARD BİLGİSİ ] ==================`);
            console.log(`📊 Toplam Shard Sayısı: ${totalShards}`);
            console.log(`🌐 Toplam Sunucu: ${totalGuilds} | 👥 Toplam Kullanıcı: ${totalUsers} | 🧠 Toplam RAM: ${totalRam} MB`);
            console.log(`------------------------------------------------------`);
            results.forEach(s => {
                const isCurrent = s.id === currentShardId ? ' (Bu Shard)' : '';
                console.log(`• Shard #${s.id}${isCurrent} -> Sunucu: ${s.guilds} | Üye: ${s.users} | Gecikme: ${s.ping}ms | RAM: ${s.ram} MB`);
            });
            console.log(`=======================================================\n`);

            // Discord üzerinde yanıtla
            const shardListString = results
                .map(s => `\`#${s.id}\`${s.id === currentShardId ? ' *(Aktif)*' : ''} ➔ 🌐 **${s.guilds}** sunucu | 👥 **${s.users}** üye | 📶 **${s.ping}ms** | 🧠 **${s.ram} MB**`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setTitle('💎 Shard Durumu ve İstatistikleri')
                .setColor('#5865F2')
                .setDescription(`Toplam shard sayısı konsola loglandı.\n\n**Toplam Shard Sayısı:** \`${totalShards}\`\n\n${shardListString}`)
                .addFields(
                    { name: '🌐 Toplam Sunucu', value: `${totalGuilds}`, inline: true },
                    { name: '👥 Toplam Kullanıcı', value: `${totalUsers}`, inline: true },
                    { name: '🧠 Toplam RAM', value: `${totalRam} MB` }
                )
                .setFooter({ text: `İşlemi yürüten Shard: #${currentShardId}` })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('[HATA] Shard bilgileri alınırken hata oluştu:', error);
            await interaction.reply({
                content: '❌ Shard bilgileri alınırken ve loglanırken bir hata oluştu.',
                ephemeral: true
            });
        }
    }
};

