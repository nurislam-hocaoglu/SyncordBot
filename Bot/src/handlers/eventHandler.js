const fs = require('fs');
const path = require('path');
const { Events } = require('discord.js');

/**
 * Event dosyalarını yükler
 * @param {Client} client - Discord client instance
 */
function loadEvents(client) {
    const eventsPath = path.join(__dirname, '../../events');
    
    if (!fs.existsSync(eventsPath)) {
        console.log('[Handler] Events klasörü bulunamadı, oluşturuluyor...');
        fs.mkdirSync(eventsPath, { recursive: true });
        createDefaultEvents(eventsPath);
    }

    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    let loadedCount = 0;

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = require(filePath);

        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
        loadedCount++;
        console.log(`[Handler] ✅ Event yüklendi: ${event.name}`);
    }

    console.log(`[Handler] 📋 Toplam ${loadedCount} event yüklendi.`);
    return loadedCount;
}

/**
 * Varsayılan event dosyalarını oluşturur
 */
function createDefaultEvents(eventsPath) {
    const defaultEvents = {
        'ready.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(\`[Event] ✅ Bot hazır: \${client.user.tag}\`);
        console.log(\`[Event] 📊 Shard: \${client.shard ? client.shard.ids[0] : 'N/A'} | Sunucular: \${client.guilds.cache.size}\`);
        
        // Aktivite ayarla
        client.user.setActivity('/help | Nuro Bot', { type: 0 }); // 0 = Playing
    }
};`,
        
        'interactionCreate.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    once: false,
    async execute(interaction, client) {
        // Slash komutları
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            
            if (!command) {
                console.error(\`[Event] ❌ Komut bulunamadı: \${interaction.commandName}\`);
                return;
            }

            try {
                await command.execute(interaction, client);
            } catch (error) {
                console.error(\`[Event] ❌ Komut hatası (\${interaction.commandName}):\`, error);
                
                const errorMsg = { content: '⚠️ Komut çalıştırılırken bir hata oluştu!', ephemeral: true };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMsg);
                } else {
                    await interaction.reply(errorMsg);
                }
            }
        }

        // Buton etkileşimleri
        if (interaction.isButton()) {
            // Button handler eklenecek
        }

        // Seçici menüler
        if (interaction.isStringSelectMenu()) {
            // Select menu handler eklenecek
        }

        // Modal submit
        if (interaction.isModalSubmit()) {
            // Modal handler eklenecek
        }
    }
};`,

        'messageCreate.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.MessageCreate,
    once: false,
    async execute(message, client) {
        // Bot mesajlarını ve sistem mesajlarını yoksay
        if (message.author.bot || message.system) return;

        // DM mesajları
        if (!message.guild) {
            // DM handler eklenecek
            return;
        }

        // Prefix komutları (opsiyonel)
        const prefix = process.env.PREFIX || '!';
        if (!message.content.startsWith(prefix)) return;

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        // Prefix komut handler eklenecek
    }
};`,

        'guildMemberAdd.js': `const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(member, client) {
        // Hoş geldin mesajı / rol verme sistemi
        try {
            // Otomatik rol verme (config'den alınacak)
            // const autoRole = await getAutoRole(member.guild.id);
            // if (autoRole) await member.roles.add(autoRole);
            
            // Hoş geldin kanalı
            // const welcomeChannel = member.guild.channels.cache.get(welcomeChannelId);
            // if (welcomeChannel) ...
            
            console.log(\`[Event] 👋 Yeni üye: \${member.user.tag} (\${member.guild.name})\`);
        } catch (error) {
            console.error('[Event] ❌ GuildMemberAdd hatası:', error);
        }
    }
};`,

        'guildMemberRemove.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(member, client) {
        // Güle güle mesajı / log
        console.log(\`[Event] 👋 Üye ayrıldı: \${member.user.tag} (\${member.guild.name})\`);
    }
};`,

        'error.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.Error,
    once: false,
    execute(error, client) {
        console.error('[Event] ❌ Discord.js Hatası:', error);
    }
};`,

        'warn.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.Warn,
    once: false,
    execute(warning, client) {
        console.warn('[Event] ⚠️ Discord.js Uyarısı:', warning);
    }
};`,

        'shardError.js': `const { Events } = require('discord.js');

module.exports = {
    name: Events.ShardError,
    once: false,
    execute(error, shardId, client) {
        console.error(\`[Event] ❌ Shard #\${shardId} Hatası:\`, error);
    }
};`
    };

    Object.entries(defaultEvents).forEach(([filename, content]) => {
        const filePath = path.join(eventsPath, filename);
        if (!fs.existsSync(filePath)) {
            fs.writeFileSync(filePath, content);
            console.log(`[Handler] 📝 Varsayılan event oluşturuldu: ${filename}`);
        }
    });
}

module.exports = { loadEvents };