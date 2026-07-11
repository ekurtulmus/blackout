# Ses dosyaları

Oyun bu klasördeki iki dosyayı otomatik kullanır:

- **`menu.mp3`** — Açılış / menü müziği (oyun açıldığında, menüde çalar).
- **`game.mp3`** — Oyun-içi arka plan müziği (oynarken döngüyle çalar, düşük seviyede).

## Nasıl eklenir

1. Ses dosyalarını **tam olarak** `menu.mp3` ve `game.mp3` adıyla bu klasöre (`public/audio/`) koy.
2. Kaydet — Next.js bunları `/audio/menu.mp3` ve `/audio/game.mp3` olarak sunar.
3. Tarayıcıyı yenile. Menüde/oyunda ilk tuşa/dokunuşa basınca çalmaya başlar
   (tarayıcı otomatik-oynatma kuralı gereği ilk etkileşim şart).

## Notlar

- Biçim: **.mp3** önerilir (her tarayıcıda çalışır). Farklı biçim (.ogg/.wav)
  vermek istersen kod tarafını ona göre güncelleyebilirim.
- **`game.mp3` yoksa** oyun kendi sentezlediği korku ambiyansını (uğultu +
  kalp atışı + uzak iniltiler) çalmaya devam eder — yani dosya koymasan da sessiz kalmaz.
- Silah/zombi/hasar gibi efekt sesleri her hâlükârda kod içinde üretilir; müzik
  dosyaları sadece arka plan/atmosfer içindir.
- Ses seviyeleri: menü 0.55, oyun-içi 0.45 (kod içinden ayarlanabilir).
