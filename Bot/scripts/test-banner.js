// scripts/test-banner.js
// Karşılama / Ayrılma / Seviye kartı üreticilerini bot'a bağlanmadan test eder
const fs = require('fs');
const path = require('path');
const welcome = require('../src/modules/welcome');
const goodbye = require('../src/modules/goodbye');
const { renderCard } = require('../src/utils/cardRenderer');

const fakeMember = {
    user: {
        id: '123456789012345678',
        username: 'Nurislam',
        displayAvatarURL: () => 'https://cdn.discordapp.com/embed/avatars/3.png'
    },
    displayName: 'Nurislam',
    guild: {
        name: 'Syncord Topluluğu',
        memberCount: 1284
    }
};

function isPng(buffer) {
    return buffer.length > 8 &&
        buffer[0] === 0x89 && buffer[1] === 0x50 &&
        buffer[2] === 0x4E && buffer[3] === 0x47;
}

async function save(name, bufferPromise) {
    const buffer = await bufferPromise;
    const outPath = path.join(__dirname, name);
    fs.writeFileSync(outPath, buffer);
    const ok = isPng(buffer);
    console.log(`[Test] ${ok ? '✅' : '❌'} ${name}: ${(buffer.length / 1024).toFixed(1)} KB → ${outPath}`);
    return ok;
}

(async () => {
    let allOk = true;

    // 1) Karşılama banner'ı
    console.log('[Test] 🎨 Karşılama banner üretiliyor...');
    allOk &= await save('welcome-test.png', welcome.buildBanner(fakeMember));

    // 2) Ayrılma banner'ı
    console.log('[Test] 🎨 Ayrılma banner üretiliyor...');
    allOk &= await save('goodbye-test.png', goodbye.buildBanner(fakeMember));

    // 3) Seviye (rank) kartı — ilerleme çubuğu ile
    console.log('[Test] 🎨 Seviye kartı üretiliyor...');
    const progressPercent = 64;
    const neededForNext = 1250;
    allOk &= await save('rank-test.png', renderCard({
        avatarURL: fakeMember.user.displayAvatarURL(),
        title: fakeMember.user.username,
        subtitle: `Seviye 12 • Sıralama #3 • 4.532 XP`,
        accent: '#5865F2',
        accentSoft: '#7289DA',
        extraDraw: (ctx, m) => {
            const barX = m.textX;
            const barY = m.height - 46;
            const barW = m.width - m.textX - 48;
            const barH = 14;

            ctx.font = m.subtitleFont(14);
            ctx.fillStyle = '#B9BBBE';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(`Sonraki seviye: ${neededForNext.toLocaleString('tr-TR')} XP`, barX, barY - 10);
            ctx.textAlign = 'right';
            ctx.fillText(`%${progressPercent}`, barX + barW, barY - 10);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
            m.roundRect(barX, barY, barW, barH, barH / 2);
            ctx.fill();

            const fillW = Math.max(barH, Math.round((barW * progressPercent) / 100));
            const pGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            pGrad.addColorStop(0, '#5865F2');
            pGrad.addColorStop(1, '#7289DA');
            ctx.fillStyle = pGrad;
            m.roundRect(barX, barY, fillW, barH, barH / 2);
            ctx.fill();
        }
    }));

    console.log(allOk ? '[Test] ✅ Tüm görseller başarıyla üretildi!' : '[Test] ❌ Bazı görseller başarısız!');
    process.exit(allOk ? 0 : 1);
})().catch(err => {
    console.error('[Test] ❌ Hata:', err);
    process.exit(1);
});