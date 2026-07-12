# BLACKOUT — Devam / Durum Dosyası

> **Bu ne?** Projenin canlı el kitabı. Yeni bir sohbette "DEVAM.md'yi oku, buradan devam
> edelim" dersen kaldığımız yerden sürdürebiliriz. **Her ilerlemede güncellenir.**
> Son güncelleme: **2026-07-12**

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
| `app/page.tsx` | Menü + ekran akışı (Tek Kişilik / Online Yarış / ekranlar) |
| `components/Game.tsx` | Tek kişilik: canvas döngüsü, HUD, klavye/joystick |
| `components/OnlineGame.tsx` | Online yarış: ortak-dünya senkron, HUD, oynanış |
| `components/OnlineLobby.tsx` | Oda kur / kodla katıl (lobi) |
| `lib/engine.ts` | Tek kişilik oyun motoru (durum + güncelleme) |
| `lib/brides.ts` | Gelin YZ (çoklu oyuncu, en yakını kovalar) — ortak |
| `lib/sprites.ts` | Detaylı çizimler (drawPlayer, drawBride, grime) — ortak |
| `lib/physics.ts` | Çarpışma/hareket (opsiyonel bariyer duvarı) — ortak |
| `lib/online.ts` | Yarış seviyesi üretimi + eşit doğuş + serialize |
| `lib/net.ts` | Supabase Realtime oda (broadcast + el sıkışma) |
| `lib/audio.ts` | Web Audio ses sentezi + müzik dosyaları (can için `heal` sesi) |
| `lib/themes.ts` | Görsel temalar (Zindan/Hastane/Kilise/Orman) + otomatik/rastgele seçim |
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

## 10) Son commitler (git log)
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
