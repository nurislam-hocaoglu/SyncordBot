const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

/**
 * Komutları yükler ve Discord'a kaydeder
 * @param {Client} client - Discord client instance
 */
async function loadCommands(client) {
    const commands = [];
    const commandsPath = path.join(__dirname, '../../commands');
    
    if (!fs.existsSync(commandsPath)) {
        console.log('[Handler] Komut klasörü bulunamadı, oluşturuluyor...');
        fs.mkdirSync(commandsPath, { recursive: true });
        createDefaultCommandStructure(commandsPath);
    }

    const categories = fs.readdirSync(commandsPath).filter(file => {
        return fs.statSync(path.join(commandsPath, file)).isDirectory();
    });

    for (const category of categories) {
        const categoryPath = path.join(commandsPath, category);
        const commandFiles = fs.readdirSync(categoryPath).filter(file => file.endsWith('.js'));

        for (const file of commandFiles) {
            const filePath = path.join(categoryPath, file);
            const command = require(filePath);

            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                commands.push(command.data.toJSON());
                console.log(`[Handler] ✅ Komut yüklendi: ${command.data.name} (${category})`);
            } else {
                console.warn(`[Handler] ⚠️ ${filePath} - "data" veya "execute" özelliği eksik.`);
            }
        }
    }

    // Komutları Discord'a kaydet (sadece shard 0)
    if (!client.shard || client.shard.ids[0] === 0) {
        await registerCommands(client, commands);
    }

    return commands;
}

/**
 * Varsayılan komut klasör yapısını oluşturur
 */
function createDefaultCommandStructure(commandsPath) {
    const categories = ['config', 'moderation', 'utility', 'fun', 'admin'];
    
    categories.forEach(category => {
        const catPath = path.join(commandsPath, category);
        if (!fs.existsSync(catPath)) {
            fs.mkdirSync(catPath, { recursive: true });
        }
    });
}

/**
 * Slash komutlarını Discord API'ye kaydeder
 */
async function registerCommands(client, commands) {
    const token = process.env.BOT_TOKEN || process.env.DISCORD_TOKEN;
    let clientId = process.env.CLIENT_ID || client.user?.id;

    if (!clientId && token) {
        try {
            clientId = Buffer.from(token.split('.')[0], 'base64').toString('ascii');
        } catch (e) {
            // Ignore error
        }
    }

    if (!clientId || !token) {
        console.warn('[Handler] ⚠️ CLIENT_ID veya BOT_TOKEN bulunamadı, komutlar kaydedilmedi.');
        return;
    }

    if (commands.length === 0) {
        console.log('[Handler] ℹ️ Kaydedilecek komut bulunamadı.');
        return;
    }

    const rest = new REST({ version: '10' }).setToken(token);
    
    try {
        console.log(`[Handler] 🔄 ${commands.length} adet Slash komutu Discord'a kaydediliyor...`);
        
        if (process.env.GUILD_ID) {
            // Geliştirme sunucusuna hızlı kayıt
            await rest.put(
                Routes.applicationGuildCommands(clientId, process.env.GUILD_ID),
                { body: commands }
            );
            console.log('[Handler] ✅ Geliştirme sunucusuna komutlar kaydedildi.');
        } else {
            // Global kayıt
            await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log('[Handler] ✅ Global komutlar kaydedildi.');
        }
    } catch (error) {
        console.error('[Handler] ❌ Komut kaydı hatası:', error.message);
    }
}

/**
 * Komutları yeniden yükler (hot-reload için)
 */
async function reloadCommand(client, commandName) {
    const commandsPath = path.join(__dirname, '../../commands');
    let commandFound = false;

    for (const category of fs.readdirSync(commandsPath)) {
        const categoryPath = path.join(commandsPath, category);
        if (!fs.statSync(categoryPath).isDirectory()) continue;

        const filePath = path.join(categoryPath, `${commandName}.js`);
        if (fs.existsSync(filePath)) {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`[Handler] 🔄 Komut yeniden yüklendi: ${commandName}`);
                commandFound = true;
                break;
            }
        }
    }

    if (!commandFound) {
        console.warn(`[Handler] ⚠️ Komut bulunamadı: ${commandName}`);
    }

    return commandFound;
}

module.exports = { loadCommands, reloadCommand };