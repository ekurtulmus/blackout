# BLACKOUT — Karanlıkta Kaçış

Karanlık bir labirentte el fenerinle yolunu keşfet, mermileri topla, zombilerden kaç ve gizli çıkışı bul. Tek kişilik, tarayıcıda çalışan (canvas) atmosferik kaçış oyunu.

## Oynanış

- **Hareket:** WASD / ok tuşları
- **Ateş:** Boşluk — gittiğin yöne ateş eder
- Yerdeki parlayan mermileri topla (seyrek; zombi sayısı + tampon).
- En az **1 zombi öldürünce çıkış açılır**.
- Karanlıkta gizli çıkış kapısını keşfederek bul ve ulaş → sonraki bölüm.
- **3 can** hakkı. Zombi teması can barını düşürür. Ölünce bölüm baştan; üç hak biterse oyun en başa.
- **10 bölüm**, kademeli zorluk: labirent büyür, zombi sayısı/hızı artar.

## Görüş sistemi

- Oyuncunun yakın çevresi net aydınlık (el feneri).
- Keşfedilen yerler soluk gri "hafıza" olarak kalır.
- Gidilmeyen yerler tamamen karanlık.
- Çıkış vurgulanmaz — asıl zorluk onu karanlıkta bulmak.

## Geliştirme

```bash
npm install
npm run dev
```

Sonra tarayıcıda `http://localhost:3000` (veya terminalde yazan port).

## Mimari

- `lib/maze.ts` — labirent üretimi (recursive backtracker + braid)
- `lib/vision.ts` — görüş hattı / el feneri / hafıza sisi
- `lib/pathfind.ts` — zombi yol bulma (BFS)
- `lib/levels.ts` — 10 bölümün zorluk eğrisi
- `lib/engine.ts` — oyun durumu + her kare güncelleme (hareket, çarpışma, zombi YZ, mermiler, çıkış)
- `components/Game.tsx` — canvas render, oyun döngüsü, klavye + dokunmatik kontroller, HUD
- `app/page.tsx` — menü ve ekran akışı (bölüm sonu / ölüm / oyun bitti / kazandın)

## Yol haritası

- [ ] Ses efektleri + atmosfer müziği
- [ ] Yüksek skor (Supabase)
- [ ] Farklı zombi türleri / güçlendirmeler
