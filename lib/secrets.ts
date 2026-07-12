// Gizli Son / Sırlar — GÖREV MODUNA bağlı. Her görev tamamlanınca KARIŞIK
// eşlemeyle 1 sır açılır (Görev 1 → Sır 3 gibi). 8 görev = 8 sır. Hepsi
// açılınca gizli son "Gerçek" görünür. Metinler 120-200 harf, birbirine bağlı.
// Görseller: kendi kendine yeten sepya SVG (dış dosya yok, telif yok).

export type Secret = {
  id: number; // 1..8 (hikaye sırası)
  title: string;
  text: string; // 120-200 harf
  svg: string; // sepya illüstrasyon (tam <svg> dizesi)
};

const FR = `<rect width="240" height="180" fill="#e8dcc0"/><rect x="7" y="7" width="226" height="166" fill="none" stroke="#b7a683" stroke-width="3"/>`;
const wrap = (inner: string) =>
  `<svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">${FR}${inner}</svg>`;

export const SECRETS: Secret[] = [
  {
    id: 1,
    title: "Düğün Günü",
    text:
      "Onu bir haziran sabahı beyazlar içinde gördüler; yüzünde ışık, elinde taze çiçekler. O gün herkes mutluydu. Kimse bunun, salonun son mutlu günü olacağını bilmiyordu.",
    svg: wrap(
      `<circle cx="120" cy="52" r="17" fill="#cbb892"/><path d="M120 69 L150 148 L90 148 Z" fill="#d9cbaa"/><path d="M120 69 L120 148" stroke="#b7a683" stroke-width="2"/><circle cx="120" cy="118" r="7" fill="#9c6a6a"/><circle cx="112" cy="124" r="5" fill="#9c6a6a"/><circle cx="128" cy="124" r="5" fill="#9c6a6a"/>`
    ),
  },
  {
    id: 2,
    title: "Boş Sandalye",
    text:
      "Saatler geçti, mumlar eridi, davetliler fısıldaştı. Damadın sandalyesi boş kaldı. Gelin kapıya baktı, baktı, baktı — ama kapı bir daha hiç açılmadı.",
    svg: wrap(
      `<rect x="92" y="72" width="56" height="9" fill="#6f5c43"/><rect x="92" y="72" width="9" height="72" fill="#6f5c43"/><rect x="139" y="72" width="9" height="72" fill="#6f5c43"/><rect x="88" y="40" width="64" height="34" fill="none" stroke="#6f5c43" stroke-width="6"/><path d="M40 40 L40 150" stroke="#b7a683" stroke-width="4"/><path d="M200 40 L200 150" stroke="#b7a683" stroke-width="4"/>`
    ),
  },
  {
    id: 3,
    title: "Bekleyiş",
    text:
      "Salonu terk etmedi. “Gelecek,” dedi, “söz vermişti.” Gündüzler geceye döndü, çiçekler soldu, konuklar dağıldı. O ise gelinliğiyle aynı yerde beklemeye devam etti.",
    svg: wrap(
      `<circle cx="80" cy="55" r="14" fill="#cbb892"/><path d="M80 69 L104 150 L56 150 Z" fill="#d9cbaa"/><circle cx="165" cy="80" r="34" fill="none" stroke="#6f5c43" stroke-width="4"/><path d="M165 80 L165 55" stroke="#6f5c43" stroke-width="4"/><path d="M165 80 L185 88" stroke="#6f5c43" stroke-width="3"/>`
    ),
  },
  {
    id: 4,
    title: "Okunmayan Mektuplar",
    text:
      "Her gün bir mektup yazdı, hiç göndermeden. “Neredesin? Üşüyorum, bu beyaz artık ağırlaşıyor.” Yüzlerce zarf birikti; hiçbiri okunmadı, hiçbiri yanıtlanmadı.",
    svg: wrap(
      `<g stroke="#6f5c43" stroke-width="2" fill="#ddcfae"><rect x="70" y="110" width="100" height="36"/><rect x="78" y="86" width="100" height="36"/><rect x="86" y="62" width="100" height="36"/></g><path d="M86 62 L136 92 L186 62" fill="none" stroke="#6f5c43" stroke-width="2"/>`
    ),
  },
  {
    id: 5,
    title: "Aynadaki Yabancı",
    text:
      "Bir gece aynaya baktığında kendini tanımadı: duvağın altında kuruyan bir yüz, öfkeyle parlayan gözler. Beklemek onu değiştirmişti; artık gelin değil, bekleyişin ta kendisiydi.",
    svg: wrap(
      `<rect x="80" y="34" width="80" height="112" rx="38" fill="#cdbb95" stroke="#6f5c43" stroke-width="4"/><path d="M120 40 L108 90 L128 96 L112 146" fill="none" stroke="#8a6b6b" stroke-width="2"/><circle cx="106" cy="80" r="5" fill="#7a1f1f"/><circle cx="134" cy="80" r="5" fill="#7a1f1f"/>`
    ),
  },
  {
    id: 6,
    title: "Yalnız Değil",
    text:
      "Yalnız değildi. Koridorlarda başkaları da vardı — terk edilmiş, unutulmuş, hepsi beyazlar içinde. Aynı acı onları bir araya getirmişti; şimdi birlikte dolaşıyorlardı.",
    svg: wrap(
      `<g fill="#d9cbaa" stroke="#b7a683" stroke-width="2"><path d="M70 70 L88 150 L52 150 Z"/><path d="M120 58 L142 150 L98 150 Z"/><path d="M170 70 L188 150 L152 150 Z"/></g><circle cx="70" cy="58" r="11" fill="#cbb892"/><circle cx="120" cy="46" r="12" fill="#cbb892"/><circle cx="170" cy="58" r="11" fill="#cbb892"/>`
    ),
  },
  {
    id: 7,
    title: "Damadın Sırrı",
    text:
      "Damat aslında hiç gelmedi çünkü çoktan gitmişti — çok önceden, sessizce. Ona söylemeye kimse cesaret edemedi. Gelin, artık var olmayan birini ömür boyu bekledi.",
    svg: wrap(
      `<g opacity="0.35"><circle cx="120" cy="52" r="16" fill="#6f5c43"/><path d="M120 68 L146 150 L94 150 Z" fill="#6f5c43"/></g><path d="M120 68 L146 150 L94 150 Z" fill="none" stroke="#6f5c43" stroke-width="2" stroke-dasharray="5 5"/><path d="M78 120 L162 60" stroke="#7a1f1f" stroke-width="3"/>`
    ),
  },
  {
    id: 8,
    title: "Çağrı",
    text:
      "İstediği intikam değildi. Yalnızca birinin durup onu görmesini, hikâyesini dinlemesini istiyordu. Belki bu labirent bir hapishane değil, bir çağrıydı: “Beni hatırla.”",
    svg: wrap(
      `<path d="M120 145 C60 100 70 50 120 78 C170 50 180 100 120 145 Z" fill="#9c3a3a" stroke="#6f5c43" stroke-width="2"/><path d="M120 78 L120 145" stroke="#7a2a2a" stroke-width="2" opacity="0.6"/>`
    ),
  },
];

// KARIŞIK eşleme: görev id (1..8) → sır indeksi (0..7). Birebir (bijection).
export const MISSION_SECRET: Record<number, number> = {
  1: 2, // Görev 1 → Sır 3
  2: 4, // Görev 2 → Sır 5
  3: 0, // Görev 3 → Sır 1
  4: 6, // Görev 4 → Sır 7
  5: 1, // Görev 5 → Sır 2
  6: 7, // Görev 6 → Sır 8
  7: 3, // Görev 7 → Sır 4
  8: 5, // Görev 8 → Sır 6
};

export const SECRET_COUNT = SECRETS.length;

export const SECRET_ENDING_TITLE = "Gerçek";
export const SECRET_ENDING: string[] = [
  "Parçalar birleşince gerçek ortaya çıkar: terk edilen gelin, düğün gününü sonsuza dek yaşamaya mahkûm oldu.",
  "Beklemekten, öfkeden ve kırgınlıktan doğan bir lanet… ta ki biri onu görene, duyana ve hikâyesini tamamlayana kadar.",
  "Belki de kaçış hiçbir zaman çıkıştan geçmiyordu. Belki tek gereken, sonunda birinin dinlemesiydi.",
  "Gelinler bir an duraklar. Ve karanlık, ilk kez, biraz daha az soğuktur.",
];
