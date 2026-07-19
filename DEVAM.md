# BLACKOUT — Devam / Durum Dosyası

> **Bu ne?** Projenin canlı el kitabı. Yeni bir sohbette "DEVAM.md'yi oku, buradan devam
> edelim" dersen kaldığımız yerden sürdürebiliriz. **Her ilerlemede güncellenir.**
> Son güncelleme: **2026-07-19** · Canlı sürüm: commit `6d4c46a` (oturum #17: ekran/popup sadeleştirme turu; CLI deploy + curl). Not: TEK SEFERLİK İLERLEME SIFIRLAMA `blackout_reset_v="2026-07-19-fresh"` aktif (kimlik+ses korunur).
>
> **CANLI (sabit link):** https://blackout-plum.vercel.app · GitHub `ekurtulmus/blackout` (main).
> ⚠️ **DEPLOY YÖNTEMİ DEĞİŞTİ:** Vercel'in GitHub webhook'u BOZUK — `git push` artık otomatik deploy
> ETMİYOR. Deploy **Vercel CLI ile** yapılıyor: `npx vercel --prod --yes` (bu makinede oturum açık:
> `kurtulmusznc-3311`; `.vercel/project.json` bağlı). Push'u yine yap (GitHub yedeği), ama canlıya almak
> için CLI şart. Her deploy sonrası **canlı URL'den curl ile teyit et** ("canlıya alındı" demeden önce).
> Kalıcı çözüm: Vercel paneli → Settings → Git → Disconnect + tekrar Connect (kullanıcı yapmalı).
> Kullanıcı tercihi: **düzeltmeleri sormadan canlıya al** (commit+push+CLI deploy).
>
> **NEREDE KALDIK (özet — GÜNCEL):** Ön yüz yenilendi + son turlarda **bir sürü oynanış hatası/özellik**.
> - **KILIÇ (YENİ — temel silah):** mermiyle ARASINDA geçiş (ateş butonu üstünde buton / PC'de **F** ya da
>   **sağ tık**). Baktığın yönde ~1 kare, TEK darbede max 2 gelin, oyuncuya 50 hasar (2 vuruş = ölüm), mermi
>   harcamaz. Ortak vuruş mantığı `lib/brides.ts` `swordHits()` (tekli + online host AYNI). Dükkânda 3 renk
>   (Köz/Boşluk/Ayaz). Kozmetik slotu artık `"flash"|"skin"|"sword"`. `inventory.SWORD_COLORS`.
> - **ZORLUK (ÖNEMLİ):** TEK KAYNAK `lib/config.ts` `TUNING.diff` (kolay/orta/zor: count·speed·vision·dmg·
>   intel·hunters). Motor + online ORTAK bunu kullanır. Gelin GÜCÜ (dmg) + avcı sınırı (hunters) da zorluğa
>   bağlı. TÜM türlerde uygulanır (arena/endless dahil). Hız tabanı 2.55 (Orta≠Zor eşitlenmesin diye).
> - **ARENA (tekli+online):** özel gelin türleri + asker + kalıcı paketler artık VAR (`if (!mission)` kapısı
>   `arena/endless` için açıldı). Online arena turu **50 sn**, puan: 1.→+2, 2.→+1, ilk 5 puan kazanır.
>   HUD: süre+gelin ORTADA banner (`.arena-banner`), sol ilk-3 sıralama (`.arena-board`).
> - **TEMA (YENİ):** Koyu ↔ Aydınlık, `<html data-theme>` + `blackout_theme`. Aydınlık **YALNIZ menü/alt ekranlar**;
>   `.stage` (oyun) karanlığa sabit. Menü yüzeylerinde **sabit renk yazma** — `globals.css` tokenlarını kullan
>   (alfa için `rgba(var(--edge-rgb), .2)`). Tema `layout.tsx` head'inde, ilk boyamadan önce uygulanır.
> - **MÜZİK (YENİ):** `audio.ts` `SCREEN_TRACKS` + page.tsx `SCREEN_MUSIC` — her menü ekranının kendi parçası.
>   `public/` dosya adları **ASCII** (Vercel/Linux).
> - **HUD:** `.hud` = `.hud-info` (sol, bilgi çipleri) + `.hud-actions` (sağ üst, butonlar). Oyun-içi
>   **emoji YOK** — hepsi `components/Icon.tsx` line-icon. Kart adları ikonun **yanında** (`.card-head`).
> - **Mimari (ÖNEMLİ):** `components/MenuShell.tsx` = ortak kabuk (labirent canvas + scrim + grain + vinyet).
>   `page.tsx` içindeki `chrome()` her menü ekranını `<MenuShell>` ile sarar → kökte hep aynı tip döndüğü için React
>   bileşeni mount'ta tutar → **arka plan ekranlar arası kesintisiz**. Oyun ekranları kabuk KULLANMAZ (`isPlayScreen()`).
> - **Tipografi kuralı:** **Cinzel YALNIZ büyük başlıklarda** (BLACKOUT logosu, `.scr-title`, `.title`, `.big`,
>   `.mm-modal-title`, `.roman`). **Diğer HER ŞEY Archivo** (buton/etiket/açıklama). Serif başka yerde kullanma.
> - **Ortak parçalar (globals.css):** `.scr` (ekran iskeleti) · `.panel` · `.seg` · `.btn-primary-x` · `.mm-ghost` ·
>   `.card` + `.grid-184/232/268/340` · `.mm-modal` · `.toggle`/`.field-*` · `.danger-btn` · `.shell-icon`/`.shell-back`.
> - **Geri butonu:** TEK tip — sol üst, 46px, yalnız ok ikonu (`.shell-icon.shell-back`). Kabuk sağlar; oyun-içi
>   brifing/duraklat/hazırlık ekranları da aynı sınıfı kullanır. `.topback` **tamamen kaldırıldı**.
> - **Navigasyon:** `backStack` + `goBack()`. **Oyun ekranları geri hedefi OLAMAZ** (`isPlayScreen`) — yoksa sonuç
>   ekranından geri oyunu yeniden başlatır (döngü). Telefon geri tuşu popstate ile yakalanır, uygulamadan çıkmaz.
> - **Menü:** 2 birincil kart (Tek Kişilik → brifing, Çok Oyunculu → `multi` ekranı) + 6 tek tip kutu + Devam Et +
>   Nasıl Oynanır (10 konulu modal). Chrome: sol üst cüzdan, sağ üst **tam ekran + ayarlar + arkadaşlar**.
> - **Oyun sistemleri (değişmedi):** arena tur sistemi (2dk/en çok öldüren/ilk 5), PvP (%10 + kan), ölüm cezası
>   (3sn haritada don), asker müttefiki, 50 başarım, SP devam kaydı, dükkân sekmeleri.
> Doğrulama: **`npx tsc --noEmit` + `next build` temiz**. **UYARI:** dev-server Turbopack/OneDrive cache bazen SAHTE
> hata gösterir — `next build` temizse gerçek değildir. `.next` EPERM verirse sil, tekrar dene. Online/oynanış
> **gerçek tarayıcı + 2 cihaz** ister (gizli panelde rAF durur, presence tek kimlik).

## OTURUM 2026-07-19 #17 — Ekran/popup sadeleştirme turu (2 Explore ajanı taraması sonrası)
Doğrulama: `tsc` + `next build` TEMİZ. Kullanıcı, ajan raporlarından seçtiği maddeleri onayladı.
- ✅ **Doğruluk (ölü metin/kod):** Game hazırlık "Kontroller" + OnlineGame alt hint bandı + MainMenu "Fırsatlar/Çan"
  → kaldırılan kalkan/radar/tuzak atıfları temizlendi (OnlineGame alt hint bandı KOMPLE kaldırıldı, Game altı da).
  `Shop.tsx` ITEM_ICON/ORDER/ownedText ölü dalları (radar/shield/trap/ammoPack/healthPack/extraLife) silindi.
- ✅ **endlessresult** sadeleşti (tekrar eden "çıkış yok/skor=süre" paragrafı silindi, arena seviyesi, az renk).
- ✅ **OnlineLobby emoji→Icon** (🪙🏠🔑⚔️👀▶ → coin/home/key/swords/play). Oda maliyeti tek yerde.
- ✅ **Online skor tabloları ORTAK stil** (`.scorelist/.scorerow`): bölüm-sonu/tur-sonu/arena-sonu aynı düzen
  (sıra·isim·[öldürme]·toplam, sıralı). Tur-sonundaki +2/+1 puan kırılımı kaldırıldı.
- ✅ **Alt ekran `scr-sub` temizliği:** Modlar (silindi), Sırlar/Günlük/Görevler/Başarımlar/Çok Oyunculu kısaltıldı.
- ✅ **Ayarlar:** "Müzik"+"Tüm Sesler" → tek **"Ses"** + açıkken **"Müzik"** alt seçeneği; isim açıklaması kısaldı.
- ✅ **Nasıl Oynanır:** gelin listesi 7→2+keşfet; duvak+fırsat tek "Duvak & Fırsatlar" konusunda birleşti (9→8).
- ✅ **Görev brifingi:** ayrı "Hedef" paneli kaldırıldı (hedef kartta zaten var).

## OTURUM 2026-07-19 #16 — Büyük UX turu (tutorial+, HUD sadeleştirme, bölüm-sonu, can, menüler)
Doğrulama: `tsc` + `next build` TEMİZ + headless tutorial 17/17. Değişiklikler TÜM oyun türlerine uygulandı.
- ✅ **Tutorial (1. bölüm) güncellendi:** koridor uzatıldı (7 koridor, path 97). Gelinler artık SALDIRIR/can götürür
  (dokunulmazlık aşamaları kaldırıldı, can barı baştan görünür). Kılıç/tabanca alınınca **ELE oto-kuşanılır**
  (`engine.tutEquip` → Game setWeapon). Silaha geçince oyuncuda **elde küçük tabanca** çizilir (kılıç zaten çiziliydi).
  **SOL TIK = ateş/kılıç** (Game + OnlineGame; sağ tık = silah değiştir). Koşma beat'i eklendi.
- ✅ **Bölüm-sonu ekranı yeniden:** flavor ("bu koridordan sağ çıktın") kaldırıldı, "Bölüm X" yerine küçük
  **"X / 10"** (Cinzel), az renk, **altın en altta**, "Menüye Dön" butonu kaldırıldı (geri butonu var). `.clear-*` CSS.
- ✅ **Oyun HUD sadeleşti (tüm türler):** Asker çipi kaldırıldı; Fırsat/Altın/Mermi yazıları → yalnız line icon;
  Can yazısı kaldırıldı (bar kalır). Game + OnlineGame.
- ✅ **Can hakkı en fazla 4:** `play()` merkezi `Math.min(4,...)` kapağı; kampanya başlangıcı sabit **4** (3+1);
  eski `extraLives` şişmesi kısıldı; mod-canlarından extraLives bağımlılığı çıkarıldı.
- ✅ **Sağ üst aksiyonlar hamburger:** ?/ses/duraklat tek **aşağı-ok** ile açılan `.hud-actions-menu` içinde
  (chevronDown/Up ikonları eklendi). Duraklat ekranında yazı yerine **büyük pause ikonu** (`.pause-glyph`).
- ✅ **Modlar:** "En iyi X. dalga" → **"Rekor N dalga"** / "Rekor N sn" (arena sonuç ekranı dahil).
- ✅ **Günlük** metni italik değil (diğer kartlarla aynı). **Nasıl Oynanır** temizlendi: kaldırılan
  kalkan/radar/tuzak/ekstra-can referansları çıktı, **Duvak tekrarı** giderildi (Kontroller'den çıkarıldı, tek konu).
- ✅ **İkon ayrımı:** yerdeki **yüzük** (delikli altın halka + taş) ve **ayna** (saplı el aynası) yeniden çizildi —
  duvak/ayna/yüzük artık ayrışıyor. **Mezarlık dekoru KALDIRILDI** (`themes.ts` mezarlik `decor` silindi).

## OTURUM 2026-07-19 #15 — REHBERLİ 1. BÖLÜM (tutorial koridoru + senaryo)
Doğrulama: `tsc` + `next build` TEMİZ + **headless sim 17/17** (scratchpad `tut-test.js`). Oyun içi his gerçek cihazda görülür.
- ✅ **Kampanya level 1 (görev değil) artık LABİRENT DEĞİL → düz KIVRIMLI KORİDOR** (çıkmaz yok) + adım adım
  öğreten senaryo. `lib/tutorial.ts`: `buildTutorialCorridor()` (15×11, 5 yatay koridor, sıralı `path` 69 hücre) +
  `TUTORIAL_BEATS` (yol oranına bağlı 10 beat) + `tutorialBeatIndices()`.
- ✅ **engine.ts entegrasyonu:** ctor'da `level===1 && !mission` → `setupTutorial()` (koridor kur, gelin=0,
  eşya=0, `invulnUntil=MAX` dokunulmaz, `tutSwordLocked`, `exitOpen=false`) + `return` (normal üretim atlanır).
  `updateTutorial()` oyuncunun yol ilerlemesini ölçüp geçilen beat'i tetikler (`fireTutBeat`). Kılıç savurma
  `!tutSwordLocked` ile kapılı. Dışa açılan: `tutorial/tutHint/tutHealthShown/tutPointShop/tutItems`.
  **Senaryo:** başla(zararsız) → **kılıç** bul (kilit açılır) → gelin (kılıçla) → **tabanca+mermi** (+8) → gelin
  (silahla) → **can barı belirir + 3 can + dokunulmazlık kapanır** → **duvak** (otomatik görünmez) → duvaklı gelin
  (etkisi geçince saldırır) → **altın → dükkânı işaret et** → "gerisi LABİRENT" → çıkış açılır → bölüm biter.
  (`maze/player/exit/seen` alanlarına `!` definite-assignment eklendi çünkü ctor erken dönüyor.)
- ✅ **Game.tsx UI:** `tut` state; alt-orta **büyük ipucu bandı** (`.tut-hint`), **Can çipi** can barı belirene
  kadar GİZLİ, yerde **parlayan kılıç/tabanca/duvak** işaretleri (canvas). permAmmo +3 bonusu tutorial'da verilmez
  (mermi senaryodan gelir). Bölüm-1 sonu ekranında "gerisi labirent" notu + **"Dükkâna Uğra" altın nabız** (`.pulse-gold`).

## OTURUM 2026-07-19 #14 — Joystick 4-yön + kalkan/radar/tuzak KALDIRILDI + görev kademeli açılma
Doğrulama: `npx tsc --noEmit` + `next build` TEMİZ. Mobil/oynanış gerçek cihazda görülür.
- ✅ **Mobil joystick — labirentte 4 YÖN, arenada serbest**: `Joystick` bileşenine `fourDir` prop'u
  (Game.tsx). fourDir=true → çıkış ölü bölge + baskın eksene sabitlenir (yukarı/aşağı/sağ/sol; yön-tuşu
  hissi, 360° dönüş yok → ateş kolaylaşır). Game `fourDir={!mission?.arena}`, OnlineGame `fourDir={!arenaMode}`.
- ✅ **Kalkan / Radar / Tuzak OYUNDAN KOMPLE KALDIRILDI** (kullanıcı isteği): dükkân öğeleri
  (`inventory.SHOP_ITEMS`), envanter panelleri, Q/R/E-T tuşları, kullanım fonksiyonları, HUD çipleri,
  mobil tuzak butonu, online tuzak sistemi (`trapStock`/`onlineTraps`/`{t:trap}`), tuzak render/slowCells.
  **Duvak KALIR** (tek eşya). İlgili başarımlar (use_shield/use_radar/use_trap/buy_life) da kaldırıldı.
  NOT: Inventory TİP alanları (shields/radars/traps/…) 0 varsayılanla duruyor (okuyucular kırılmasın) —
  görünmez/erişilmez. Nasıl Oynanır kontrol metni güncellendi (Q/R/T kalktı → silah değiştir + Duvak).
- ✅ **Dükkândan KALDIRILDI**: Ekstra Mermi (tüketilir; `ammoPack`) — **Sürekli Cephane (permAmmo) KORUNDU**.
  Can Paketi (`healthPack`) + Ekstra Can Hakkı (`extraLife`) komple kaldırıldı → dükkânda can/iyileşme yok.
- ✅ **Karanlık Görevler — 3'LÜ KADEMELİ AÇILMA + yeşil tamamlandı** (`page.tsx` missions ekranı):
  görevler 3'erli grup; ilk grup (1-3) açık, önceki 3'ün HEPSİ bitince sonraki grup açılır (4-6→7-9→10-12).
  Kilitli görev soluk + kilit ikonu + tıklanamaz ("Önceki 3 görevi tamamla"). Tamamlanan görevde **"Tamam"
  yazısı YOK** → kart hafif YEŞİL (`.card.is-done`, yazılar okunur) + küçük yeşil check. Biten görev grubu
  kilitli görünse bile oynanabilir (`locked = !prevCleared && !done`).

## OTURUM 2026-07-19 #13 — Sadeleştirme/UX düzeltmeleri (tema, HUD, ses, ikon, kaçış görevi)
Kullanıcı istek listesi. Doğrulama: `npx tsc --noEmit` + `next build` TEMİZ. Mobil/oynanış gerçek cihazda görülür.
- ✅ **Beyaz (Aydınlık) tema KOMPLE kaldırıldı** — oyun hep KARANLIK. `layout.tsx` + `page.tsx` data-theme='dark'e
  sabit; `blackout_theme` kaydı yok sayılır; `MenuShell` tema toggle butonu tamamen silindi. (`[data-theme="light"]`
  CSS blokları artık ULAŞILMAZ = inert; silinmedi.)
- ✅ **Tam ekran butonu MOBİLDE gizli** (`globals.css` `@media (pointer: coarse) .shell-bottom-right{display:none}`).
  Masaüstünde durur.
- ✅ **Altın ikonu gerçek altın sikke** — `Icon.tsx` `coin` artık line-icon değil, sabit altın renkli DOLU sikke
  (currentColor'dan bağımsız). Menü cüzdanı da bu ikonu kullanır. **Cüzdan çipi** artık ?/ayar butonlarıyla AYNI
  çerçeve: 46px yükseklik + 11px köşe (`.shell-wallet`).
- ✅ **Çıkış durumu = TEK kilit ikonu (yazı YOK)** — HUD'da "AÇIK/KİLİTLİ" yazısı kalktı; kilitliyken kapalı kilit,
  açıkken açık kilit (`Icon` yeni `lockOpen`). Hem `Game.tsx` hem `OnlineGame.tsx`. `.chip.is-icononly` (kare/ortalı).
- ✅ **Duraklatınca TÜM ses durur** — `audio.ts` yeni `setPaused()` (müzik pause + AudioContext suspend, sekme-gizleme
  mantığının aynısı); `Game.togglePause` çağırır; oyundan çıkışta `setPaused(false)` (askıda kalmasın).
- ✅ **Nasıl Oynanır mobil kontrol** — `MainMenu` dokunmatik tespiti güçlendirildi (pointer:coarse **+** maxTouchPoints
  **+** ontouchstart); telefonda artık WASD yerine joystick/dokunma kontrolleri gösterilir.
- ✅ **Kaçış/dayan görevinde kapı GİZLİ + süre GERİYE sayar** — `Game.tsx`: çıkışsız modlarda (`surviveTime`/`endless`/
  `arena`) `drawExit` erken döner (kapı çizilmez, amacı yoktu) + "Çıkış" çipi gizli; "X sn dayan" görevinde süre
  `surviveTime - geçen` olarak GERİYE sayar ("Kalan").

## OTURUM 2026-07-18 #12 — Online desync/softlock düzeltmeleri + presence + arena yoğunluğu
Kullanıcının 5 maddesi. Doğrulama: `npx tsc --noEmit` + `next build` TEMİZ. Online 2 gerçek cihaz ister.
- ✅ **#1 CİDDİ — bölüm geçişinde SADECE kazanan geçiyordu, diğerleri eski bölümde kalıyordu**
  (kazanan hem eski hem yeni bölümde görünüyordu). KÖK NEDEN: `net.ts` broadcast **kayıpsız değil**
  (`ack:false`); host'un tek seferlik `{t:"result",lvl}` mesajı bir oyuncuya ulaşmazsa o oyuncu eski
  bölümde **kalıcı takılıyordu**. ÇÖZÜM = **self-healing** (`OnlineGame.tsx`): (a) host `pos` heartbeat'ine
  güncel bölüm no'sunu (`lvl`) ekler; geride kalan `{t:"needlevel"}` ister → host `{t:"levelsync"}` ile
  mevcut bölümü serileştirip yollar → geride kalan **anında yetişir** (`applyLevelSync`). (b) host overlay
  boyunca `result`ı ~1 sn'de bir **yeniden yayınlar** (kayıp sigortası). (c) `scheduleLoad` **idempotent**
  (`pendingLevelNum`; aynı/geçmiş bölümü tekrar kurmaz).
- ✅ **#1b softlock — `reachexit` tek sefer yollanıyordu**: kaybolursa host kazananı hiç belirlemez, guest
  çıkışta kalıcı takılırdı. Artık çıkışta durdukça ~1 sn'de bir yeniden yollanır (host `resultPending` ile idempotent).
- ✅ **#2 arkadaş oyundayken çevrimdışı görünüyordu**: presence (`friends.ts`) beat 3s / pencere 7s **dardı** +
  oyun trafiği altında "here" düşünce yanıp sönüyordu. beat **2s**, pencere `ONLINE_MS` **12s** (~5 kayıp beat'e dayanır).
- ✅ **#4 dükkân beklemesi 12s→5s** (`LEVEL_WAIT_MS`), süre bitince **otomatik** başlar (buton yok; overlay metni güncellendi).
- ✅ **#5 arena gelin sayısı ×1.7** — `config.TUNING.arenaBrideMul=1.7`: başlangıç dalgası (`online.ts`) +
  tur-içi dalga eklemesi & üst sınır (`OnlineGame.tsx`) hepsine uygulanır.
- ✅ **#3 host göçü bug'ı** (guest→host devralma): `brideIdCounter` en yüksek id'ye çekilir (yeni gelin id çakışması
  önlenir) + gelin **türü** korunur (splitter/caller/climber/queen "normal"e düşmez; kraliçe canı/hızı geri verilir).

## OTURUM 2026-07-18 #11 — Oynanış hataları + KILIÇ + arena/online paketi (CANLI)
Uzun tur; hepsi Vercel CLI ile canlıya alındı + curl ile teyit edildi. Denge/mantık için **headless
test** (scratchpad `test-*.js`; `npx tsc lib/*.ts --outDir ...` ile derle, Node'da çalıştır).
- ✅ **CİDDİ HATA — gelin duran oyuncuyu vurmayı bırakıyordu** (commit `6b518a0`): `brides.chase()` yol
  oyuncunun HÜCRE MERKEZİNE gidiyor, oyuncuya değil. Gelin varınca yol boşalıyor, `findPath(aynı hücre)`
  boş dönüyor, "yol yok + görüyor" hâli hiçbir dalda yoktu → gelin merkezde DONUYOR. Üstüne temas GERİ İTMESİ
  oyuncuyu dışarı itiyor, hücre değişmediği için kilit kalıcı. **Çözüm:** görüyorsa/aynı hücredeyse gerçek
  konuma dogrudan yönel. Test: 12sn'de hasar 6→171.
- ✅ **Zorluk orantısı** (`6b518a0`): `TUNING.diff` tek kaynak; gelin GÜCÜ (dmg) + hız tabanı 2.9→2.55
  (Orta/Zor tavanla eşitleniyordu) + sayı Zor 1.4→1.85. Zorluk TÜM türlerde (eskiden `else if` → arena/endless
  görmezden geliyordu). Sonra avcı sınırı da zorluğa bağlandı (`6857978`, hunters 2/4/7): sabit 4 iken Zor'da
  fazla gelin aylak dolaşıyordu.
- ✅ **Arena eksikleri** (`6b518a0`): özel gelin türleri/asker/kalıcı paketler `if (!mission)` içindeydi →
  arena/endless'te yoktu. Açıldı (hikâye görevleri hariç). `assignSpecialKinds` level yerine `levelBase`'e bakar.
  Online arena `generateArenaLevel`'a diff eklendi (Kolay=Zor değil artık).
- ✅ **İsim yerine kod** (`a1b2ded`): OnlineLobby mount effect'i `startRoom`'u `name` state boşken çağırıyordu →
  odaya hep kod gidiyordu. `resolveName` localStorage'dan okur. Arkadaşlık isteği popup'ı her ekrana taşındı.
- ✅ **"2 kişiden az kaldı" yanlış alarmı** (`6857978`, kökten `13793f8`): pos kalp atışına bakıyordu; telefon
  kilidi/sekme arka planı rAF'ı durdurunca "ayrıldı" sayılıyordu. Artık kaynak GERÇEK çıkış (`{t:left}`);
  `DEAD_MS=45sn` emniyeti; `lastSeenById` (silinmeyen kayıt). 2+ kişi varsa oda kapanmaz.
- ✅ **Arena puan sistemi** (`13793f8`): tur 120→50sn. Sıralama: 1.→+2, 2.→+1. Tur sonu ekranında herkesin
  sırası/öldürmesi/puanı. HUD: süre+gelin ORTADA banner, sol ilk-3 sıralama. İsim/kod TEK etiket. Çıkış onayı
  (Oyuna Devam Et / Menüye Dön). Lobide odadaki arkadaşa "Davet Et" gösterilmiyor; oda içi kod girme kaldırıldı.
- ✅ **KILIÇ** (`96e13fd`): yukarıdaki özet + headless test (`test-kilinc.js`, 7 kural). Online PvP mevcut
  `{t:pvphit, dmg}` modeliyle (vuran tespit, hedef uygular). `swordHits` ORTAK.
- ✅ **Mobil buton çakışması** (`2b719a9`): koş+kılıç ayrı ayrı sağ-alta konumlanıp biniyordu → tek flex satır
  (`.actionrow`, online `.actionrow-mp`). PC'de **sağ tık** = silah değiştir (canvas contextmenu engelli).
  Doğrulama: panel `pointer:fine` bildirdiği için coarse kuralları uygulanmıyor → o kuralları stylesheet'ten
  çıkarıp düz CSS enjekte edip GERÇEK mobil yerleşim ölçüldü (CSS-ayrıştırıcı denetim güvenilmezdi).
- ⚠️ **DOĞRULANAMAYAN** (2 cihaz / gerçek oyun döngüsü ister): kılıcın elde görünümü, online PvP 2-vuruş ölüm,
  arena banner/sıralama görünümü, "oda kapandı" düzeltmesi, isim/davet akışı. Kod + headless test doğru.

## OTURUM 2026-07-17 #10 — AYDINLIK TEMA + ekran müzikleri (CANLI, commit `6053dec`)
Kullanıcı `Blackout t.zip` (design_handoff_blackout_theme) verdi — **eski sürüme** dayanıyordu; harfiyen değil
**uyarlanarak** uygulandı. `next build` + tsc temiz.
- ✅ **TEMA MİMARİSİ (ÖNEMLİ):** Handoff yeni bir **paralel** değişken seti öneriyordu (`--ink`, `--mut`, `--gold`…)
  ama projede zaten token seti vardı (`--ink-body`, `--ink-2`…). İkinci set = iki doğruluk kaynağı → **reddedildi**.
  Bunun yerine aydınlık değerler **mevcut tokenların üstüne** `[data-theme="light"]` ile bağlandı.
  `globals.css`'te 3 blok: `:root,[data-theme="dark"]` · `[data-theme="light"]` · `.stage`.
  Alfa için `-rgb` üçlüleri: `rgba(var(--edge-rgb), .2)`. **Menü yüzeylerinde sabit renk YAZMA.**
- ✅ **`.stage` karanlığa SABİT**: HUD `--panel`/`--ink`/`--border` kullanıyor; aydınlık global override edilince
  HUD beyazlayıp canvas karanlık kalıyordu. `.stage` tüm tokenları koyu değerlere geri çakar →
  **aydınlık tema yalnız menü/alt ekranlar**. Oyun canvas'ı fener/sis/görüş üstüne kurulu, aydınlatılamaz.
  Doğrulandı: html `data-theme=light` iken `.stage` siyah, çipler `rgba(12,16,26,.82)`.
- ✅ **Canvas `MenuShell`'de dallandırıldı** (handoff `MainMenu` diyordu — kabuk refactor'ünde taşınmıştı).
  Tema canvas döngüsüne **ref ile** verilir (`lightRef`): `theme`'i effect bağımlılığına koymak labirenti
  her tema değişiminde sıfırdan kurardı. Renkler README §3 tablosundan.
- ✅ **FOUC yok**: tema `layout.tsx` `<head>`'de, İLK BOYAMADAN ÖNCE bloklayıcı script ile uygulanır.
  (Handoff React mount'unda uygulamayı söylüyordu → sayfa bir an koyu açılıp beyaza atlıyordu.)
- ✅ **Tema düğmesi**: kabuk sağ üst (tema · Nasıl Oynanır · Ayarlar · Arkadaşlar). `blackout_theme` localStorage.
- ✅ **Koyu tema birebir korundu** (hesaplanan değerlerle doğrulandı). `.mm-eyebrow` #b3aa93 kendi tokenına
  (`--ink-eyebrow`) alındı — `--ink-dim`e bağlayınca 4 birim kayıyordu.
- ✅ **EKRAN MÜZİKLERİ**: `audio.ts`'te iki sabit alan (`secretsAudio`/`shopAudio`) yerine **`SCREEN_TRACKS` tablosu**
  + `screenAudios` Map. Dükkân→`dukkan.mp3` · Başarım→`basarim.mp3` · Görevler→`gorevler.mp3` ·
  Modlar→`modlar.mp3` · Günlük→`gunluk.mp3` · Sırlar→`sirlar.mp3`. page.tsx'te `SCREEN_MUSIC` eşlemesi.
  Aynı parça çalarken ekran değişirse **baştan başlamaz**. Yeni müzik eklemek = 2 satır.
  - ⚠️ **Ölüm Koşusu** eskiden `playScreenMusic("shop")` çağırıyordu → "shop"u dukkan.mp3'e bağlayınca yarışın
    müziği de sessizce değişecekti. Yarışa **kendi anahtarı** (`race`) verildi, `envanter.mp3` çalmaya devam eder.
  - ⚠️ **`dükkan.mp3` → `dukkan.mp3`**: dosya adındaki Türkçe karakter URL'de kodlanmak zorunda; Vercel/Linux'ta
    404 riski. **Kural: public/ dosya adları ASCII.**
- ✅ **Görevler**: tamamlanmayanlar Başarımlar'daki gibi saydam (ortak `.is-locked`, opacity .55). Doğrulandı.
- ✅ **Modlar**: başlık ikonun yanında (`.card-head`). Doğrulandı.
- ⚠️ **DOĞRULANAMAYAN** (panel sınırı — gerçek tarayıcı ister): labirent canvas'ının aydınlık renkleri
  (panel sayfayı `hidden` tutuyor → **rAF hiç çalışmıyor**, canvas alpha=0 ölçüldü) · müziğin duyulması ·
  temanın **çalışırken** değiştirilmesi (panel attribute değişiminde stili geçersizleştirmiyor; ilk yüklemede doğru).

## OTURUM 2026-07-17 #9 — HUD düzeni + line-icon temizliği + 9 istek
`next build` + tsc temiz. Doğrulama: gerçek tarayıcı (dev :3008) + DOM ölçümü (ekran görüntüsü rAF yüzünden alınamıyor).
- ✅ **Kırmızı alarm kaldırıldı** (`Game.tsx`): kök sebep gerilim (`engine.tension`) bazlı **sürekli** kızıl vinyetti
  (`rgba(120,0,0,…)`). Artık gerilimde kenarlar KIZARMAZ, **daha da kararır** (`rgba(2,2,3,…)`). Hasar anı kısa
  kırmızı flaş olarak kaldı ("vuruldum" geri bildirimi). Kaçış bölümündeki kırmızı nabız (süre dolmak üzere)
  **bilerek durdu** — o bir alarm değil, süreli mekanik.
- ✅ **HUD yeniden düzenlendi** (`Game.tsx` + `OnlineGame.tsx` + `globals.css`): `.hud` artık
  **`.hud-info`** (sol, bilgi çipleri) + **`.hud-actions`** (sağ üst, aksiyon butonları) olarak ikiye ayrıldı.
  Eskiden her butonda `margin-left:auto` vardı → sarınca dağılıyordu. Sıra: SP = **? · ses · duraklat**,
  online = **? · dükkân · çıkış**. Bilgi çipleri anlamlı sırada: durum (Can+kalpler/Nefes) → kaynak
  (Mermi/Bariyer/Tuzak/Altın) → bölüm/mod → geçici uyarılar (Kehanet/Çöküyor/Asker/Görünmez/Fırsat) → skor.
- ✅ **Oyun-içi emoji → line-icon**: HUD'da `?`/`⏸`/`▶`/`⎋`/`♥`/`ⓘ` kalktı. `Icon.tsx`'e **help/play/pause/exit**
  eklendi. Canlar artık line-icon kalp (dolu/boş). Mini-görev HUD metninden emoji **kaynağında** silindi
  (`engine.miniQuestText()` + OnlineGame `MQ_DEFS[...].icon`) — çip kendi ikonunu çiziyor. Sonuç ekranlarındaki
  🪙/🏆/🛒/♥ ve `↻` de line-icon/metne çevrildi.
- ✅ **Altın ikonu düzeltildi**: eskisi çember + bozuk transform'lu `$` idi ("hiç altına benzemiyor"). Yeni sikke =
  dış kenar + iç kabartma halkası + parıltı. `Shop.tsx`'in kendi çıplak-çember `Coin`'i ve `MenuShell` cüzdanı
  da aynı çizime bağlandı (tek kaynak).
- ✅ **Kart başlıkları ikonun YANINDA**: yeni ortak **`.card-head`** (globals.css) — Başarımlar, Görevler (no+ad),
  Günlük (roma+ad), Dükkân eşyaları. `.item-card.is-perm .card-head` sağdan dolgulu (KALICI rozeti çakışmıyor).
- ✅ **Bitmeyen Gece sonucu düzeltildi**: "DAYANAMADIN + X saniye hayatta kaldın" kısa süreyi iyi gibi
  gösteriyordu. Artık: başlık **YENİ REKOR / GECE SENİ YENDİ**, "bu modda tek skorun dayandığın süre, ne kadar
  uzun o kadar iyi" açıklaması, dev punto süre, rekor + **"rekoru geçmek için N sn daha dayanmalısın"**,
  buton "Daha Uzun Dayan →". HUD'da da çip **"Dayandığın süre"** (yeşil) oldu.
- ✅ **Bitmeyen Gece HUD tekrarı temizlendi**: `objectiveText()` endless'ta zaten "Süre Xs" döndürüyordu →
  "Görev" çipi süreyle aynıydı, kaldırıldı. O modda **çıkış olmadığı** için "Çıkış: KİLİTLİ" çipi de gizlendi.
  Sonuç: Can · Nefes · Mermi · Dayandığın süre.
- ✅ **"Henüz süre yok" kaldırıldı** (Karanlık Görevler): en iyi süre yoksa `.card-meta` hiç basılmıyor.
- ✅ **Menü chrome**: **Nasıl Oynanır** sağ üste (kabuğun `.shell-top-right` grubuna, Ayarlar/Arkadaşlar ile),
  **Tam ekran** sağ alta (yeni `.shell-bottom-right`). `.mm-foot` kaldırıldı. Modal hâlâ `MainMenu`'de ama
  açık/kapalı durumu **page.tsx**'te (`helpOpen`) → `MenuShell onHelp` + `MainMenu help/onHelpClose`.
- ⚠️ **Not**: `.claude/launch.json` preview aracı 3000'e takılıyor (orada YKS Takip dev sunucusu var);
  bu oturumda dev sunucu elle **:3008**'de çalıştırıldı.

## OTURUM 2026-07-14 #8 — Ön yüz cilası + geri döngüsü düzeltmesi (CANLI)
`next build` + tsc temiz. (commit `a829234`, `2ee4957`, `d0e2ebc`)
- ✅ **Serif (tırnaklı) temizliği — TÜM sayfalar**: kök sebep `.btn` **Cinzel** kullanıyordu ("Oda Kur" oradan geliyordu)
  ve `.screen`/`.menuscreen` **EB Garamond** miras veriyordu. Archivo'ya çevrilenler: `.btn`, `.topback`, `kbd`,
  `.screen`, `.menuscreen`, `.mm-lore`, `.panel-p`, Günlük kart metinleri, oyun-içi "ENVANTER" başlıkları (Game+OnlineGame).
  **Kural: Cinzel yalnız büyük başlıklarda** (bkz. üstteki özet).
- ✅ **Nasıl Oynanır ESKİ haline döndü**: 10 konulu ızgara (Kontroller/Amaç/Kanlı Gelinler/Can-Ölüm/Mermi/Dükkân/
  Envanter/Duvak/Fırsatlar/Ölüm Koşusu) → tıkla → detay → "← Geri". Kontroller platforma duyarlı (`isTouch`).
- ✅ **Sayfalar büyütüldü**: ızgara kolonları (184→206, 232→258, 268→296, 340→374), kart dolgu/yazı (başlık 15.5→17,
  açıklama 14→15), `.scr-title` (54→60), `.scr-sub` (15→16.5), dükkân eşya metinleri.
- ✅ **Tam ekran butonu**: `MenuShell` sağ üst (menüde), Fullscreen API + `fullscreenchange` ile durum takibi (toggle ikonu).
- ✅ **Günlük müziği**: Günlük artık Sırlar ile aynı hikâye müziğini (`sirlar.mp3`) çalar (`screen === "secrets" || "journal"`).
- ✅ **GERİ DÖNGÜSÜ DÜZELTİLDİ (gerçek hata)**: geri yığınına oyun ekranları da giriyordu →
  `modlar → arenaplay → arenaresult → geri → arenaplay → …` sonsuz döngü. Artık `isPlayScreen()` olanlar yığına
  **eklenmez** + aynı ekran üst üste iki kez eklenmez. Sonuç ekranından geri = **modlar**. `isPlayScreen` tek kaynak
  (kabuk + geri yığını aynı fonksiyonu kullanır).
- ✅ **Çift geri butonu kaldırıldı**: arena/endless/mission sonuç ekranlarında hem kabuğun ikonu hem eski `.topback`
  vardı → eskiler silindi. Projede `.topback` kullanımı **sıfır**.
- ✅ **Oyun-içi ekranlar tasarım diline**: mod **brifingi**, **duraklat**, **hazırlık** — geri artık sol üst 46px ikon
  (`.shell-icon.shell-back`), eyebrow (bakır) + Cinzel başlık + `.panel` + `.btn-primary-x`.
  NOT: OnlineGame'deki "bağlantı koptu / tek kaldın / maç bitti" ekranlarındaki büyük "← Geri" **bilerek** kaldı —
  onlar geri navigasyonu değil, tek çıkış eylemi.

## OTURUM 2026-07-14 #7 — YENİ ÖN YÜZ (design handoff) — TÜM EKRANLAR (CANLI)
Kullanıcı `Blackout frontend.zip` (design_handoff_blackout_menu: README + `Ana Menu.dc.html`) verdi.
Kural: **oyun mantığı/dinamikleri DEĞİŞMEDİ** (`lib/*`, engine, netcode, denge aynı); yalnız sunum katmanı.
`next build` + tsc temiz.
- ✅ **Ortak kabuk `components/MenuShell.tsx`**: labirent canvas + scrim + grain + vinyet ARTIK TEK YERDE.
  `page.tsx` `chrome()` her menü ekranını `<MenuShell>` ile sarar → kökte hep aynı tip → React mount'ta tutar →
  **arka plan ekranlar arası KESİNTİSİZ** (eskiden her ekranda sıfırlanıyordu). Oyun ekranları kabuk kullanmaz.
- ✅ **Tipografi**: Archivo (gövde/buton/etiket) + Cinzel (YALNIZ büyük başlık) + EB Garamond (italik lore).
  `layout.tsx` font linki, `globals.css` gövde fontu + `button,input,select,textarea{font-family:inherit}`.
- ✅ **Tasarım tokenları** (`globals.css :root`): ink/gold/copper/blood, --card/--box/--edge*.
- ✅ **Chrome**: sol üst TEK geri butonu (46px, yalnız ok; `goBack()` geçmiş yığınından bir önceki ekran);
  menüde sol üst cüzdan çipi + sağ üst Ayarlar/Arkadaşlar (rozetli).
- ✅ **Ortak parçalar**: `.scr` (82px üst dolgu iskeleti) · `.panel` · `.seg` (segment) · `.btn-primary-x` ·
  `.card`+`.grid-184/232/268/340` · `.mm-modal` (modal) · `.toggle`/`.field-*` · `.danger-btn`.
- ✅ **Ekranlar**: Ana menü (2 kart + 6 tek tip kutu + Devam Et + Nasıl Oynanır modal) · Tek Kişilik brifing
  (zorluk segmenti) · **Çok Oyunculu (yeni `multi` ekranı)** · Dükkân (Özellikler/Kişiselleştirme sekmeleri,
  altın bandı, envanter şeridi, eşya ızgarası + KALICI rozeti, fener/görünüm swatch'ları) · Görevler
  (kart ızgarası + **brifing modalı**) · Modlar · Başarımlar (zorluk rozeti + ödül al) · Günlük (Roma rakamı +
  altın şerit) · Sırlar (ızgara + **detay modalı**) · Ayarlar · Arkadaşlar · Online Odalar · Lobi.
- ✅ **Shop çift kullanım**: `standalone` prop — MenuShell içinde çıplak, OnlineGame overlay'inde kendi zemini+kapat.
- ⏳ KALAN: Lobi'nin tasarımdaki "oyuncu yuvaları / hazır noktaları / boş yuva" detayı (şu an işlevsel ama
  eski iç düzen); sonuç ekranları (dead/levelclear/gameover/win) hâlâ eski `.screen` görünümünde (tasarımda yok).
  KALAN emoji yüzeyleri (menü dışı, oyun dışı): `OnlineLobby` (🏠/🔑/⚔️/▶/🪙), `Settings`/`Friends` "✓" mesajları.
- ⚠️ **ÇELİŞKİ (kullanıcı kararı bekliyor)**: Önceki istek "ayarlar her sayfada sağ üstte" idi; tasarım
  "ayarlar YALNIZ menüde" diyor. Şu an **tasarıma uyuldu**.

## OTURUM 2026-07-14 #6 — Arena kurallar/tur-arası (CANLI)
`next build` + tsc temiz:
- ✅ **Arena kuralları ekranı**: oyun başında **4 sn otomatik** (`rulesOpen` + timeout), HUD'daki **"?"**
  düğmesiyle istendiği an tekrar açılır ("Anladım" ile kapanır). İçerik: amaç (en çok öldüren turu kazanır),
  ilk {5} puan maçı alır, 2 dk tur, çıkış yok, ölüm=3sn bekleme, can seyrek.
- ✅ **Kendi öldürme sayın**: arena HUD'ında **"Öldürdüğün"** (bu tur, kırmızı çip) + **"Toplam"** (maç geneli).
- ✅ **Tur arası kazanan**: tur bitince yeni tur BAŞLAMADAN ~4 sn **herkese** "X turu kazandı · N gelin · +1 puan"
  + güncel puan tablosu gösterilir. Host `{t:roundend}` yayınlar → 4 sn sonra `{t:round}` ile yeni tur.
  Ara boyunca gelinler temizlenir (kimse saldırmaz), sayaç durur, dükkân kapanır.

## OTURUM 2026-07-14 #5 — Online/UI paketi (CANLI)
`next build` + tsc temiz:
- ✅ **Davet Et**: davet edilince buton kaybolur ("✓ Davet edildi" metni; `invited` kalıcı, timeout kaldırıldı).
- ✅ **Arkadaş ekle butonu**: sadece **+ ve profil ikonu** (roster "+ Arkadaş" ve Friends "İstek Gönder").
- ✅ **Roster ismi**: isim varsa isim, yoksa **kod** (`p.name.trim() || p.code`).
- ✅ **İsim kalıcı + herkeste**: `net.ts` boş isim fallback'i "Oyuncu" DEĞİL **arkadaş kodu** (`this.fcode`);
  `nameOf` sağlam fallback. Konulan isim (`blackout_name`) değiştirilene dek kalıcı.
- ✅ **Ayarlar her sayfada sağ üstte**: `.topsettings` (globals.css) + page.tsx `chrome()` sarmalayıcı tüm
  ekranlara ekler (oyun/menü/ayarlar hariç); menü kendi dişlisini çizer (`.mm-settings`). Ayarlardan çıkınca
  `settingsReturn` ile geldiği ekrana döner.
- ✅ **Dükkan zaman aşımı (#37)**: yarışta 12sn bekleme bitince + arena yeni tur başlayınca dükkan kapanır (oyuna at).
- ✅ **PvP kan**: oyuncu oyuncuyu vurunca isabet + kurban konumunda **kan sıçraması** (`bloodStains`) + ses.
- ✅ **Arena ROUND sistemi**: **2 dk tur**, **en çok gelin öldüren** turu kazanır (+1 puan), **ilk 5** maçı alır.
  Host-otoriter tally (herkesin `rk` pos'ta yayınlanır); `{t:round}`/`{t:arenaover}` mesajları. HUD: Tur/Süre(mm:ss)/
  Turda-kill/Puan. Bitişte şampiyon + puanlar + Menüye Dön. Gelinler tur numarasıyla YAVAŞ artar; **can seyrek**
  (`generateArenaLevel` healthN ↓).
- ✅ **Ölüm cezası (#40)**: online ölünce **3 sn ölü yerinde donarsın** (hareket/ateş/temas yok, "ÖLDÜN·N"),
  sonra doğarsın. `deadUntil` + `die()`; host gelin simülasyonu donmaz. Ölü oyuncular herkeste **soluk** (pos'ta `dead`).
- ✅ **Arena mobil buton (#41)**: online slot/envanter butonları `right:214`(joystick'e biniyordu)→ ateşin ÜSTÜne
  (`right:30`) alındı + küçültüldü (60px). Joystick/ateşle çakışmaz.

## OTURUM 2026-07-14 #4 — Dükkan/menü paketi (CANLI)
`next build` + tsc temiz:
- ✅ **Kozmetik kırpma**: fener 4 (crimson/toxic/violet/gold) + görünüm 4 (gold/violet/emerald/crimson).
  **Mor (violet) her ikisinde de** var. Kaldırılan shop item'ları (amber/ice/rose/cyan) — palet map'i durur (eski seçim korunur).
- ✅ **Asker müttefiki** (`inventory.hiredSoldier`, shop "soldier" 120 altın, `canBuy: !hiredSoldier`):
  - **SP**: `GameEngine(...hiredSoldier)` — oyuncunun yanında ESCORT asker doğar; takip + gelinlere ateş
    (mevcut `updateSoldiers`), ölünce YANINDA dirilir. Çizim: **senin görünüm halka rengin** + üstünde **ismin**
    (`blackout_name`). Sen ölünce (dead/gameover) bayrak temizlenir → yeniden alınabilir.
  - **ONLINE**: her istemci kendi askerini yerel simüle eder (takip + ortak mermi sistemiyle gelin öldürür),
    `pos`'a `sx/sy` eklenip yayınlanır → herkes birbirinin askerini **koltuk renginde + isimle** görür.
    Sen ölünce (respawn) asker gider + bayrak sıfırlanır.
- ✅ **Dükkan sekmeleri**: önce **Özellikler**; Altın-satın-al'ın ALTINDA **"Kişiselleştirme →"** butonu → kozmetik
  sekmesi. Kozmetikte **"← Özellikler"** butonuyla dönülür (geri tuşuyla değil). `Shop.tsx` `tab` state.
- ✅ **Menü okunabilirliği**: `.mm-item/.mm-schip/.mm-foot/.mm-sub/.mm-note/.mm-lore` daha parlak renk + koyu
  panel + kalın font + güçlü gölge; `.mm-scrim` merkez karartması arttı (yazı kontrastı).

## OTURUM 2026-07-14 #3 — 10 İSTEK (güzelleştirme) (CANLI)
`next build` + tsc temiz. Hepsi uygulandı:
- ✅ **Online Arena modu**: oda kurarken host toggle (`OnlineLobby` arena → StartInfo/net → `online.generateArenaLevel`
  açık alan, ÇIKIŞ YOK). `OnlineGame` arenaMode: çıkış açılmaz/kazanma yok, host **dalga dalga** gelin ekler
  (`ARENA_WAVE_MS=16sn`, üst sınır kişiye göre), HUD "Dalga N · Süre", co-op respawn. Yarış modu değişmedi (gated).
- ✅ **Hareket + özellik aynı anda (mobil)**: slot/özellik butonu `onClick`→`onPointerDown` (Game+OnlineGame) →
  joystick basılıyken 2. parmakla eşya kullanılır (onClick aktif dokunuşta tetiklenmiyordu).
- ✅ **50 başarım (10 kolay/30 orta/10 zor)**: `achievements.ts` yeniden — `tier` + kümülatif **istatistik sistemi**
  (`getStats/bumpStat/setStatMax`) + koşul tablosu + `evaluateAll(ctx)`. page.tsx: bitişlerde stat bump + değerlendir,
  menüye dönüşte de değerlendir. Game.tsx: kalkan/radar/tuzak/duvak kullanımı sayaç. Ekranda **zorluk rozeti** + sıralı.
- ✅ **Günlük açıklaması**: günlük ekranına atmosferik giriş (oyuncunun karaladığı kâğıtlar).
- ✅ **Çıkış çöküyor**: süre dolunca "ÇIKIŞ ÇÖKTÜ" (engine `crushed`→EndResult→dead ekranı) + süre **%10** arttı.
- ✅ **Tek kişilik devam**: `blackout_sp_progress` — play()'de kaydet, gameover/win'de temizle; intro'da
  "Devam Et → Bölüm N" + "Baştan Başla".
- ✅ **Menüye Dön**: dead/levelclear/gameover/win ekranlarına "← Menüye Dön".
- ✅ **Ayna düzeltildi**: artık çıkışın GERÇEK (mutlak) yönünü gösterir (`exitBearing`), ok **1.5 sn**
  (önceki 8sn canlı-ok/BFS ilk-adım kaldırıldı). Radar da mutlak yöne geçti.
- ✅ **Kuşanılan eşya kalıcı**: `blackout_equipped` localStorage — bölüm geçince slot boşalmaz.
- ✅ **Mobil geri tuşu**: `page.tsx` popstate + ekran geri-yığını → uygulamadan çıkmaz, bir önceki ekrana döner.
NOT: Online arena + PvP **2 gerçek cihaz** ister (panelde rAF durur, presence tek kimlik).

## OTURUM 2026-07-14 #2 — 11 İSTEK + Faz 9 ilerleme (CANLI)
Kullanıcı paketi (hepsi uygulandı, `next build` + tsc temiz):
- ✅ **Mobil zoom**: dokunmatikte kamera daha YAKIN (`Game.tsx`/`OnlineGame.tsx` resize: coarse'ta
  `across = vision*1.4+2`, cap 62) → harita/oyuncu büyük, göz yormaz.
- ✅ **Sekme müziği**: `audio.ts setupVisibility` — sekme arka plana geçince müzik+AudioContext duraklar,
  geri gelince (müzik açık & sessiz değilse) kaldığı yerden devam (`pausedByHide`). init+ensureEl'de kurulur.
- ✅ **Geri tuşu (`.topback`)**: her ekranda sol-üst, BÜYÜK + belirgin altın çerçeve/gölge (globals.css).
- ✅ **Ayna kehaneti CANLI ok**: tamamlanınca 8 sn `mirrorGuideUntil` — ana `update()`'te her kare
  `computeExitDir` + radar oku tazelenir → oyuncu yürüdükçe ok DAİMA doğru çıkışı gösterir (`engine.ts`).
- ✅ **Tek kişilik envanter = duraklat**: `invPausedRef` loop dondurur (envanter açıkken oyun durur).
- ✅ **Mobil menü arka planı**: kaydırınca adres çubuğu yüksekliği değişince labirent YENİDEN KURULMAZ
  (`MainMenu` onResize: yalnız genişlik ya da >160px yükseklik değişince rebuild) → animasyon sıfırlanmaz.
- ✅ **İç görünüm hafızası**: `MainMenu savedView` (modül) — bir ekrandan menüye "← Geri"de ana menüye
  değil çıkılan alt-menüye (Tek Kişilik/Çok Oyunculu) döner.
- ✅ **Online odalar ortalandı**: `Online.tsx` `.menuscreen`→`.screen` (dikey ortalı).
- ✅ **PvP modu**: oda kurarken toggle (`OnlineLobby` pvp → StartInfo/start payload → `net.ts`); OnlineGame'de
  mermi diğer oyuncuya değince `{t:pvphit,to}` (atıcı tespit, hedef hasar uygular) → `PVP_DMG=%10 can`.
  HUD'da "⚔️ PvP açık" çipi. İnvuln/duvak korunur.
- ✅ **Çağıran gelin çığlığı**: SP+online çok belirgin (kızıl nabız aura + 4 kalın genişleyen halka + "!" +
  titreşim, `screamT` boyunca). Online misafirde screamT yoksa boşta halka.
- ✅ **Dükkanda envanter özeti**: `Shop.tsx` üstünde kalkan/radar/tuzak/duvak/mermi/can/ekstra-can şeridi (canlı).
- 🔄 **Faz 9 ikonlar**: Game/OnlineGame HUD, Settings, page.tsx (Başarım/Günlük/Sırlar + rozetler) → line-icon.
  Kalan: page.tsx mod başlıkları (♾️🌑⚔️🐝) + miniquest HUD ikonları (d.icon emoji).

## YENİ İSTEK PAKETİ (2026-07-14) — CANLI: blackout-plum.vercel.app
- ✅ **Arena yeniden**: labirent DEĞİL **gepgeniş açık alan** (`maze.generateArena` 25×25, kenar duvarı + seyrek
  sütun); gelinler **YARIM hız** (`engine` arena kolu `zombieSpeed*0.5`); geniş görüş (+3); **bol can/mermi**
  (arena'da ammo=floors*0.05, health=floors*0.025) + mevcut respawn.
- ✅ **Mobil/HUD**: (a) oyun-içi **envanter butonu** artık slotun HEMEN ÜSTÜNDE (`.invbtn`, SP+online); üstteki
  HUD 📦 kaldırıldı. (b) mobilde HUD **sıkıştırıldı** (`pointer:coarse` küçük çip/font/hpbar) → oyun alanı büyük.
  (c) mobilde başlık artık `.topback`'in altında (`@media(max-width:640px)` üst boşluk) → örtüşme yok.
  (d) endless/mission sonuç ekranlarına da üst-buton. Doğrulandı (mobil viewport).
- ✅ **Dükkan**: Duvak (tüketilebilir, engine.activateVeil, SP slot) + 7 fener rengi + 7 görünüm halkası.
- ✅ **Arkadaş istek/kabul**: `friends.ts sendRequest/acceptRequest` (freq/faccept), Friends "İstek Gönder",
  page.tsx gelen-istek bandı (Kabul/Reddet) + kabul toast. **Ayarlarda kalıcı isim** (`blackout_name`).
- ✅ **Çoklu izleyici lobisi**: join bağlanınca host ekranı (kod+roster) ama zorluk/başlat PASİF + arkadaş isteği.
- ✅ **Yeni modlar**: **Kör Gece** (endless+visionMul 0.32) + **Sürü Gecesi** (arena+yoğun). page.tsx endless/arena
  akışı genelleştirildi (`endlessMission/arenaMission` state, `survBest` mod-başına en iyi, `bestKey`). Modlar 4 mod.
  Doğrulandı: Modlar ekranı 4 mod, tsc temiz, konsol temiz.
- ⏳ KALAN: Faz 9 oyun-içi HUD ikonları + 2-cihaz online testi + canlı deploy.

## BUG DÜZELTMELERİ (2026-07-14)
- ✅ **Kişiselleştirme kalıcılığı**: `inventory.ts getInventory` artık sahip listelerini DAİMA yeni dizi olarak
  döndürür (DEFAULT_INV'in paylaşılan dizisini mutasyona uğratmaz) + **kendini onarır**: seçili fener rengi/görünüm
  her zaman `ownedFlash/ownedSkin`'e dahil → eski/bozuk kayıtta kişiselleştirme bir daha satın aldırılmaz. Doğrulandı:
  bozuk kayıtta (amber seçili, owned'da yok) dükkân "✓ Seçili" gösteriyor, ücret almıyor.
- ✅ **Can paketi respawn**: mermi gibi geri doğar — SP `engine.ts HEALTH_RESPAWN_SEC=30` (pickupHealth respawn),
  online `OnlineGame HEALTH_RESPAWN_MS=30000` (health'e takenAt eklendi). Canın tamsa alınmaz ama süre dolunca döner.

## BÜYÜK REVİZE PAKETİ (2026-07-13) — 10 FAZ, sırayla
Kullanıcı kararları: arkadaş sistemi = **arkadaş kodu + Supabase presence** (hesapsız); yeni **Arena** =
**dalga hayatta kalma**; emoji→line-icon geçişi **en sona** (aşamalı). İlerleme:
- ✅ **Faz 1 — Menü & mobil UX**: mobil menü dikey kaydırma (`.mm-root` overflow-y:auto, `.mm-wrap` min-height:100dvh);
  lore yazısı Nasıl Oynanır+Ayarlar butonlarının ALTINA taşındı (in-flow); footer butonları çerçeveli chip;
  mobilde buton çerçeveleri belirgin (`@media(max-width:640px)`); mobilde HUD yazıları açıldı (`--muted` #8b93a7→#a7aec0,
  `pointer:coarse`'da `.chip .lbl` #c3c9d6); alt ekranlarda **`.topback`** (sol üst küçük "← Menü", globals.css) —
  başarım/günlük/sırlar/görevler/dükkân/ayarlar; alttaki büyük "← Menü/Geri" butonları kaldırıldı.
- ✅ **Faz 2 — Nasıl Oynanır yeniden**: `MainMenu.tsx` konu-bazlı (10 konu: Kontroller/Amaç/Gelinler/Can-Ölüm/
  Mermi/Dükkân/Envanter/Duvak/Fırsatlar/Ölüm Koşusu), tıkla→detay, **platform-duyarlı** kontroller
  (`matchMedia('(pointer:coarse)')` → mobilde joystick, PC'de tuşlar), "bir düğün gecesi" giriş paragrafı silindi.
- ✅ **Faz 3 — Oyun-içi ferahlat (tüm modlar)**: SP HUD'dan **Tema/Gelin/Skor** kaldırıldı (Süre yalnız görevde);
  online HUD'dan **Tema** kaldırıldı (skor=yarış, kaldı). **Kehanet 20sn→3sn** (`engine.mqHintUntil`). **Envanter
  slot mekaniği**: panelde eşyaya tıkla → KUŞAN (`equipped` state), ateşin solundaki **`.slotbtn`** ile kullan
  (mobilde ateşin solu, PC'de sağ-alt; online BARİYER'le çakışmasın diye `.slotbtn-mp` daha sola). Panel artık
  `.invbackdrop/.invcard` (masaüstünde **sağ-orta**, saydam zemin — harita açık kalır; mobilde ortalı modal).
  SP mobil ayrı Tuzak butonu kaldırıldı (slot kapsıyor). SP+online uygulandı; canlı doğrulandı (kuşan→slot "🛡️2").
- ✅ **Ek istekler (2026-07-13)**: alt ekranlarda "← Menü" HER ZAMAN sol üstte (`.topback` intro + online lobiye de
  eklendi); Nasıl Oynanır konu detayında belirgin **"← Geri"** çip butonu (`.mm-help-back`).
- ✅ **Faz 4 — İçerik**: **Sırlar 8→12** (`secrets.ts`) — birbirine bağlı + **TERS KÖŞE**: kaçan damat = OYUNCU
  (yeni sırlar: Fısıltıların Kaynağı/Damadın Kaçışı/Düşen Fener/Senin Adın/Gerçek Damat); MISSION_SECRET 12'lik
  bijection; SECRET_ENDING twist'e göre. **Görevler 9→12** (`missions.ts`: Gelin Alayı/Kör Sessizlik/Kal-finale).
  **Günlük 6→14** (`journal.ts`) oyuncunun ağzından, twist arkı. `engine.ts` günlük seçimi TOPLANMAMIŞ sayfadan
  (10 bölümde 14 sayfa toplanabilsin — eski `(level-1)%len` 10-13'ü hiç göstermezdi). Canlı: 12 görev/12 sır/14 günlük.
- ✅ **Faz 5 — Ekonomi & başarım**: `achievements.ts`'e zorluğa göre **`reward`** altını (10-100) + `claimReward`/
  `getClaimed`/`pendingRewardCount` (bir kez, `blackout_ach_claimed`). Başarım ekranında (page.tsx) her açık+alınmamış
  başarımda **"🪙 Ödülü Al (+n)"** butonu → alınca cüzdan artar + "✓ Ödül alındı". Dükkânda ilk ürün **"🪙 ALTIN SATIN
  AL"** (`Shop.tsx` GOLD_PACKS: 500/12₺, 1200/25₺, 3000/55₺) — **DENEME: ödeme yok**, tıklayınca altın bedava eklenir.
  Canlı: 0→500 altın, başarım +10 → 510, "Ödül alındı" doğrulandı.
- ✅ **Faz 6 — Modlar & Arena**: MainMenu'de "Bitmeyen Gece" primary'si **"Modlar"** oldu (`onModes`); yeni
  **Modlar ekranı** (page.tsx `modes`) Bitmeyen Gece + Arena'yı listeler (en iyi skorlarla). Yeni **Arena** modu
  (`missions.ARENA`, `engine` `arena`+`wave`): kapalı arena, çıkış yok, tek can; her **6 öldürmede dalga** yükselir
  → burst gelin + para bonusu; skor=dalga (`blackout_arena_best`). HUD "Dalga N · k/6". `arenaplay`/`arenaresult`
  ekranları (endless mimarisi). Canlı: Modlar/Arena açılıyor, "MOD" brief, konsol temiz.
- ⏳ **Faz 7 — Online**: oda kurma 200 altın; 2 kişiden az kalınca oda kapanır. (global erişim zaten var)
- ✅ **Faz 8 — Kayıt & sıfırla**: `Settings.tsx`'e **"⚠️ Oyunu Sıfırla"** — iki adımlı onay ("Emin misin?"),
  tüm ilerleme/satın alma anahtarlarını (`PROGRESS_KEYS`: coins/inventory/missions/secrets/journal/achievements/
  ach_claimed/best skorlar) siler + reload; **ses tercihleri korunur**. Canlı: para/başarım/arena silindi, vol=0.5 kaldı.
  (İlerleme/satın alma kaydı zaten localStorage'da kalıcı ✅.)
- ⏳ **Faz 9 — Line icon geçişi**: menü+oyun tüm emoji → temaya uygun özel SVG line-icon.
- ✅ **Faz 10 — Arkadaş sistemi** (`lib/friends.ts`, `components/Friends.tsx`): hesapsız **arkadaş kodu**
  (kalıcı `blackout_uid`, 6 hane) + yerel arkadaş listesi (`blackout_friends` ekle/sil). Global **presence**
  kanalı (`blackout:friends` broadcast, NetRoom deseni): "here" kalp atışıyla kim çevrimiçi + "invite" ile davet.
  Menüde sağ-üst **kare arkadaş butonu** (çevrimiçi rozetli, `MainMenu.onFriends/friendsOnline`). Arkadaşlar ekranı:
  kodunu paylaş/kopyala, ekle, çevrimiçi noktası. **Oda kurarken** (OnlineLobby host) çevrimiçi arkadaşları
  "Davet Et" → `presence.invite(code, roomCode)`. Davet gelince page.tsx'te **yeşil davet bandı** ("X seni davet
  etti · Katıl") → `pendingJoin` ile lobiye taşınıp o odaya otomatik katılır. Canlı UI doğrulandı (kod Y5ZG45,
  arkadaş ekleme çalıştı); presence+davet **2 gerçek cihaz** gerektirir. NOT: stale Turbopack konsol hatası
  (page.tsx:1059) — dosya doğru, son derleme ✓, app çalışıyor.
- 🔄 **Faz 9 — Line ikonlar (DEVAM EDİYOR)**: `components/Icon.tsx` ortak ince-ikon seti (30 ikon, currentColor
  SVG). Çevrildi: **ana menü** ikincil çipler (Sırlar/Dükkân/Başarım/Günlük + para) & arkadaş butonu, **Friends**
  başlığı, **Shop** (başlık/cüzdan/altın + tüm eşya kartları id→ikon eşlemesiyle). Canlı: menü emoji-siz, dükkân 17 ikon.
  KALAN: oyun-içi HUD (Game/OnlineGame: para/envanter/kalkan/radar/tuzak…), page.tsx ekran başlıkları (🏆/📖/♾️/⚔️),
  Settings (🎵/🔊), mission/secret başlık emojileri.
- 🎉 **Faz 1-8, 10 + 4 ek istek/bug TAMAM; Faz 9 kısmen.** Kalan: Faz 9 kalan yüzeyler + canlı deploy + 2-cihaz online testi.
Zaten yapılmış: eşya tüm modlarda ortak/kalıcı ✅, ilerleme kaydı ✅, online global ✅.

## ONLINE DÜKKÂN + AYRILMA HATASI DÜZELTMESİ (2026-07-13)
- ✅ **Online dükkân (market)** (`components/OnlineGame.tsx`): HUD'da 🛒 düğmesi + bölüm-sonu
  ekranında "🛒 Dükkâna Uğra" → mevcut `Shop` bileşeni tam-ekran overlay olarak açılır (kazandığın
  parayla eşya al). Açıkken oyun tuşları kilitli (`uiOpen` ref, keydown yok sayılır, giriş sıfırlanır);
  kapanınca para + envanter (📦) tazelenir (`openShop`/`closeShop`). Shop z-index 20, HUD/touch üstünde.
- ✅ **Yanlış "oyundan ayrıldı" hatası düzeltildi**: (1) `pos` kalp atışı artık **bölüm-sonu ekranında
  (resultPending) BİLE** gönderiliyor — asıl susma penceresi buydu (2.6sn overlay boyunca pos kesiliyordu).
  (2) `LEAVE_MS` 4sn→**10sn** (sekme arka plana alınınca rAF durur → pos kesilir; yüksek eşik tolere eder).
  (3) **Geri-getirme**: yalnız Menü'ye basıp `{t:left}` yollayan `explicitLeftIds`'e girer ve kalıcı
  çıkar; zaman aşımıyla düşürülen oyuncu pos yeniden gelince `reviveIfTimedOut` ile geri döner
  ("yeniden bağlandı"). onMessage üst filtresi artık yalnız `explicitLeftIds`'i tümden yok sayar.

## MÜZİK & ONLINE EKONOMİ OTURUMU (2026-07-13)
- ✅ **Online (Ölüm Koşusu) ekonomi + envanter** (`components/OnlineGame.tsx`): gelin başına **para**
  (`COIN_PER_KILL`, kişisel/kalıcı cüzdan `coins.ts`), tur kazanınca **+10 para** (`RACE_WIN_COINS`,
  yalnız kazanan seat'e). HUD'da 🪙 Para çipi. **Envanter** kişisel depodan (`inventory.ts`) tüketilir:
  **Q kalkan** (3sn dokunulmazlık), **R radar** (BFS ile çıkış yönü oku — `bfsDistances`), 📦 panel +
  touch düğmesi. Tuzak (T) zaten vardı. Radar oku render'ı SP'den aynen taşındı.
- ✅ **Müzik yönlendirme** (`app/page.tsx` + `OnlineGame.tsx`): **Ölüm Koşusu**'nda artık **dükkân
  müziği** (`envanter.mp3`) çalar (page `playScreenMusic("shop")`; OnlineGame'den `playGameMusic`
  kaldırıldı). **Dükkân** ekranında artık **menü müziği devam eder** (dükkânın ayrı müziği kaldırıldı).
- ✅ **Bitmeyen Gece müziği otomatik** (`components/Game.tsx`): oyun müziği artık mount'ta HEMEN başlar
  (`startAudio()` çağrısı) — tuşa basmayı beklemez; endless'e girer girmez çalar.
- ✅ **Islık dengesi** (`lib/audio.ts`): oyun-içi ıslık sesi `vol*0.6` → **`vol*0.45*0.35`** (oyun
  müziğinin ~%35'i) → normal oyun sesini bastırmıyor.
- ✅ **Nasıl Oynanır zenginleştirildi** (`components/MainMenu.tsx`): atmosferik giriş + kontroller +
  **"Kanlı Gelinler"** bölümü (7 tür: Kanlı/Karanlık/Mukus/Çağıran/Bölünen/Duvar-Aşan/Kraliçe özellikleri)
  + ipucu. Modal kaydırılabilir (max-height 86vh), yeni CSS (`.mm-intro/.mm-brides/.mm-tip`, `h3`).

---

> **ÖNCEKİ ÖZET:** "Ritim & Çeşitlilik Paketi" **TAMAMLANDI** — Faz 1-2-3-4-5 hepsi
> bitti ve commit'lendi (madde 0-11). **Faz 4** (madde 9 mini-görevler) ve **Faz 5** (madde 10
> rastgele korku olayları + madde 11 Mezarlık teması/Orman zenginleştirme) eklendi.

---

## 1) Oyun nedir?
**BLACKOUT** — karanlık labirentte el fenerinle yolunu keşfet, mermi topla, seni avlayan
**kanlı gelinlerden** kaç, gizli çıkışı bul. Next.js + React + TypeScript, saf **canvas** motoru.

- **Tek Kişilik:** 10 bölüm, kademeli zorluk, korku sesleri + müzik, mobil joystick.
- **Online Yarış (2 kişi, CANLI):** Oda/kod ile bağlan, aynı labirentte eşit doğuş, ilk çıkan
  kazanır + puan + sonsuz bölüm.

## 2) Durum (özet)
- ✅ **Tek kişilik**: bitti, çalışıyor.
- ✅ **Online Yarış**: bitti, **canlıda çalışıyor** (Vercel + Supabase Realtime).
- ✅ **Görsel birlik**: online da tek kişilik kadar detaylı (ortak sprite'lar).
- ✅ **Online ölüm modeli**: can barı + güvenli yeniden doğma (köşe-döngüsü çözüldü).
- ✅ **Çoklu oyuncu 2-6 kişi**: host otoriter roster, seat başına doğuş, herkes birbirini görür.
- ✅ **Zorluk seçimi** (host lobide seçer): Kolay/Orta/Zor → gelin sayısı/hız/zekâ.
- ✅ **Online ses**: ateş/toplama/hasar/kapı + **ölen gelinin ağlaması** (cry).
- ✅ **Ölüm senkronu**: gelin ölünce kan + ağlama HERKESTE (birden kaybolmuyor).
- ✅ **Mermi respawn**: toplanan mermi 10 sn sonra haritada geri doğar.
- ✅ **Bariyer aktifleşme**: 1 sn → **0.5 sn**.
- ✅ **Oyuncu isimleri**: lobide isim gir (localStorage'da saklanır), oyunda üstünde isim yazar.
- ✅ **Ayrılma bildirimi**: bir oyuncu çıkınca "X oyundan ayrıldı" toast'ı (pos akışı = kalp atışı, 4 sn).
- ✅ **Host göçü**: host çıkarsa en küçük koltuklu oyuncu otomatik devralır → gelinler donmaz.
- ✅ **Tek kalınca menü**: ≤1 oyuncu kalırsa "Menü" ekranı (2 kişilikte biri çıkınca).
- ✅ **Tek kişilik duraklat**: ⏸/Esc/P ile dondur + "Menüye Dön" (Game.tsx).
- ✅ **Can toplama**: yerde kırmızı haç can paketi (+45), canın tamsa alınmaz; tek kişilik + online. Ses: `heal`.
- ✅ **Mermi respawn tek kişilikte de**: toplanan mermi 10 sn sonra geri doğar (önce sadece online'daydı; `engine.ts` `AMMO_RESPAWN_SEC`).
- ✅ **Temalar (otomatik + rastgele)**: `lib/themes.ts` (Zindan/Hastane/Kilise/Orman). Her oyun rastgele
  temadan başlar, her 2 bölümde değişir. Online'da host seed'i herkese yayınlar (aynı tema). HUD'da "Tema".
- ✅ **Hikaye & ara sahne**: `lib/story.ts` — Tek Kişilik'te giriş anlatısı ("Neden buradasın?"), bölüm
  arası tekinsiz notlar (levelclear ekranında).
- ✅ **Ayarlar menüsü** (`components/Settings.tsx`): ses seviyesi kaydırıcısı + müzik aç/kapa + tüm sesler
  aç/kapa; tercihler localStorage'da (`blackout_vol/music/muted`). `audio.ts`'e setVolume/setMusic + applyLevels.
- ✅ **GÖREV MODU (tek kişilik)** — `lib/missions.ts` 8 görev: Avcı / Zamana Karşı / Yüzük Parçaları /
  Hayatta Kal / Kör Karanlık / Sessizlik (ateş yasak) / Tek Nefes (tek can) / Kıyamet Düğünü.
  `engine.ts` görev desteği (killTarget/collectTarget/timeLimit/surviveTime/visionMul/noFire/exitOpenAtStart,
  ölüm=başarısız). `Game.tsx` görev çipi + brifing (oyunu dondurur) + toplama parçası çizimi + ateş UI gizleme.
  Menüde "🎯 Görev Modu" → görev listesi (tamamlananlar ✓, localStorage `blackout_missions_cleared`).
  **Cila:** görev sonuç ekranı (Sonraki Görev → / Tekrar Dene / Liste) + görev başına **en iyi süre**
  (`blackout_mission_best`), listede gösterilir.
- ✅ **Gelin RESPAWN (toptan)**: ölen gelin **20 sn** sonra oyuncu(lar)dan uzakta yeniden doğar —
  tek kişilik + görev (`engine.ts` respawnQueue) + online (`OnlineGame.tsx` host, yeni id + brideRespawnQueue).
- ✅ **YENİ MOD: Sonsuz Hayatta Kalma** (`ENDLESS`) — çıkış yok, gelinler döner + her 18 sn ekstra doğar,
  skor = dayanılan süre, en iyi süre saklanır (`blackout_endless_best`). Menüde "♾️ Hayatta Kalma".
- ✅ **Müzik akışı düzeltildi**: ses bir kez açılınca menü ekranları arası KESİNTİSİZ çalar (eskiden her
  ekran değişiminde durup tekrar tıklama istiyordu). `page.tsx` tek-sefer unlock + oyun dışı ekranlarda durdurma yok.
- ✅ **GİZLİ SON / SIRLAR — GÖREV MODUNA bağlı** (`lib/secrets.ts`) — 8 sır, her **görev tamamlanınca
  KARIŞIK eşlemeyle** (Görev 1→Sır 3…) bir sır açılır (`MISSION_SECRET` bijection). Her sırda **sepya
  SVG fotoğraf** + 120-200 harflik, birbirine bağlı hikâye. Menüde "📷 Sırlar" → kart grid, açık sırra
  **tıkla → popup** (fotoğraf + altında metin). 8/8 → gizli son "Gerçek". Kayıt: `blackout_secrets`.
  (Eski tek-kişilik parça toplama kaldırıldı; 10. bölüm zorunluluğu yoktu artık.)
- ✅ **Tek kişilik ZORLUK** (Kolay/Orta/Zor) — giriş ekranında seçilir (`engine.ts` `Diff` + DIFF_MULT:
  gelin sayısı/hız/görüş ölçekler), `blackout_sp_diff`'te saklanır. Görevler kendi ayarını korur.
- ✅ **UI metinleri korku tonuna çekildi** (2026-07-12): mod adları — Yalnız Kaçış / **Ölüm Yarışı** /
  Karanlık Görevler / Bitmeyen Gece; ekran başlıkları (SENİ BULDULAR, KARANLIK KAZANDI, GÜN AĞARDI) ve
  açıklamalar daha atmosferik. Lobi "ÖLÜM YARIŞI". (Sadece görünen metin; ekran anahtarları aynı.)
- ✅ **Mini-görevler** (Madde 9): normal bölümlerde opsiyonel "Fırsat" hedefi (tek kişilik 7 çeşit; online
  yalnız "kanı takip et"), tamamlanınca ödül. Çıkışı geciktirmez (çember hariç), yarışı bozmaz. `lib/miniquests.ts`.
- ✅ **Rastgele korku olayları** (Madde 10): seyrek, hasarsız atmosfer anları (fısıltı/gölge/fener sıçraması/
  kapı çarpması/kalp atışı). `lib/scares.ts` — yerel, tek kişilik + online.
- ✅ **Temalar genişledi** (Madde 11+): Mezarlık + Buz Mağarası + Kanalizasyon + Cehennem (8 tema). Orman'da
  **duvarlar ağaç** (koridor ortası boş), zeminde alçak ot. `lib/decor.ts` (`drawDecor`/`drawWallDecor`).
- ✅ **Mini-görev revizyonu** (2026-07-13): Ayna = kehanet (5 sn bekle → çıkış yönü BFS ile), Yüzük = **+2 para**,
  Mumlar = sönük başlar/10 sn pencere/görsel düzeltildi, **Çember = çıkışı kilitler** (yalnız çemberde infazla
  açılır, uyarı + tıkla-sebep-gör), Çan = gelinleri çana yönlendirir (distract, mantıklı tuzak).
- ✅ **Para sistemi** (`lib/coins.ts`): kalıcı (localStorage `blackout_coins`), HUD'da "Para". Yüzükten kazanılır;
  ileride başka kaynaklar/dükkan gelecek.
- ✅ **Gelin düzeltme**: karanlık gelini bizi GÖRÜNCE normal hızda koşar (eski 0.28x yavaşlama kaldırıldı).
- ✅ **Can barı**: can azalınca kısa yanıp sönme (fark edilsin).
- ✅ **Ekonomi (Faz A)**: gelin öldürünce/bölüm geçince **para**; **risk=ödül** çarpanı (kolay 1.0/orta 1.3/
  zor 1.7 → para+puan). `engine.coinsEarned` → kalıcı cüzdan (`coins.ts`). levelclear/win ekranında gösterilir.
- ✅ **Dükkân + Envanter (Faz B)**: `lib/inventory.ts` (kalıcı) + `components/Shop.tsx`. Menüden + bölüm-arası
  dükkân. Tüketilebilir: **kalkan** (oyunda istediğin an 3sn dokunulmazlık), **radar** (çıkış yönü 1 kez),
  mermi/can paketi (bölüm başı). KALICI: sürekli cephane, +can hakkı. Kişiselleştirme: fener rengi, görünüm.
  Oyun-içi **📦 envanter paneli** ile kalkan/radar tıklayarak kullanılır. `engine.activateShield/Radar` + invuln.

### KALAN — sonraki fazlar (kullanıcı seçimi, 2026-07-13)
- ✅ **Faz C**: **Koşma/sprint** (#2, Shift/KOŞ + Nefes barı, stamina) + **Tuzak** (#4, dükkândan al, E/mobil
  ile koy, gelini %40'a yavaşlatır 8sn — DURDURMAZ). `config` sprint/trap sabitleri + `brides.slowCells`.
- ✅ **Faz D**: Yeni gelinler (tek kişilik) — **Çağıran** (#6, yakındakileri uyandırır), **Bölünen** (#7, ölünce
  2 hızlı yavru), **Duvar-tırmanan** (#10, duvarları aşarak yavaş süzülür), **Kraliçe-boss** (#9, her 4 bölümde
  bir, queenHp isabet, taç+can pip). `assignSpecialKinds` yalnız normal tek kişilikte; online/görev korunur.
- ✅ **Faz E**: **Kaçış bölümü** (#11, seyrek — çıkış açık + çökme geri sayımı, süre dolunca bir can; göreve de:
  görev 2 "Yıkım") + **Rehin kurtarma** (#13, kurtar → findPath ile takip → birlikte çıkınca bonus).
- ✅ **Faz F**: **Başarımlar** (#17, `lib/achievements.ts` 12 rozet + menü ekranı + sonuç bildirimi) +
  **Günlük** (#16, `lib/journal.ts` 6 sayfa — bölümlerde bul, menüde oku).
- 🎉 **KULLANICI SEÇİMİ PAKETİ TAMAM** (Faz A-F): ekonomi, dükkân+envanter, koşma+tuzak, 4 yeni gelin,
  kaçış+rehin, başarım+günlük. Kalan (kullanıcı sonraya bıraktı): online'a bu türlerin taşınması (host-otoriter).

## RİTİM & ÇEŞİTLİLİK PAKETİ (devam ediyor)
Amaç: tekdüzeliği kırmak, zorluğu artırmadan ritmi değiştirmek, online'da adaleti korumak.
Merkezi ayar: **`lib/config.ts`** (`TUNING`) — tüm denge sayıları burada.
- ✅ **Faz 1** (2026-07-13): Madde 0 kişi başı **max 4 gelin** (`brides.moveBrides(...,maxHunters)`, online host 4 verir,
  tek kişilik Infinity) · Madde 1 **kişi sayısına oranlı harita+yoğunluk** (`online.generateRaceLevel(...,playerCount)`) ·
  Madde 2 temas hasarı **35→20** · Madde 3 **yumuşak ease-in hız + %92 tavan** (`brideSpeedCap`, Zor'da bile geçilmez).
  Test: 12 Faz-1 + regresyon (573) geçti.
- ✅ **Faz 2**: Madde 4 **lastik-bant görüş** + Madde 5 **telegraph'lı fener kararması** — ortak
  `lib/flashlight.ts` (LERP yumuşak; gelin görmezsen görüş %65'e daralır, gelin çıkınca genişler;
  8-12sn'de bir 0.5sn uyarı + kısa dip + `flicker` sesi). Hem engine hem OnlineGame (yerel, her istemci
  kendi görüşü). Test: 6 Flashlight + regresyon geçti.
- ✅ **Faz 3**: Madde 6 **karanlıkta hızlanan gelin** (ışıkta yavaş/karanlıkta hızlı, kırmızı gözler karanlıkta
  görünür) + Madde 7 **mukus gelini** (ölünce 10sn hasar lekesi, ~8dps, parlak yeşil) + Madde 8 **gelin duvağı**
  (5sn görünmez, ateş=iptal, temas hasarı yok). `types.BrideKind` + `brides.assignBrideKind`; online host-otoriter
  (kind stream'e eklendi, mukus kill mesajıyla, duvak seat bazlı `{t:veil,on}` ile). Test: 13 Faz-3 + regresyon.
- ✅ **Faz 4** (2026-07-13): Madde 9 **mini-görevler** — normal bölümlere serpiştirilen opsiyonel hedefler.
  `lib/miniquests.ts` (7 görev: mumlar/yüzük/işaretli-infaz/çan/kanı-takip/fenersiz/ayna). Yüzük bir gelini
  delirtir (`brides.speedMul`, tavan geçerli), çan tüm gelinleri ayaklandırır, işaretli bölgede infaz ödül
  verir. Çıkışı GECİKTİRMEZ; tamamlanınca mermi/can/puan + HUD "Fırsat" çipi + toast. Online: yalnız KISA +
  gelin-nötr "kanı takip et" — deterministik plan (`mulberry32`, herkes aynı seviyeden aynı görevi bağımsızca
  üretir), kişisel mermi ödülü, host-otoriter gelin AI'sına dokunmaz. Test: 27 mini-görev.
- ✅ **Faz 5a** (2026-07-13): Madde 10 **rastgele korku olayları** — `lib/scares.ts` `ScareDirector`. Seyrek,
  cooldown'lu, HASARSIZ: fısıltı/uzak kapı çarpması/kalp atışı (ses) + kenardan geçen gölge/fener sıçraması
  (görsel). Art arda aynı tür yok, min taban korunur (spam yok). Tamamen yerel → online host-otoriterlik gerektirmez.
  `config.scareMin/MaxSec` + `audio` yeni sesler + engine/OnlineGame render fx. Test: 13 korku.
- ✅ **Faz 5b** (2026-07-13): Madde 11 **Mezarlık teması + Orman zenginleştirme** — `THEMES`e "Mezarlık" (soğuk
  toprak + soluk taş). Tema modeline `decor` alanı (graves/forest). `lib/decor.ts` hash tabanlı DETERMİNİSTİK
  zemin süsleri (mezar taşı/haç, ağaç/çalı) → tek kişilik + online aynı, ekstra ağ yok. Test: 13 tema/dekor.

### KURALLAR (tüm paket boyunca geçerli)
- localStorage şemasını bozma; yeni alanlar default'lu/geriye uyumlu.
- Online'da her yeni değişken **host-otoriter** (host simüle + broadcast); `deadBrides`/roster/host-göçü korunur.
- Tüm geçişler **LERP/ease** ile yumuşak (ani zıplama yok). Sabitler **`lib/config.ts` → `TUNING`**'de.
- Doğrulama: `npx tsc --noEmit` + headless Node testleri (scratchpad'de test-*.js; motor/brides/online saf mantık).
  Panelde rAF durur; görsel/online ancak gerçek tarayıcı/2 cihazla görünür.

### KALAN — Faz 4 (Madde 9): MİNİ-GÖREVLER  (lib/missions, lib/engine, lib/online, components/*)
Bölüm içine serpiştirilen **opsiyonel** mini-hedefler; tamamlayınca küçük ödül (mermi/can/puan). HUD'da aktif göster.
- **ÇOK ÖNEMLİ online dengesi:** Ölüm Koşusu bir YARIŞ → görevler oyunu UZATMAMALI. Her göreve KISA/UZUN etiketi.
  Online'da **sadece KISA/bonus** çıksın; UZUN olanlar (gezme/toplama) online'a YANSIMASIN. Online'da görev
  çıkışı geciktiren zorunlu adım OLMASIN (çıkış koşulu ≥1 gelin öldürme kalır); bölüm başına en fazla 1 kısa bonus.
- Görevler: "Üç mumu yak"[UZUN→tek kişilik], "Gelinin yüzüğünü bul"[ORTA: yüzük→bir gelin delirir/hızlanır],
  "İşaretli bölgede gelin öldür"[UZUN→tek], + paket: "Aynadan kaçma"[KISA], "Çanı çal"[ORTA: tüm gelinleri sana çeker
  — online'da kişi-başı-4 yine geçerli], "Kanı takip et"[KISA: sahte izler de var], "Fenersiz koridor"[UZUN→tek].

### KALAN — Faz 5 (Madde 10): RASTGELE KORKU OLAYLARI  (lib/engine, lib/audio, lib/vision, lib/themes)
- Ara ara (rastgele, seyrek, **cooldown'lu**) scripted anlar: ani fısıltı, ekran kenarından gölge, uzak kapı
  çarpması, fenerin bir anlık sıçraması, kısa kalp atışı yükselişi. **Hasar VERMEZ** (atmosfer, ceza değil).
  Sıklık ayardan/temadan etkilenebilir; art arda spam yok.

### KALAN — Faz 5 (Madde 11): YENİ TEMA (Mezarlık) + Orman zenginleştirme  (lib/themes, lib/maze, lib/sprites)
- `lib/themes.ts` THEMES dizisine **Mezarlık** ekle (mezar taşları, farklı zemin dokusu/renk paleti; ağaç/çalı/sis
  isteğe bağlı). Orman'ı zenginleştir. Online'da tema seed'i host'tan yayılıyor (mevcut mekanizma; RaceLevel.theme).
  NOT: yeni tema THEMES'e eklenince `themeIndexFor` otomatik kapsar; online serialize'da theme index zaten var.

### MİMARİ NOTLAR (uygulanan paketten)
- **`lib/config.ts` `TUNING`**: tüm denge (contactDps 20, brideSpeedCap=%92, maxHuntersPerPlayer 4, harita/yoğunluk,
  görüş lastik-bant, fener kararması, dark/mukus/duvak sabitleri).
- **`lib/flashlight.ts` `Flashlight`**: dinamik görüş+kararma; engine + OnlineGame yerel kullanır (her istemci kendi).
- **`lib/brides.ts`**: `moveBrides(...maxHunters, veiled?)`; `assignBrideKind(i,total)`; kind'e göre dark hızı.
- **`types.BrideKind`** (normal/dark/mucus) + `Mucus`. Online gelin stream'i 5. eleman = kind kodu.
- **Duvak (online):** seat bazlı `{t:"veil", seat, on}` mesajı; host `veiledUntil[seat]` tutar, `moveBrides`'a `veiled[]` verir.
- **Mukus (online):** kill mesajına `k` (kind) eklendi; `applyKill` mucus'ta leke ekler (herkeste).

## 3) Nasıl çalıştırılır (yerel)
```bash
cd D:\OneDrive\Desktop\blackout
npm install
npm run dev        # http://localhost:3007  (script: next dev; port'u -p 3007 ile veriyoruz)
```
> Not: Oyun `requestAnimationFrame` ile çalışır; **gerçek/görünür tarayıcıda** test et.

## 4) Deploy
- **GitHub:** https://github.com/ekurtulmus/blackout (main). Her `git push` → Vercel otomatik deploy.
- **Vercel:** blackout projesi. Online'ın canlı çalışması için env değişkenleri **eklendi**:
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Amiral Battı ile aynı Supabase projesi).
- **Deployment Protection** kapalı (site herkese açık).

## 5) Dosya haritası
| Dosya | Görevi |
|---|---|
| `app/page.tsx` | Ekran yönlendirme (`screen`) + `chrome()` kabuk sarmalayıcı + `backStack`/`goBack` + `isPlayScreen` |
| `app/globals.css` | **Tasarım tokenları + ortak parçalar** (`.shell*`, `.scr*`, `.panel`, `.card`, `.grid-*`, `.seg`, `.mm-*`) |
| `components/MenuShell.tsx` | **ORTAK KABUK**: labirent/scrim/grain/vinyet canvas + chrome (geri / cüzdan / tam ekran / ayarlar / arkadaşlar) |
| `components/MainMenu.tsx` | Ana menü içeriği (2 kart + 6 kutu + Devam Et + Nasıl Oynanır modalı) — arka planı KABUK çizer |
| `components/Icon.tsx` | Ortak ince (line) ikon seti — emoji yerine |
| `components/Game.tsx` | Tek kişilik: canvas döngüsü, HUD, klavye/joystick, brifing/duraklat/hazırlık ekranları |
| `components/OnlineGame.tsx` | Online yarış: ortak-dünya senkron, HUD, oynanış |
| `components/OnlineLobby.tsx` | Oda kur / kodla katıl (lobi) |
| `lib/engine.ts` | Tek kişilik oyun motoru (durum + güncelleme) |
| `lib/brides.ts` | Gelin YZ (çoklu oyuncu, en yakını kovalar) — ortak |
| `lib/sprites.ts` | Detaylı çizimler (drawPlayer, drawBride, grime) — ortak |
| `lib/physics.ts` | Çarpışma/hareket (opsiyonel bariyer duvarı) — ortak |
| `lib/online.ts` | Yarış seviyesi üretimi + eşit doğuş + serialize |
| `lib/net.ts` | Supabase Realtime oda (broadcast + el sıkışma) |
| `lib/audio.ts` | Web Audio ses sentezi + müzik dosyaları (can için `heal` sesi) |
| `lib/themes.ts` | Görsel temalar (Zindan/Hastane/Kilise/Orman/**Mezarlık**) + `decor` alanı + otomatik/rastgele seçim |
| `lib/decor.ts` | Madde 11: hash tabanlı deterministik zemin süsleri (mezar taşı/ağaç/çalı) — ortak |
| `lib/miniquests.ts` | Madde 9: mini-görev tanımları + deterministik planlayıcı (online-adil) — ortak |
| `lib/scares.ts` | Madde 10: rastgele korku olayları yönetici (ScareDirector, hasarsız/yerel) — ortak |
| `lib/coins.ts` | Para sistemi (kalıcı, localStorage) — gelin/bölüm/mini-görev ödülü |
| `lib/inventory.ts` | Envanter + dükkân eşyaları (kalkan/radar/tuzak/mermi/can/upgrade/kozmetik) |
| `components/Shop.tsx` | Dükkân ekranı (parayla satın alma) |
| `lib/achievements.ts` | Başarımlar (12 rozet, kalıcı) — Faz F |
| `lib/journal.ts` | Günlük/not sayfaları (hikaye parçaları) — Faz F |
| `lib/story.ts` | Hikaye girişi + bölüm arası tekinsiz notlar |
| `lib/maze.ts`, `lib/vision.ts`, `lib/pathfind.ts`, `lib/levels.ts`, `lib/types.ts` | Labirent, görüş/sis, yol bulma, bölüm ayarları, tipler |
| `public/audio/menu.mp3`, `game.mp3` | Açılış + oyun-içi müzik |

## 6) Yapılanlar (özellik listesi)
**Tek kişilik:** el feneri/sis · 4 çeşit kanlı gelin (seviyeyle zekileşir, asla vazgeçmez) ·
mermi/atış · çıkış kilidi · 3 can · 10 bölüm · sesler+müzik · joystick · kir/grain/kan/vinyet.

**Online yarış (2-6 kişi):** oda/kod · host zorluk seçer · N ayrık doğuş · ortak dünya
(her oyuncu koltuk rengiyle halkalı) · host-otoriter gelinler (tüm oyuncuları hedefler) ·
mermi/atış + **10 sn respawn** · **can barı + güvenli doğma** · kendi çıkışını aç ·
**bariyerler** (3 hak, E ile koy, **0.5 sn** sonra aktif, gelinler geçer, atış/temasla yıkılır) ·
ölümde kan+ağlama herkeste · ilk çıkan bölümü kazanır + puan tablosu + sonraki bölüm (sonsuz) ·
ses (ateş/toplama/hasar/kapı/ağlama).

## 7) SIRADA / Fikirler (buraya ekle-çıkar)
- [x] Online'a **ses** (ateş/toplama/hasar/kapı/ağlama + kalp atışı) — eklendi.
- [x] Çoklu oyuncu 2-6 kişi + host zorluk seçimi — eklendi.
- [x] Ölüm senkronu (kan+ağlama herkeste) + mermi respawn + bariyer 0.5 sn — eklendi.
- [x] İsim + ayrılma bildirimi + host göçü + tek kalınca menü + tek kişilik duraklat — eklendi.
- [x] Can toplama + görsel temalar (rastgele) + hikaye/ara sahne — eklendi (tsc + 498 birim test + DOM).
- [ ] **CANLI DOĞRULAMA (2+ gerçek cihaz — panelde rAF durur)**: katılma→Başlat→birbirini görme+isim,
      gelin/kan senkronu, skor tablosu, **biri çıkınca "X ayrıldı"**, **host çıkınca göç** (gelinler
      donmamalı), **2 kişide biri çıkınca "Menü"**. (Kod doğrulandı: tsc temiz + 304 birim test + lobi/duraklat DOM testi.)
- [ ] Kazanma ekranı iyileştirme (oda linki paylaşma, "tekrar oyna").
- [ ] Denge ince ayarı (can barı hızı, dokunulmazlık süresi, bariyer sayısı, respawn süresi).
- [ ] Geç katılan oyuncu (oyun başladıktan sonra) — şu an lobide katılmalı.
- [ ] (İsteğe bağlı) Versus modu: biri gelin, biri kaçan — netcode temeli hazır.
- [ ] (İsteğe bağlı) Co-op modu.

## 8) Önemli notlar / tuzaklar
- **Claude tarayıcı paneli** sayfayı `hidden` tutar → rAF durur, ses çıkmaz. Görsel/ses testi
  **gerçek tarayıcıda**. Doğrulama için: TypeScript (`npx tsc --noEmit`) + Node headless testler
  (scratchpad'de) + `get_page_text` ile HUD kontrolü.
- **Turbopack/OneDrive önbelleği** bazen eski hatayı gösterir (ör. "grime defined multiple times")
  oysa dosya doğru. Çözüm: dev sunucuyu yeniden başlat + `.next` klasörünü sil.
- **Windows uzantı tuzağı:** dosyayı "menu.mp3" yaparken "menu.mp3.mp3" olabilir (uzantı gizliyse).
- Git satır sonu: CRLF uyarıları normal, zararsız.

## 9) Kilitli kararlar (online yarış)
- **2-6 oyuncu**, **ortak dünya**, oda/kod. Host-otoriter (seat 0) + Supabase Realtime broadcast (~20/sn).
  Host katılanları bir **roster**'da (isimlerle) toplar, zorluk seçer, "Başlat" ile sıra+isim+seviye yayınlar.
- **İsim:** lobide girilir (localStorage `blackout_name`), start payload'ında seat sırasına göre taşınır.
- **Ayrılma:** `pos` akışı kalp atışıdır; 4 sn gelmezse "X ayrıldı" toast. Menü butonu hızlı `{t:left}` yollar.
  **Düzeltme (2026-07-12):** bölüm geçişinde yanlış "ayrıldı" atması giderildi — `buildWorld` diğer
  oyuncuları "mevcut" (seenAt=şimdi) kurar; tespit sadece 4 sn pos gelmezse tetiklenir (eski `mountTime`
  tabanlı grace kaldırıldı; o yüzden yeni bölümde herkes anında atılıyordu).
- **Host göçü:** `amHost = mySeat === min(hayatta koltuklar)`, her kare hesaplanır. Guest→host geçişinde
  gelinleri son akıştan (guestBrides) tam simülasyona çevirir. Tek host kalır (deterministik, split-brain min.).
- **Devam kuralı:** biri çıkınca kalan ≥2 ise oyun sürer; ≤1 kalırsa "Menü" ekranı (`alone`).
- Aynı labirent, çıkışa uzak **ayrık N doğuş** (seat = roster sırası). İlk çıkan +1 puan, **sınırsız**.
- **Zorluk** (host seçer): Kolay/Orta/Zor → gelin sayısı × {0.6, 1.0, 1.4}, hız × {0.82,1,1.12} (cap 3.15), zekâ ±.
- **PvP yok** (birbirine değemez/ateş edemez). Tek etkileşim: **bariyer** (0.5 sn'de aktif).
- **Ölüm:** can barı; bar bitince başta doğ (tam can + 2 sn dokunulmazlık + 1 mermi).
  Gelin ölünce **kan + ağlama HERKESTE** (`kill` yayını + `deadBrides` ile ıraksama yok).
- **Mermi:** kişisel/yerel düzen; toplanan mermi **10 sn** sonra haritada geri doğar.
- **Çıkış:** herkes kendi çıkışını açar (≥1 gelin öldür).

## Sinematik menü + ses + online eğlence (2026-07-13, son oturum)
- ✅ **Sinematik ana menü** (`components/MainMenu.tsx`): kullanıcının tasarımı — Cinzel başlık, tepeden-bakış
  labirent animasyonu, kanlı vinyet, "Nasıl Oynanır" modal. Tüm modlar + ikincil (Sırlar/Dükkân/Başarım/Günlük
  ikonlu) + foot. Menüden girilen ekranlar aynı temada (`.screen`/`.menuscreen`/`.card-parch`, Cinzel/EB Garamond).
  Tıklama: büyük saydam-çerçeveli kutular; lore `pointer-events:none`.
- ✅ **Müzik**: `sirlar.mp3` (Sırlar), `envanter.mp3` (Dükkân), `islik.mp3` (oyunda ara sıra). `audio.ts`
  playScreenMusic/startWhistles (yumuşak fade); `page.tsx` ekrana göre parça değiştirir.
- ✅ **Kozmetik sahiplik**: bir kez alınan fener rengi/görünüm tekrar para vermeden kuşanılır (ownedFlash/ownedSkin).
- ✅ **Radar oku**: metin yerine 1.5 sn ekranda çıkışa dönük parlak ok.
- ✅ **Mobil**: HUD butonları büyük (44px), envanter ortalanmış modal (ateş butonunu kapatmaz).
- ✅ **ONLINE Dilim B**: gelin çeşitleri online'a (host-otoriter) — çağıran/bölünen/duvar-tırmanan/kraliçe
  (boss, büyük+taç+aura, tek-vuruş) + **tuzak** (T/mobil, host slowCells ile yavaşlatır). BKind 7 türe genişledi.
- ⚠️ **OneDrive tuzağı**: bu oturumda Turbopack ara-düzenlemeyi cache'ledi (Game.tsx hayalet parse hatası).
  Çözüm işe yaradı: sunucu durdur + `.next` & `node_modules/.cache` sil + dosyayı zorla yeniden yaz + restart.

## 10) Son commitler (git log)
- `2b719a9` Mobil koş+kılıç yan yana + PC sağ tık = silah değiştir
- `96e13fd` KILIÇ: temel silah (tekli+çoklu) + 3 renk + silah değiştirme
- `13793f8` Online: davet/oda-kapandı + arena puan sistemi + çıkış onayı
- `6857978` Online: "oda kapandı" yanlış alarmı + zorluk baskısı + arena HUD + istek popup'ı
- `6b518a0` Gelin duran oyuncuyu vurmayı bırakıyordu + zorluk orantısı + arena eksikleri
- `a1b2ded` Online: isim yerine kod + arkadaşlık isteği lobide/oyunda görünmüyordu
- `c2bc546` Mobil: Sırlar 3x4 tek ekrana + brifing metni %50 kısaldı
- `fcfbbf8` Mobil: menü/brifing/sırlar kompakt + lobide zorluk yan yana
- `6fbada7` İsim kaydedilmiyordu: arkadaş kodu isim olarak yazılıyordu
- `69c4d7a` Aydınlık tema okunabilirlik + ekran kenarı karartısı kaldırıldı
- `6053dec` Aydınlık tema + ekran müzikleri + görev/mod kart düzeni
- `066a422` HUD düzeni (bilgi/aksiyon ayrımı) + oyun-içi line-icon + altın ikonu + kart başlıkları + endless sonucu
- `d0e2ebc` Oyun-içi brifing/duraklat/hazırlık → tasarım dili (geri = sol üst 46px ikon)
- `2ee4957` Günlüğe sırlar müziği + GERİ DÖNGÜSÜ düzeltmesi + çift geri butonu kaldırıldı
- `a829234` Serif temizliği (Archivo) + Nasıl Oynanır eski hali + sayfalar büyütüldü + tam ekran butonu
- `dbe319e` Yeni ön yüz Faz 3-5 (Dükkân/Görevler/Modlar/Başarım/Günlük/Sırlar/Ayarlar/Arkadaşlar/Online/Lobi)
- `72be12b` Yeni ön yüz Faz 1-2 (MenuShell kabuk + fontlar + tokenlar + ana menü + brifing + çok oyunculu)
- `81e42c4` Online CANLI skor tablosu + ölüm donması sıfırlama + arena ara temiz
- `f4e482f` Arena kurallar ekranı (4sn + "?") + kendi öldürme sayısı + tur arası kazanan
- `219c834` Online/UI paketi (davet/isim/ayarlar/PvP kan/arena ROUND/ölüm cezası/mobil butonlar)
- `5a4a0ab` Dükkân/menü paketi (kozmetik 4+4, asker müttefiki, sekmeler, menü okunabilirliği)
- `b23ad57` 10 istek (online Arena, 50 başarım, devam et, menüye dön, mobil geri tuşu…)
- `efd836f` 11 istek (mobil zoom, sekme müzik, PvP modu, çağıran çığlık, Faz 9 ikonlar…)
- `e43f9e3` Dilim B: gelin çeşitleri + tuzak online'a (host-otoriter)
- `00db9a8` Müzik + kozmetik sahiplik + radar oku + MP ikonu + mobil
- `c56095e` Faz F: Başarımlar + Günlük
- `6e30ac7` Faz E: Kaçış bölümü + Rehin kurtarma
- `91a6272` Faz D: Yeni gelin türleri (çağıran/bölünen/tırmanan/kraliçe)
- `c40f123` Faz C: Koşma (sprint) + Tuzak
- `78e67fa` Faz B: Dükkân + Envanter
- `e9ffa9b` Faz A: Ekonomi temeli (para + risk=ödül)
- `9dd8b0f` Mini-görev revizyonu + para sistemi + tema/gelin/can-barı iyileştirmeleri
- `16bdc93` Faz 5 (Madde 11): Mezarlık teması + Orman zenginleştirme
- `4202802` Faz 5 (Madde 10): Rastgele korku olayları — atmosfer, hasarsız
- `1ff58c7` Faz 4 (Madde 9): Mini-görevler — bölüm içi opsiyonel hedefler + ödül
- `de6ba86` Anti-radar: 2 hak, her biri tek tur geçerli
- `5f06f5d` Online: can barı + güvenli yeniden doğma
- `d75db3d` Görsel birlik (ortak sprite'lar; online detaylı)
- `31d5202` Faz 2c: online bariyerler
- `c0bf651` Online Yarış modu (Faz 0-2b,2d)
- `c95b138` Ses ayarları (silah kısık, ağlama yüksek, menü müziği)
- ... (tek kişilik: kanlı gelinler, korku sesleri, zorluk, joystick vb.)

---

### Bu dosya nasıl güncellenir?
Her anlamlı adımda: **Durum (2)**, **Sırada (7)** ve **Son commitler (10)** bölümlerini güncelle;
üstteki tarihi değiştir. Claude'a "DEVAM.md'yi güncelle" dersen ben yaparım.
