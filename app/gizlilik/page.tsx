import type { Metadata } from "next";

// GİZLİLİK POLİTİKASI — Google Play ZORUNLU tutuyor (mağaza kaydına bu sayfanın
// adresi girilir: https://jilted.vercel.app/gizlilik).
//
// ⚠️ METİN KODA GÖRE YAZILDI, TAHMİNE GÖRE DEĞİL. Oyun taranarak doğrulandı:
// analitik/reklam/izleyici YOK (gtag, google-analytics, sentry, posthog, admob → sıfır sonuç),
// hesap yok, e-posta/şifre yok, ödeme yok, sunucuda veritabanı kaydı yok.
// Oyuna yeni bir servis (reklam, analitik, oyuncu veritabanı) eklenirse BU SAYFA GÜNCELLENMELİ —
// yanlış gizlilik beyanı Play'de uygulamanın kaldırılma sebebidir.

// İLETİŞİM: bu sayfada e-posta adresi YAYINLANMIYOR (kullanıcı isteği — açık adres spam çeker).
// Yerine Play mağaza kaydındaki geliştirici iletişim bilgisine yönlendiriliyor; Play zaten
// her uygulama için orada bir iletişim yolu göstermeyi zorunlu tutuyor, yani politika
// "ulaşılabilir iletişim" şartını karşılıyor.
const SON_GUNCELLEME = "21 Temmuz 2026";

export const metadata: Metadata = {
  title: "Gizlilik Politikası — JILTED",
  description: "JILTED oyununun hangi verileri işlediği, nerede sakladığı ve nasıl sileceğin.",
};

function Blok({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontFamily: "Cinzel, serif", fontSize: 21, color: "var(--ink-title)", margin: "0 0 10px" }}>
        {baslik}
      </h2>
      <div style={{ color: "var(--ink-2)", lineHeight: 1.75, fontSize: 15.5 }}>{children}</div>
    </section>
  );
}

export default function GizlilikPage() {
  return (
    // .doc-scr: body { overflow:hidden } (oyun için gerekli) sayfayı kaydırılamaz
    // yapıyordu → sayfanın kendisi kaydırma kabı (bkz. globals.css).
    <main className="doc-scr">
      <div className="doc-inner">
      <h1 style={{ fontFamily: "Cinzel, serif", fontSize: "clamp(30px,7vw,44px)", color: "var(--ink-title)", margin: 0 }}>
        Gizlilik Politikası
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
        JILTED — Karanlıkta Kaçış · Son güncelleme: {SON_GUNCELLEME}
      </p>

      <Blok baslik="Kısaca">
        JILTED&apos;de <b>hesap açmazsın</b>. E-posta, şifre, telefon numarası istemiyoruz.
        <b> Reklam yok, analitik yok, izleyici (tracker) yok.</b> Oyun verilerin kendi cihazında
        durur. Yalnız çok oyunculu oynarken, aynı odadaki oyunculara anlık oyun bilgisi gönderilir.
      </Blok>

      <Blok baslik="Cihazında saklananlar">
        Bunlar tarayıcının yerel deposunda (localStorage) <b>senin cihazında</b> tutulur, bize
        gönderilmez:
        <ul>
          <li>Yazdığın <b>oyuncu adı</b> (istersen boş bırakabilirsin)</li>
          <li>Cihazına özel üretilen <b>arkadaş kodu</b> — rastgele harflerden oluşur, kimliğinle bağlantısı yoktur</li>
          <li>Eklediğin arkadaşların kodları ve adları</li>
          <li>İlerlemen: bölüm, altın, envanter, başarımlar, rekorlar, günlük sayfaları</li>
          <li>Ayarların: ses seviyesi, sesin açık/kapalı olması</li>
        </ul>
      </Blok>

      <Blok baslik="Çok oyunculu oynarken gönderilenler">
        Bir odaya girdiğinde, <b>yalnız o odadaki oyunculara</b> şunlar anlık olarak yayınlanır:
        oyuncu adın (ya da adın yoksa arkadaş kodun), labirentteki konumun, baktığın yön, canın,
        elindeki silah ve oyun olayları (atış, gelin öldürme, bölüm bitirme).
        <p style={{ marginTop: 10 }}>
          Bu bilgiler bağlantı için <b>Supabase Realtime</b> altyapısı üzerinden geçer ve{" "}
          <b>hiçbir veritabanına kaydedilmez</b> — anlık iletilir, oda kapanınca kaybolur.
          Arkadaş listen de sunucuda değil, cihazında durur.
        </p>
      </Blok>

      <Blok baslik="Üçüncü taraf servisler">
        <ul>
          <li>
            <b>Vercel</b> (barındırma): oyunu açtığında sunucu kayıtlarında IP adresin ve tarayıcı
            bilgin teknik olarak görünebilir. Standart sunucu kaydı; oyun bunu okumaz/kullanmaz.
          </li>
          <li>
            <b>Supabase</b> (çok oyunculu bağlantı): yalnız online oynarken devreye girer, yukarıda
            yazan anlık oyun bilgisini iletir.
          </li>
          <li>
            <b>Google Fonts</b>: oyunun yazı tipleri Google sunucularından yüklenir, bu sırada IP
            adresin Google&apos;a ulaşır.
          </li>
        </ul>
        Bunların dışında hiçbir servise veri gönderilmez.
      </Blok>

      <Blok baslik="Verilerini silmek">
        Oyun içinden: <b>Ayarlar → Tüm İlerlemeyi Sıfırla</b>. Bu; altınını, envanterini,
        başarımlarını, rekorlarını ve kaldığın bölümü siler.
        <p style={{ marginTop: 10 }}>
          Adın, arkadaş kodun ve arkadaş listen dahil <b>her şeyi</b> silmek için tarayıcının site
          verilerini temizle ya da uygulamayı kaldır. Cihazından silinen veriyi geri getiremeyiz —
          zaten bizde bir kopyası yok.
        </p>
      </Blok>

      <Blok baslik="Çocuklar">
        JILTED bir <b>korku oyunudur</b> (karanlık, gerilim, kan öğeleri içerir) ve çocuklara
        yönelik değildir. Çocuklardan bilerek veri toplamıyoruz — zaten hiç kimseden kişisel veri
        toplamıyoruz.
      </Blok>

      <Blok baslik="Değişiklikler ve iletişim">
        Bu politika değişirse yukarıdaki tarih güncellenir. Soru, talep veya veri silme isteğin
        için <b>Google Play&apos;deki uygulama sayfasında yer alan geliştirici iletişim bilgisini</b>{" "}
        kullanabilirsin.
      </Blok>

      <p style={{ marginTop: 40 }}>
        <a href="/" style={{ color: "var(--gold-warm)", fontSize: 15 }}>← Oyuna dön</a>
      </p>
      </div>
    </main>
  );
}
