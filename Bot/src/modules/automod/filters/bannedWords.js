// src/modules/automod/filters/bannedWords.js
//
// Global Kara Liste — Tüm sunucularda geçerli, ağır küfürler ve hakaret içeren kelimeler.
//
// KURALLAR:
//   - Kelimeler küçük harf ve normalize edilmiş formda yazılır.
//   - Normalizasyon (leetspeak, sembol temizliği vb.) pipeline'da yapılır; burada
//     saf hali yeterlidir.
//   - Kelimeleri tek tek sınır (word boundary) ile kontrol eden filtre wordFilter.js'dedir.
//   - Bu listeyi büyütmek/küçültmek için sadece bu dosyayı düzenlemen yeterli.
//
// NOT: Bu dosya küfür içermektedir. Yalnızca moderasyon amacıyla kullanılmaktadır.

module.exports = [
    // ── Ağır Küfürler ─────────────────────────────────────────────────────────
    'orospu',
    'oruspu',
    'orospucocugu',
    'oruspucocugu',
    'orospuçocuğu',
    'oruspuçocuğu',
    'bok',
    'sik',
    'sikik',
    'sikim',
    'sikeyim',
    'siktir',
    'amk',
    'amına',
    'amını',
    'amınakoyim',
    'amınakoyayım',
    'got',
    'göt',
    'gotveren',
    'götveren',
    'oc',
    'oç',
    'oğlum',    // bağlam dışında hakaret olarak kullanılan form
    'piç',
    'piçlik',
    'gerizekali',   // gerizekalı → normalize edilmiş form (ı→i)
    'gerzek',
    'ibne',
    'bok',
    'boktan',
    'yarrak',
    'yarrağı',
    'yarak',
    'sürtük',
    'serefsiz',
    'şerefsiz',

    // ── Nefret Söylemi / Ayrımcılık ───────────────────────────────────────────
    // (Bu bölüm kasıtlı olarak kısa tutulmuş; sunucu ihtiyacına göre genişletilebilir)
    'gavur',       // hakaret amacıyla kullanıldığında
    'zenci',       // ırkçı bağlamda
];
