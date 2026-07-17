// Hikaye metinleri — giriş anlatısı + bölüm arası tekinsiz notlar.
// Tamamı özgün (telif yok). Atmosfer/korku tonu.

export const INTRO_TITLE = "Neden buradasın?";

// KISA tutulur: brifing mobilde tek ekrana sığmalı — uzun metin sayfayı taşırıyordu.
// Atmosfer + tek kritik kural (çıkış nasıl açılır) korunur. ~390 → ~190 karakter.
export const INTRO_LINES: string[] = [
  "Ayıldığında etraf kapkaranlıktı. Ne kapı, ne pencere — yalnız nemli taş ve fenerin.",
  "Uzaktan boğuk bir düğün marşı geliyor. Kanlı yüzler seni arıyor.",
  "Çıkış, ancak birini sonsuza dek susturursan açılır.",
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
