// src/modules/automod/filters/wordFilter.js
//
// Kelime Filtresi — Normalizasyon Pipeline'ı
//
// Çalışma akışı:
//   Gelen Mesaj
//     → 1. Küçük harfe çevir
//     → 2. Leetspeak çözümü  (@ → a,  3 → e,  0 → o,  1/! → i)
//     → 3. Sembol temizliği  (noktalama ayraçları kaldırılır)
//     → 4. Tekrar azaltma    (küüüfür → küfür)
//     → 5. Normal metin kontrolü    (\b word boundary)
//     → 6. Boşluklu yazım kontrolü (tüm boşlukları silerek de kontrol)
//     → 7. Whitelist süzgeci
//     → 8. Global kara liste
//     → 9. Sunucuya özel kara liste (MongoDB'den gelir)

const GLOBAL_BANNED = require('./bannedWords');

// ─────────────────────────────────────────────────────────────────────────────
// 1. NORMALIZASYON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Metni botun anlayacağı saf forma indirir.
 * @param {string} text - Ham mesaj metni
 * @returns {string} Normalize edilmiş metin
 */
function normalize(text) {
    let t = text.toLowerCase();

    // Türkçe noktalı/özel harfleri baz harflere sadeleştir (ö->o, ü->u, ç->c, ş->s, ğ->g, ı->i)
    // Böylece hem 'göt' hem 'got', hem 'küfür' hem 'kufur' tek kuralda yakalanır
    t = t
        .replace(/ö/g, 'o')
        .replace(/ü/g, 'u')
        .replace(/ı/g, 'i')
        .replace(/ç/g, 'c')
        .replace(/ş/g, 's')
        .replace(/ğ/g, 'g');

    // Leetspeak dönüşümleri
    t = t
        .replace(/@/g,  'o')   // @ -> o (g@t -> got) ve a için de kontrol edilecek
        .replace(/3/g,  'e')   // 3  → e
        .replace(/0/g,  'o')   // 0  → o
        .replace(/[1!|]/g, 'i') // 1, !, |  → i
        .replace(/\$/g, 's')   // $  → s
        .replace(/5/g,  's')   // 5  → s
        .replace(/4/g,  'a')   // 4  → a
        .replace(/7/g,  't')   // 7  → t
        .replace(/\+/g, 't');  // +  → t

    // Sembol temizliği: harf, rakam ve boşluk dışındaki tüm karakterleri sil
    // Boşlukları koruyoruz — "boşluklu yazım" kontrolü için ayrıca işlenecek
    t = t.replace(/[^\p{L}\p{N}\s]/gu, '');

    // Tekrar eden harfleri teke indir: "küüüüfür" → "küfür"
    // Unicode harfler için \p{L} kullanılır
    t = t.replace(/(\p{L})\1{2,}/gu, '$1$1'); // 3+'ı → 2'ye indir
    // İkinci geçiş: 2'yi de 1'e indir (isteğe bağlı — daha agresif)
    t = t.replace(/(\p{L})\1+/gu, '$1');

    return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. REGEX OLUŞTURUCU
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Bir kelime için word-boundary regex'i oluşturur.
 *
 * Türkçe için not: JavaScript'in \b operatörü ASCII sınırlarını bilir.
 * Türkçe karakterlerin başında/sonunda güvenilir çalışmaz.
 * Bu yüzden "boşluk veya satır başı/sonu" yaklaşımı kullanıyoruz.
 *
 * Strateji:
 *   - Kelimenin önünde: boşluk, satır başı, veya metnin başı
 *   - Kelimenin sonunda: boşluk, satır sonu, veya metnin sonu
 *
 * @param {string} word - Kara listedeki kelime
 * @returns {RegExp}
 */
function buildBoundaryRegex(word) {
    // Regex özel karakterlerini escape et
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Türkçe uyumlu word boundary: başında/sonunda boşluk veya metin sınırı
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, 'iu');
}

/**
 * Türkçe çekim eki desteği için prefix regex oluşturur.
 * "orospu" → "orospusun", "orospuya" gibi ek almış formları da yakalar.
 * Kelimenin önünde boşluk/başlangıç olması şartıyla, sonunda herhangi karakter olabilir.
 *
 * @param {string} word - Kara listedeki kelime
 * @returns {RegExp}
 */
function buildPrefixRegex(word) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Başında boşluk veya metin başı, sonunda herhangi karakter (ek veya boşluk)
    return new RegExp(`(?:^|\\s)${escaped}`, 'iu');
}

// Kelime listelerini önbelleğe al (her mesajda yeniden derleme yapmamak için)
const _regexCache    = new Map(); // tam eşleşme (boundary)
const _prefixCache   = new Map(); // prefix eşleşme (Türkçe ek desteği)

function getRegex(word) {
    if (!_regexCache.has(word)) {
        _regexCache.set(word, buildBoundaryRegex(word));
    }
    return _regexCache.get(word);
}

function getPrefixRegex(word) {
    if (!_prefixCache.has(word)) {
        _prefixCache.set(word, buildPrefixRegex(word));
    }
    return _prefixCache.get(word);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. TEK KELİME KONTROL FONKSİYONLARI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize edilmiş metni bir kelime listesiyle karşılaştırır.
 * Hem normal hem de "boşlukları silinmiş" hali test edilir.
 *
 * @param {string} normalizedText - normalize() çıktısı
 * @param {string[]} wordList - Kontrol edilecek kelime listesi
 * @param {string[]} whitelist - Atlayacak kelimeler (sunucu beyaz listesi)
 * @returns {{ found: boolean, word: string|null }}
 */
function checkAgainstList(normalizedText, wordList, whitelist = []) {
    // Boşluklu versiyon (word boundary için başına/sonuna boşluk ekle)
    const spacedText  = ` ${normalizedText} `;

    // Boşlukları tamamen silinmiş versiyon (k ü f ü r → küfür)
    // Başına ve sonuna boşluk ekliyoruz ki boundary regex çalışsın
    const noSpaceText = ` ${normalizedText.replace(/\s+/g, '')} `;

    for (const word of wordList) {
        // Whitelist kontrolü: bu kelime beyaz listede mi?
        if (whitelist.some(w => w.toLowerCase() === word.toLowerCase())) continue;

        const regex       = getRegex(word);

        // 1. Normal kontrol (tam word boundary ile): "siktir git" → "siktir" yakalar
        if (regex.test(spacedText)) {
            return { found: true, word };
        }

        // 2. Türkçe ek desteği (prefix): "orospusun" → "orospu" prefix'i yakalar
        //    Kısa kelimeler (≤3 harf) için devre dışı: "göt" → "götür" false positive önlenir
        if (word.length > 3) {
            const prefixRegex = getPrefixRegex(word);
            if (prefixRegex.test(spacedText)) {
                return { found: true, word };
            }
        }

        // 3. Boşluklu yazım kontrolü: "k ü f ü r" → boşluklar silinince "küfür" eşleşir
        if (regex.test(noSpaceText)) {
            return { found: true, word };
        }

        // 4. Boşluklu yazım + prefix (ek almış boşluklu form) — yine kısa kelimeler hariç
        if (word.length > 3) {
            const prefixRegex = getPrefixRegex(word);
            if (prefixRegex.test(noSpaceText)) {
                return { found: true, word };
            }
        }

    }

    return { found: false, word: null };
}


// ─────────────────────────────────────────────────────────────────────────────
// 4. ANA FİLTRE FONKSİYONU
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Gelen mesaj içeriğini word filter pipeline'ından geçirir.
 *
 * @param {string} content - Mesajın ham metni (message.content)
 * @param {object} options - Filtre seçenekleri
 * @param {string[]} [options.guildBannedWords=[]] - Sunucuya özel kara liste (DB'den)
 * @param {string[]} [options.whitelist=[]]         - Sunucuya özel beyaz liste (DB'den)
 * @returns {{ triggered: boolean, word: string|null, source: 'global'|'guild'|null }}
 */
function checkContent(content, options = {}) {
    const { guildBannedWords = [], whitelist = [] } = options;

    // Adım 1–4: Normalizasyon
    const normalized = normalize(content);

    // Adım 5–7: Global kara liste kontrolü
    const globalResult = checkAgainstList(normalized, GLOBAL_BANNED, whitelist);
    if (globalResult.found) {
        return { triggered: true, word: globalResult.word, source: 'global' };
    }

    // Adım 8–9: Sunucuya özel kara liste kontrolü
    if (guildBannedWords.length > 0) {
        const guildResult = checkAgainstList(normalized, guildBannedWords, whitelist);
        if (guildResult.found) {
            return { triggered: true, word: guildResult.word, source: 'guild' };
        }
    }

    return { triggered: false, word: null, source: null };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. TEST YARDIMCISI (Geliştirme aşamasında kullanım için)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizasyonun nasıl çalıştığını görmek için debug aracı.
 * Üretimde çağırmayın.
 * @param {string} text
 */
function debugNormalize(text) {
    console.log('[WordFilter Debug]');
    console.log('  Orijinal  :', text);
    console.log('  Normalize :', normalize(text));
}

module.exports = {
    checkContent,
    normalize,
    debugNormalize,
};
