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
| `lib/audio.ts` | Web Audio ses sentezi + müzik dosyaları |
| `lib/maze.ts`, `lib/vision.ts`, `lib/pathfind.ts`, `lib/levels.ts`, `lib/types.ts` | Labirent, görüş/sis, yol bulma, bölüm ayarları, tipler |
| `public/audio/menu.mp3`, `game.mp3` | Açılış + oyun-içi müzik |

## 6) Yapılanlar (özellik listesi)
**Tek kişilik:** el feneri/sis · 4 çeşit kanlı gelin (seviyeyle zekileşir, asla vazgeçmez) ·
mermi/atış · çıkış kilidi · 3 can · 10 bölüm · sesler+müzik · joystick · kir/grain/kan/vinyet.

**Online yarış:** oda/kod · eşit BFS doğuş · ortak dünya (rakibi turuncu halkalı görürsün) ·
host-otoriter gelinler · mermi/atış · **can barı + güvenli doğma** · kendi çıkışını aç ·
**bariyerler** (3 hak, E ile koy, 1 sn sonra aktif, gelinler geçer, atış/temasla yıkılır) ·
ilk çıkan kazanır + puan + sonraki bölüm (sonsuz).

## 7) SIRADA / Fikirler (buraya ekle-çıkar)
- [ ] Online'a **ses** (silah/gelin/kazanma/kalp atışı) — şu an sadece görsel.
- [ ] Kazanma ekranı iyileştirme (toplam skor, "tekrar oyna", oda linki paylaşma).
- [ ] Denge ince ayarı (can barı düşme hızı, dokunulmazlık süresi, bariyer sayısı).
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
- İki cihaz, **ortak dünya**, oda/kod. Host-otoriter + Supabase Realtime broadcast (~20/sn).
- Aynı labirent, çıkışa **eşit mesafeli** doğuş. İlk çıkan +1 puan, **sınırsız**.
- **PvP yok** (birbirine değemez/ateş edemez). Tek etkileşim: **bariyer**.
- **Ölüm:** can barı; bar bitince başta doğ (tam can + 2 sn dokunulmazlık + 1 mermi).
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
