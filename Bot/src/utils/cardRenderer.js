// src/utils/cardRenderer.js
/**
 * Syncord — Ortak Canvas Kart Oluşturucu
 * ---------------------------------------------------------------
 * "Görsel Odaklı Tasarım (Canvas / Banner)" şablonunun tek merkezi
 * uygulaması. Karşılama (Welcome), Ayrılma (Goodbye) ve Seviye Kartı
 * (Rank) modülleri aynı görsel dili bu dosya üzerinden paylaşır:
 *
 *  - Arka Plan: Koyu gradyan (#1E1B2E → #0F0E17)
 *  - Sol Header: Yuvarlak profil fotoğrafı + 4px mor halka
 *  - Ana Başlık: Bold, Beyaz
 *  - Alt Başlık: Açık Gri
 *  - Boyut: 800x300 px (varsayılan) — 1024x450 px de desteklenir
 */

const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const DESIGN = {
    width: 800,
    height: 300,
    gradientStart: '#1E1B2E', // Açık mor ton
    gradientEnd: '#0F0E17',   // Koyu gri/siyah
    accent: '#5865F2',        // Discord mavisi (halka & vurgu)
    accentSoft: '#7289DA',    // Yumuşak mor
    titleColor: '#FFFFFF',    // Beyaz başlık
    subtitleColor: '#B9BBBE', // Açık gri alt başlık
    avatarRadius: 56,         // Avatar yarıçapı (112px çap)
    avatarX: 116,
    textX: 208,
    titleSize: 38,
    subtitleSize: 20
};

// ─────────────────────────────────────────────
//  Font Kaydı (Türkçe karakter desteği: ş, ğ, İ, ü...)
// ─────────────────────────────────────────────
let FONT_REGULAR_FAMILY = 'sans-serif';
let FONT_BOLD_FAMILY = 'sans-serif';

(function registerFonts() {
    try {
        // 1. Önce proje içindeki Noto Sans fontlarını dene (cross-platform)
        const assetsDir = path.join(__dirname, '..', 'assets', 'fonts');
        const regular = path.join(assetsDir, 'NotoSans-Regular.ttf');
        const bold = path.join(assetsDir, 'NotoSans-Bold.ttf');

        if (fs.existsSync(regular)) {
            GlobalFonts.registerFromPath(regular, 'SyncordUI');
            FONT_REGULAR_FAMILY = 'SyncordUI';
            console.log('[CardRenderer] ✅ Noto Sans Regular yüklendi');
        }
        if (fs.existsSync(bold)) {
            GlobalFonts.registerFromPath(bold, 'SyncordUI-Bold');
            FONT_BOLD_FAMILY = 'SyncordUI-Bold';
            console.log('[CardRenderer] ✅ Noto Sans Bold yüklendi');
        }

        // 2. Fallback: Windows sistem fontları (Segoe UI)
        if (FONT_REGULAR_FAMILY === 'sans-serif' || FONT_BOLD_FAMILY === 'sans-serif') {
            const fontsDir = process.env.WINDIR
                ? path.join(process.env.WINDIR, 'Fonts')
                : 'C:\\Windows\\Fonts';
            const sysRegular = path.join(fontsDir, 'segoeui.ttf');
            const sysBold = path.join(fontsDir, 'segoeuib.ttf');

            if (FONT_REGULAR_FAMILY === 'sans-serif' && fs.existsSync(sysRegular)) {
                GlobalFonts.registerFromPath(sysRegular, 'SyncordUI');
                FONT_REGULAR_FAMILY = 'SyncordUI';
            }
            if (FONT_BOLD_FAMILY === 'sans-serif' && fs.existsSync(sysBold)) {
                GlobalFonts.registerFromPath(sysBold, 'SyncordUI-Bold');
                FONT_BOLD_FAMILY = 'SyncordUI-Bold';
            }
        }
    } catch (_) {
        // Font kaydı başarısızsa sistem sans-serif kullanılır
    }
})();

function titleFont(size = DESIGN.titleSize) {
    return FONT_BOLD_FAMILY === 'sans-serif'
        ? `bold ${size}px sans-serif`
        : `${size}px "${FONT_BOLD_FAMILY}"`;
}

function subtitleFont(size = DESIGN.subtitleSize) {
    return FONT_REGULAR_FAMILY === 'sans-serif'
        ? `${size}px sans-serif`
        : `${size}px "${FONT_REGULAR_FAMILY}"`;
}

// Metni verilen genişliğe sığdırır (taşma koruması)
function fitText(ctx, text, maxWidth) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && ctx.measureText(t + '…').width > maxWidth) {
        t = t.slice(0, -1);
    }
    return t.trimEnd() + '…';
}

// Yuvarlatılmış dikdörtgen çizer
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// Avatar görselini yükler (ağ hatasında null döner)
async function loadAvatar(url) {
    try {
        if (typeof fetch === 'function') {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const buffer = Buffer.from(await res.arrayBuffer());
            return await loadImage(buffer);
        }
        return await loadImage(url);
    } catch (err) {
        console.warn('[CardRenderer] ⚠️ Avatar yüklenemedi:', err.message);
        return null;
    }
}

/**
 * Ortak "Görsel Odaklı Tasarım" kartını üretir → PNG Buffer döner
 *
 * @param {object} opts
 * @param {number} [opts.width=800]
 * @param {number} [opts.height=300]
 * @param {string} [opts.avatarURL] - Kullanıcı avatar URL'i
 * @param {string} [opts.title] - Ana başlık (Bold, Beyaz)
 * @param {string} [opts.subtitle] - Alt başlık (Açık Gri)
 * @param {string} [opts.accent] - Halka / vurgu rengi
 * @param {string} [opts.accentSoft] - Dış aura rengi
 * @param {(ctx:any, meta:object)=>void} [opts.extraDraw] - Ek çizim (örn. ilerleme çubuğu)
 */
async function renderCard({
    width = DESIGN.width,
    height = DESIGN.height,
    avatarURL,
    title,
    subtitle,
    accent = DESIGN.accent,
    accentSoft = DESIGN.accentSoft,
    extraDraw
} = {}) {
    const W = Number(width) || DESIGN.width;
    const H = Number(height) || DESIGN.height;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // 1) Koyu gradyan arka plan (#1E1B2E → #0F0E17)
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, DESIGN.gradientStart);
    grad.addColorStop(1, DESIGN.gradientEnd);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // 2) Dekoratif mor parlamalar (modern görünüm)
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(W - 40, -30, 170, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(20, H + 50, 140, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3) Sol header: Yuvarlak profil fotoğrafı
    const cx = DESIGN.avatarX;
    const cy = H / 2;
    const r = DESIGN.avatarRadius;

    // Dış yumuşak aura
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = accentSoft;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 12, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Avatar (dairesel kırpma)
    const img = avatarURL ? await loadAvatar(avatarURL) : null;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    if (img) {
        const ratio = Math.max((r * 2) / img.width, (r * 2) / img.height);
        const w = img.width * ratio;
        const h = img.height * ratio;
        ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h);
    } else {
        ctx.fillStyle = '#2B2838';
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.fillStyle = accentSoft;
        ctx.font = subtitleFont(r);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', cx, cy + 2);
    }
    ctx.restore();

    // 4px halka ile çevreleme
    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
    ctx.stroke();

    // 4) Ana Başlık (Bold, Beyaz)
    const maxTextWidth = W - DESIGN.textX - 48;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    ctx.font = titleFont();
    ctx.fillStyle = DESIGN.titleColor;
    ctx.fillText(fitText(ctx, title || '', maxTextWidth), DESIGN.textX, cy - 28);

    // Vurgu çizgisi
    ctx.fillStyle = accent;
    roundRect(ctx, DESIGN.textX, cy - 3, 64, 5, 2.5);
    ctx.fill();

    // 5) Alt Başlık (Açık Gri)
    ctx.font = subtitleFont();
    ctx.fillStyle = DESIGN.subtitleColor;
    ctx.fillText(fitText(ctx, subtitle || '', maxTextWidth), DESIGN.textX, cy + 36);

    // 6) Ek çizim (opsiyonel — örn. rank ilerleme çubuğu)
    if (typeof extraDraw === 'function') {
        extraDraw(ctx, {
            width: W,
            height: H,
            cx,
            cy,
            r,
            textX: DESIGN.textX,
            maxTextWidth,
            accent,
            accentSoft,
            fitText: (t, w) => fitText(ctx, t, w),
            roundRect: (x, y, w, h, rad) => roundRect(ctx, x, y, w, h, rad),
            titleFont,
            subtitleFont
        });
    }

    return canvas.encode('png');
}

module.exports = {
    DESIGN,
    renderCard,
    fitText,
    roundRect,
    titleFont,
    subtitleFont,
    loadAvatar
};

