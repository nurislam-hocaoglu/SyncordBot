<div align="center">
  <img src="./Logolar/syncord-logo.svg" alt="Syncord Bot logosu" width="128">
  <h1>Syncord Bot</h1>
  <p>Discord sunucuları için moderasyon, otomasyon ve topluluk araçları.</p>

  <p>
    <a href="https://github.com/nurislam-hocaoglu/SyncordBot/stargazers">
      <img src="https://img.shields.io/github/stars/nurislam-hocaoglu/SyncordBot?style=for-the-badge&color=2A7FC2" alt="GitHub yıldızları">
    </a>
    <img src="https://img.shields.io/badge/Discord.js-v14-5865F2?style=for-the-badge&logo=discord&logoColor=white" alt="Discord.js v14">
    <img src="https://img.shields.io/badge/Node.js-20.19%2B-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 20.19 ve üzeri">
    <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB ve Mongoose">
  </p>
</div>

---

## ✨ Özellikler

- **Sunucu moderasyonu:** Üye yasaklama/atma, mesaj temizleme ve kelime filtresi.
- **AutoMod:** Sunucu mesajlarını otomatik olarak denetleme ve ihlalleri yönetme.
- **Seviye sistemi:** Mesajlarla XP kazanma, seviye kartları ve sunucu liderlik tablosu.
- **Destek biletleri:** Özelleştirilebilir paneller, kategori ve yetkili ayarları; kanal veya özel alt başlık üzerinden bilet açma.
- **Karşılama ve ayrılma:** Üye giriş/çıkış mesajları, yapılandırılabilir Canvas görselleri ve hoş geldin rolü.
- **Sunucu günlükleri:** Üye ve mesaj olaylarını belirlenen log kanallarına aktarma.
- **Slash komutları:** Yönetim ve yapılandırma araçlarına Discord komut menüsünden erişme.
- **Sharding:** Discord.js otomatik shard yönetimiyle birden fazla shard üzerinde çalışma.

## 🧭 Komutlar

| Alan | Komutlar |
| --- | --- |
| Genel | `/help`, `/ping`, `/botinfo`, `/shards` |
| Seviye | `/rank`, `/leaderboard` |
| Moderasyon | `/ban`, `/kick`, `/clear`, `/wordfilter` |
| Yapılandırma | `/settings`, `/reload` |
| Destek biletleri | `/ticket panel`, `/ticket setup`, `/ticket close`, `/ticket add`, `/ticket remove` |

Komutların bazıları sunucu yöneticisi veya uygun Discord izinlerini gerektirir. `/settings` üzerinden AutoMod, seviye, günlük, karşılama/ayrılma ve bilet sistemlerini yapılandırabilirsiniz.

## 🚀 Kurulum

### Gereksinimler

- Node.js **20.19.0 veya üzeri**
- npm
- Bot uygulaması ve token için [Discord Developer Portal](https://discord.com/developers/applications) erişimi
- Sunucu ayarları ve kullanıcı verilerini kalıcı saklamak için MongoDB

### 1. Projeyi hazırlayın

```bash
git clone https://github.com/nurislam-hocaoglu/SyncordBot.git
cd SyncordBot/Bot
npm install
cp .env.example .env
```

### 2. Ortam değişkenlerini ayarlayın

`Bot/.env` dosyasını açıp değerleri girin:

```env
BOT_TOKEN=Discord_bot_tokeniniz
CLIENT_ID=Discord_uygulama_IDniz
MONGODB_URI=mongodb://localhost:27017/syncord-bot

# İsteğe bağlı: komutları önce bir geliştirme sunucusuna kaydedin
GUILD_ID=Discord_sunucu_IDniz

# İsteğe bağlı: sınırlı prefix komutu (!ping) için
PREFIX=!
```

`BOT_TOKEN` yerine `DISCORD_TOKEN` da kullanabilirsiniz. `GUILD_ID` tanımlanmazsa slash komutları global olarak kaydedilir; global komutların görünmesi biraz zaman alabilir. MongoDB bağlantısı olmadan bot açılmayı dener, ancak sunucu yapılandırması ve seviye/bilet gibi verilerin kalıcı olması için veritabanını ayarlayın.

> **Güvenlik:** `.env` dosyanızı ve bot tokeninizi kimseyle paylaşmayın; tokeni herkese açık bir depoya yüklemeyin.

### 3. Discord botunu yapılandırın

Discord Developer Portal’da botunuz için **Server Members Intent** ve **Message Content Intent** ayrıcalıklı intentlerini etkinleştirin. Botu sunucunuza eklerken `bot` ve `applications.commands` OAuth2 kapsamlarını seçin. Gerekli izinleri kullandığınız özelliklere göre verin; moderasyon, log, rol ve bilet özellikleri farklı sunucu izinleri gerektirebilir.

### 4. Botu çalıştırın

```bash
npm start
```

Geliştirme sırasında shard yöneticisi olmadan tek bot sürecini çalıştırmak için:

```bash
npm run dev
```

## 🗂️ Proje yapısı

```text
SyncordBot/
├── Logolar/                 # Proje logoları
├── README.md
└── Bot/
    ├── bot.js               # Bot istemcisi ve başlangıç
    ├── shard.js             # Sharding yöneticisi
    ├── commands/            # Slash komutları
    ├── events/              # Discord olayları
    └── src/
        ├── handlers/        # Komut ve olay yükleyicileri
        ├── models/          # Mongoose veri modelleri
        ├── modules/         # AutoMod, seviye, bilet ve diğer modüller
        ├── services/        # Veritabanı bağlantısı
        └── utils/           # Ortak yardımcılar
```

## 🛠️ Teknolojiler

**Node.js · Discord.js · MongoDB · Mongoose · dotenv · @napi-rs/canvas**
