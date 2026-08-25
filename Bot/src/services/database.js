// src/services/database.js
const mongoose = require('mongoose');

class DatabaseService {
    constructor() {
        this.isConnected = false;
    }

    /**
     * Veritabanına bağlanır
     */
    async connect() {
        const uri = process.env.MONGODB_URI;
        
        if (!uri) {
            console.warn('[Database] MONGODB_URI .envde tanimlanmamis. Veritabani olmadan devam ediliyor.');
            return false;
        }

        try {
            mongoose.set('strictQuery', true);
            
            await mongoose.connect(uri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
                family: 4
            });

            this.isConnected = true;
            console.log('[Database] MongoDB\'ye baglanildi');
            
            mongoose.connection.on('error', (err) => {
                console.error('[Database] Baglanti hatasi:', err);
                this.isConnected = false;
            });

            mongoose.connection.on('disconnected', () => {
                console.warn('[Database] Baglanti kesildi');
                this.isConnected = false;
            });

            mongoose.connection.on('reconnected', () => {
                console.log('[Database] Yeniden baglanildi');
                this.isConnected = true;
            });

            return true;
        } catch (error) {
            console.error('[Database] Baglanti basarisiz:', error.message);
            this.isConnected = false;
            return false;
        }
    }

    async disconnect() {
        if (this.isConnected) {
            await mongoose.disconnect();
            this.isConnected = false;
            console.log('[Database] Baglanti kapatildi');
        }
    }

    getStatus() {
        return {
            connected: this.isConnected,
            readyState: mongoose.connection.readyState,
            host: mongoose.connection.host,
            name: mongoose.connection.name
        };
    }

    async getStats() {
        if (!this.isConnected) return null;
        
        try {
            const db = mongoose.connection.db;
            const stats = await db.stats();
            return {
                collections: stats.collections,
                dataSize: stats.dataSize,
                storageSize: stats.storageSize,
                indexes: stats.indexes,
                indexSize: stats.indexSize
            };
        } catch (error) {
            console.error('[Database] Istatistik hatasi:', error);
            return null;
        }
    }
}

const database = new DatabaseService();
module.exports = database;