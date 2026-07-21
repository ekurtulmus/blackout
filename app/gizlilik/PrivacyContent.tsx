"use client";

// GİZLİLİK POLİTİKASI — içerik (TR + EN).
//
// NEDEN SÖZLÜK (lib/i18n/dict) KULLANILMIYOR: bu hukuki bir belge; listeler, kalın vurgular
// ve iç içe cümlelerden oluşuyor. Onlarca düz anahtara bölünürse hem okunamaz hem de bir
// maddeyi güncellerken parçaları kaçırma riski doğar. Belgenin BÜTÜNLÜĞÜ önemli olduğu için
// her dil kendi gövdesinde duruyor. Oyunun geri kalanı sözlük kullanır — burası bilinçli istisna.
//
// ⚠️ BİR DİLİ GÜNCELLERKEN DİĞERİNİ DE GÜNCELLE. İkisi de aynı gerçeği anlatmalı.
// ⚠️ Metin KODA GÖRE yazıldı: analitik/reklam/izleyici YOK (tarandı), hesap yok, ödeme yok,
//    sunucuda veritabanı kaydı yok. Oyuna böyle bir servis eklenirse BU SAYFA GÜNCELLENMELİ —
//    yanlış gizlilik beyanı Play'de uygulamanın kaldırılma sebebidir.
import { useLang } from "@/lib/i18n";

const SON_GUNCELLEME = "21 Temmuz 2026";
const LAST_UPDATED = "21 July 2026";

function Blok({ baslik, children }: { baslik: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 30 }}>
      <h2 style={{ fontFamily: "var(--font-title)", fontSize: 21, color: "var(--ink-title)", margin: "0 0 10px" }}>
        {baslik}
      </h2>
      <div style={{ color: "var(--ink-2)", lineHeight: 1.75, fontSize: 15.5 }}>{children}</div>
    </section>
  );
}

function Tr() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-title)", fontSize: "clamp(30px,7vw,44px)", color: "var(--ink-title)", margin: 0 }}>
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
          <li>Ayarların: dil, ses seviyesi, sesin açık/kapalı olması</li>
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
    </>
  );
}

function En() {
  return (
    <>
      <h1 style={{ fontFamily: "var(--font-title)", fontSize: "clamp(30px,7vw,44px)", color: "var(--ink-title)", margin: 0 }}>
        Privacy Policy
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>
        JILTED — Escape in the Dark · Last updated: {LAST_UPDATED}
      </p>

      <Blok baslik="In short">
        JILTED has <b>no accounts</b>. We do not ask for an email address, a password or a phone
        number. <b>No ads, no analytics, no trackers.</b> Your game data stays on your own device.
        Only while you play multiplayer is live game information sent to the players in your room.
      </Blok>

      <Blok baslik="Stored on your device">
        The following is kept in your browser&apos;s local storage <b>on your device</b> and is
        never sent to us:
        <ul>
          <li>The <b>player name</b> you type (you may leave it empty)</li>
          <li>A <b>friend code</b> generated for your device — random letters, not linked to your identity</li>
          <li>The codes and names of friends you add</li>
          <li>Your progress: chapter, gold, inventory, achievements, best scores, journal pages</li>
          <li>Your settings: language, volume, sound on/off</li>
        </ul>
      </Blok>

      <Blok baslik="Sent while playing multiplayer">
        When you join a room, the following is broadcast live <b>only to the players in that room</b>:
        your player name (or your friend code if you have no name), your position in the maze, the
        direction you face, your health, the weapon you hold, and game events (shots, bride kills,
        finishing a chapter).
        <p style={{ marginTop: 10 }}>
          This travels over <b>Supabase Realtime</b> for connectivity and is{" "}
          <b>never written to any database</b> — it is relayed live and is gone once the room
          closes. Your friends list also lives on your device, not on a server.
        </p>
      </Blok>

      <Blok baslik="Third-party services">
        <ul>
          <li>
            <b>Vercel</b> (hosting): when you open the game, your IP address and browser
            information may technically appear in server logs. This is standard server logging;
            the game does not read or use it.
          </li>
          <li>
            <b>Supabase</b> (multiplayer connectivity): active only while you play online, relaying
            the live game information described above.
          </li>
          <li>
            <b>Google Fonts</b>: the game&apos;s typefaces are loaded from Google&apos;s servers, and
            your IP address reaches Google in the process.
          </li>
        </ul>
        No data is sent to any service other than these.
      </Blok>

      <Blok baslik="Deleting your data">
        From inside the game: <b>Settings → Reset All Progress</b>. This erases your gold,
        inventory, achievements, best scores and the chapter you reached.
        <p style={{ marginTop: 10 }}>
          To erase <b>everything</b>, including your name, friend code and friends list, clear the
          site data in your browser or uninstall the app. We cannot recover data deleted from your
          device — we never had a copy of it.
        </p>
      </Blok>

      <Blok baslik="Children">
        JILTED is a <b>horror game</b> (it contains darkness, tension and blood) and is not directed
        at children. We do not knowingly collect data from children — we do not collect personal
        data from anyone at all.
      </Blok>

      <Blok baslik="Changes and contact">
        If this policy changes, the date above is updated. For questions, requests or data deletion,
        please use the <b>developer contact information shown on the app&apos;s Google Play page</b>.
      </Blok>

      <p style={{ marginTop: 40 }}>
        <a href="/" style={{ color: "var(--gold-warm)", fontSize: 15 }}>← Back to the game</a>
      </p>
    </>
  );
}

export default function PrivacyContent() {
  const { lang } = useLang();
  // .doc-scr: body { overflow:hidden } (oyun için gerekli) sayfayı kaydırılamaz
  // yapıyordu → sayfanın kendisi kaydırma kabı (bkz. globals.css).
  return (
    <main className="doc-scr">
      <div className="doc-inner">{lang === "en" ? <En /> : <Tr />}</div>
    </main>
  );
}
