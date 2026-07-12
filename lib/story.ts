// Hikaye metinleri — giriş anlatısı + bölüm arası tekinsiz notlar.
// Tamamı özgün (telif yok). Atmosfer/korku tonu.

export const INTRO_TITLE = "Neden buradasın?";

export const INTRO_LINES: string[] = [
  "Ayıldığında etrafın kapkaranlıktı. Ne bir kapı, ne bir pencere — sadece nemli taş ve senin titrek el fenerin.",
  "Uzaklardan boğuk bir düğün marşı geliyor. Ama burada kutlama yok; bir zamanlar sevilen, sonra terk edilen gelinler var — yüzleri kanla örtülü, gözleri seni arıyor.",
  "Seni fark ettikleri an durmuyorlar. Çıkışı bulmalısın. Ama çıkış, ancak onlardan birini sonsuza dek susturursan açılıyor.",
];

// Bölüm arası kısa notlar (levelclear ekranında gösterilir)
const LEVEL_NOTES: string[] = [
  "Duvarların ardından bir ağıt yükseliyor.",
  "Fenerin biraz daha zayıfladı. Karanlık yaklaşıyor.",
  "Birileri adını fısıldadı. Ama kimse yoktu.",
  "Taş zeminde kurumuş bir gelin buketi. Hâlâ ıslak.",
  "Uzakta bir org çalıyor — çalan kimse yok.",
  "Bu koridoru daha önce gördün. Ya da o seni gördü.",
  "Kan izleri seni takip ediyor gibi… hayır, sen onları.",
  "Bir düğün fotoğrafı. Bütün yüzler kazınmış.",
  "Ne kadar derine inersen, fısıltılar o kadar çoğalıyor.",
  "Gelinlerin sayısı artıyor. Ya da sen yavaşlıyorsun.",
];

// Bölüme göre deterministik not (ilerleme hissi için)
export function flavorForLevel(level: number): string {
  const i = ((level - 1) % LEVEL_NOTES.length + LEVEL_NOTES.length) % LEVEL_NOTES.length;
  return LEVEL_NOTES[i];
}
