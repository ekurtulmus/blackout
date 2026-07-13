// BLACKOUT — günlük/not parçaları (Faz F / Madde 16). Bölümlere serpiştirilen sayfalar;
// toplandıkça hikâye açılır. Menüde "Günlük" ekranından okunur. localStorage'da saklanır.

export type JournalEntry = { id: number; title: string; text: string };

export const JOURNAL: JournalEntry[] = [
  { id: 0, title: "Islak Bir Sayfa", text: "…düğün sabahıydı. Çanlar çalmıyordu; çalan yalnızca kafamın içindeki o uğultuydu. Beni buraya getiren yolu hatırlamıyorum." },
  { id: 1, title: "Kömürle Yazılmış", text: "Gelinler ağlamıyor. Ağlıyormuş gibi ses çıkarıyorlar ama gözleri kuru. Sanırım ağlamayı çoktan unuttular — tıpkı benim gibi." },
  { id: 2, title: "Yırtık Davetiye", text: "Adım hâlâ davetiyede yazılı. Ama yanında bir tarih yok. Sanki bu düğün hiç bitmeyecek, ben ondan kaçtıkça o beni bekleyecek." },
  { id: 3, title: "Bir Çocuğun Çizimi", text: "Duvarda küçük bir el, mumları çizmiş. Üç mum. Altına 'onları yakma' yazmış. Ama karanlıkta insan yakmadan durabiliyor mu?" },
  { id: 4, title: "Kilit Sesleri", text: "Her çıkış bir başkasına açılıyor. Kapıları saydım, sonra saymayı bıraktım. Kapı yok aslında — sadece daha derin bir karanlık var." },
  { id: 5, title: "Son Not", text: "Eğer bunu okuyorsan, sen de buradasın demektir. Fenerini kıs, nefesini tut. Ve unutma: en sessiz gelin, en yakın olandır." },
];

const KEY = "blackout_journal";
let mem: number[] = [];

export function getCollected(): number[] {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return mem.slice();
}

// Topla; yeni sayfaysa true döner.
export function collectNote(id: number): boolean {
  const cur = getCollected();
  if (cur.includes(id)) return false;
  const next = [...cur, id];
  mem = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* geç */
  }
  return true;
}

export function journalById(id: number): JournalEntry | undefined {
  return JOURNAL.find((e) => e.id === id);
}
