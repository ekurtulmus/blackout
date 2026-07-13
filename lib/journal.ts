// BLACKOUT — günlük/not parçaları (Faz F / Madde 16). Bölümlere serpiştirilen sayfalar;
// toplandıkça hikâye açılır. Menüde "Günlük" ekranından okunur. localStorage'da saklanır.

export type JournalEntry = { id: number; title: string; text: string };

// 14 sayfa — hepsi OYUNCUNUN ağzından, dağınık bulunur. Sıra numarası hikâye
// akışıdır: baştaki hafıza kaybından, sonundaki "kaçan damat benim" kabullenişine.
export const JOURNAL: JournalEntry[] = [
  { id: 0, title: "İlk Uyanış", text: "Karanlıkta gözlerimi açtım. Nerede olduğumu, buraya nasıl geldiğimi bilmiyorum. Elimde bir fener, göğsümde adı olmayan bir korku var." },
  { id: 1, title: "Islak Bir Sayfa", text: "…düğün sabahıydı. Çanlar çalmıyordu; çalan yalnızca kafamın içindeki o uğultuydu. Beni buraya getiren yolu bir türlü hatırlayamıyorum." },
  { id: 2, title: "Kömürle Yazılmış", text: "Gelinler ağlamıyor. Ağlıyormuş gibi ses çıkarıyorlar ama gözleri kuru. Sanırım ağlamayı çoktan unuttular — tıpkı benim gibi." },
  { id: 3, title: "Yırtık Davetiye", text: "Adım hâlâ davetiyede yazılı. Ama yanında bir tarih yok. Sanki bu düğün hiç bitmeyecek; ben kaçtıkça o beni beklemeye devam edecek." },
  { id: 4, title: "Bir Çocuğun Çizimi", text: "Duvarda küçük bir el, üç mum çizmiş. Altına 'onları yakma' yazmış. Ama karanlıkta insan yakmadan durabiliyor mu gerçekten?" },
  { id: 5, title: "Kilit Sesleri", text: "Her çıkış bir başkasına açılıyor. Kapıları saydım, sonra saymayı bıraktım. Aslında kapı yok — yalnızca daha derin bir karanlık var." },
  { id: 6, title: "Tanıdık Bir Koku", text: "Bu salon tanıdık kokuyor: mum isi, solmuş çiçek, bir de… tütsü. Burayı biliyorum. Ama nereden bildiğimi hatırlamak istemiyorum." },
  { id: 7, title: "Aynalardan Kaçıyorum", text: "Artık aynalara bakmıyorum. Baktığımda gördüğüm yüz bir yabancının değil — benim, ama daha yaşlı, daha suçlu. Bir şey saklıyor gibi." },
  { id: 8, title: "Fenerin Kabzası", text: "Bu fener elime fazla iyi oturuyor; sanki bana göre yapılmış. Ya da ben ona. Parmaklarım, hiç düşünmeden onun eskimiş yerlerini buluyor." },
  { id: 9, title: "O İsim", text: "Gelinler bir isim fısıldıyor. Dün gece fark ettim: o isme dönüp bakıyorum. Çünkü o isim benim. Bunca zaman beni çağırıyorlarmış." },
  { id: 10, title: "Neyden Kaçıyorum?", text: "Koşuyorum, koşuyorum — ama neyden? Her koridor beni aynı yere, o sunağa geri getiriyor. Belki kaçtığım şey dışarıda değil, içimde." },
  { id: 11, title: "Bir Yemin", text: "Şimdi hatırlıyorum. Bir söz vermiştim. Bir el tutmuş, 'hep burada olacağım' demiştim. Sonra o gece… ayaklarım beni karanlığa taşıdı." },
  { id: 12, title: "Son Not", text: "Eğer bunu okuyorsan, sen de buradasın demektir. Fenerini kıs, nefesini tut. Ve unutma: en sessiz gelin, en yakın olandır." },
  { id: 13, title: "Kal", text: "Belki çıkış hiçbir zaman kurtuluş değildi. Belki tek yapmam gereken durmak, arkamı dönmek ve bu kez… gitmemek. Belki o zaman fısıltılar diner." },
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
