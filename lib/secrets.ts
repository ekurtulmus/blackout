// Gizli son / sırlar — tek kişilik bölümlere serpiştirilen "düğün fotoğrafı
// parçaları". Hepsi (10) toplanınca gelinin gerçek hikayesi + gizli son açılır.
// Tamamı özgün (telif yok). Parça N, bölüm N'de bulunur.

export const FRAGMENT_COUNT = 10;

export const FRAGMENTS: string[] = [
  "Solmuş bir davetiye: “Sizi kızımızın düğününe bekleriz.” Tarih okunmuyor.",
  "Yırtık bir fotoğraf: gülümseyen bir gelin, yanındaki yer bomboş.",
  "Buruşuk bir mektup: “Gelmeyeceğini biliyordum, ama yine de bekledim.”",
  "Kurumuş bir buket; kurdelesinde tek kelime: “…için.”",
  "Kırık ayna parçası; arkasına kazınmış: “Neden?”",
  "Bir günlük sayfası: “Herkes gitti. Ben hâlâ beyazlar içindeyim.”",
  "Paslı bir yüzük, iç yüzeyinde: “Sonsuza dek” — bir yalan.",
  "Duvara çizilmiş çentikler: bekleyişin günleri, sayısız.",
  "Bir fotoğraf daha: gelin artık gülmüyor, gözleri kararmış.",
  "Son parça: damadın adı her yerden silinmiş. Geriye yalnız gelin kaldı.",
];

export const SECRET_ENDING_TITLE = "Gerçek";

export const SECRET_ENDING: string[] = [
  "Parçalar birleşince gerçek ortaya çıkar: terk edilen gelin, düğün gününü sonsuza dek yaşamaya mahkûm oldu.",
  "Beklemekten, öfkeden ve kırgınlıktan doğan bir lanet… ta ki biri onu görene, duyana ve hikayesini tamamlayana kadar.",
  "Belki de kaçış hiçbir zaman çıkıştan geçmiyordu. Belki tek gereken, sonunda birinin dinlemesiydi.",
  "Gelinler bir an duraklar. Ve karanlık, ilk kez, biraz daha az soğuktur.",
];

// Kaç parça toplandığında hedefe ulaşıldı
export function fragmentText(level: number): string {
  const i = level - 1;
  return FRAGMENTS[i] ?? "Bir sır daha…";
}
