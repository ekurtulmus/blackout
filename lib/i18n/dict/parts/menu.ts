import { definePart } from "./_part";

// Ana menu: Nasil Oynanir modali, alt kutular (Sirlar/Gunluk/Basarimlar/Dukkan/Modlar/Gorevler), Devam Et
// (Bu parca doldurulacak: tr = kaynak, en = ceviri. Anahtar bicimi: <alan>.<oge>)
export const menu = definePart({
  tr: {
    // — Ana menü üst blok —
    "menu.eyebrow": "Karanlıkta Kaçış",
    "menu.lore.a": "Bir düğün vardı; kimse ondan sağ dönmedi.",
    "menu.lore.brides": "Kanlı gelinler",
    "menu.lore.b": "hâlâ damadını arıyor.",
    "menu.continue": "Devam Et",

    // — Alt kutular —
    "menu.box.missions": "Görevler",
    "menu.box.modes": "Modlar",
    "menu.box.shop": "Dükkân",
    "menu.box.achievements": "Başarım",
    "menu.box.journal": "Günlük",
    "menu.box.secrets": "Sırlar",

    // — Nasıl Oynanır modalı (çerçeve) —
    "menu.help.title": "Nasıl Oynanır",
    "menu.help.lead": "Merak ettiğin konuya dokun:",
    "menu.help.close": "Kapat",

    // — Konu: Kontroller (dokunmatik / klavye) —
    "menu.help.controls.title": "Kontroller",
    "menu.help.controls.move": "Hareket",
    "menu.help.controls.move.touch": "Sol alttaki joystick'i sürükle — çektiğin yöne yürürsün.",
    "menu.help.controls.move.key": "WASD veya ok tuşları · Shift ile koş (nefes barı tükenir).",
    "menu.help.controls.fire": "Ateş / Kılıç",
    "menu.help.controls.fire.touch": "Sağ alttaki büyük düğme kuşandığın silahı kullanır.",
    "menu.help.controls.fire.key": "Boşluk ya da SOL TIK — kuşandığın silahı kullanır.",
    "menu.help.controls.swap": "Silah değiştir",
    "menu.help.controls.swap.touch": "Ateşin yanındaki düğmeyle mermi ↔ kılıç arası geç.",
    "menu.help.controls.swap.key": "F tuşu veya SAĞ TIK — mermi ↔ kılıç.",

    // — Konu: Amaç & Bölüm —
    "menu.help.goal.title": "Amaç & Bölüm",
    "menu.help.goal.body": "Kapkaranlık labirentte fenerinle yolunu bul.",
    "menu.help.goal.lock": "Çıkış kilidi",
    "menu.help.goal.lock.body": "Çıkış önce KİLİTLİ. En az 1 gelini yok edince açılır.",
    "menu.help.goal.next": "Bölüm geç",
    "menu.help.goal.next.body": "Yeşil parlayan kapıya ulaş → sonraki bölüm. Yalnız Kaçış'ta 10 bölüm.",

    // — Konu: Kanlı Gelinler —
    "menu.help.brides.title": "Kanlı Gelinler",
    "menu.help.brides.classic": "Kanlı Gelin",
    "menu.help.brides.classic.body": "Klasik avcı. Görünce koşar, asla vazgeçmez; bölümle zekileşir.",
    "menu.help.brides.queen": "Kraliçe Gelin",
    "menu.help.brides.queen.body": "Dev boss, birkaç bölümde bir. Taçlı, kızıl auralı, çok tehlikeli.",
    "menu.help.brides.others": "Karanlıkta hızlanan, bölünen, çağıran, duvar aşan türler de var — oynadıkça tanırsın.",

    // — Konu: Can & Ölüm —
    "menu.help.life.title": "Can & Ölüm",
    "menu.help.life.lives": "3 can",
    "menu.help.life.lives.body": "Gelin teması can barını düşürür. Bar bitince bir can gider.",
    "menu.help.life.respawn": "Yeniden doğuş",
    "menu.help.life.respawn.body": "Ölünce bölüm başında kısa dokunulmazlıkla doğarsın.",
    "menu.help.life.heart": "Kalp atışı",
    "menu.help.life.heart.body": "Karanlıkta kalbin hızlanır — yakında gelin var demektir.",

    // — Konu: Mermi & Ateş —
    "menu.help.ammo.title": "Mermi & Ateş",
    "menu.help.ammo.limited": "Sınırlı mermi",
    "menu.help.ammo.limited.body": "Yerdeki parlayan mermileri topla; boşa harcama.",
    "menu.help.ammo.noise": "Ses çeker",
    "menu.help.ammo.noise.body": "Ateş sesi gelinleri üstüne çeker.",
    "menu.help.ammo.respawn": "Geri doğar",
    "menu.help.ammo.respawn.body": "Toplanan mermi 10 sn sonra yerinde geri belirir.",

    // — Konu: Dükkân & Altın —
    "menu.help.gold.title": "Dükkân & Altın",
    "menu.help.gold.earn": "Altın kazan",
    "menu.help.gold.earn.body": "Gelin öldürünce ve bölüm geçince altın kazanırsın.",
    "menu.help.gold.shop": "Dükkân",
    "menu.help.gold.shop.body": "Kalıcı geliştirmeler (sürekli cephane, asker müttefiki) ve kozmetik (fener/kılıç/görünüm renkleri) al.",
    "menu.help.gold.forever": "Her yerde geçerli",
    "menu.help.gold.forever.body": "Aldığın her şey tüm modlarda ve bölümlerde geçerlidir.",

    // — Konu: Duvak & Fırsatlar —
    "menu.help.veil.title": "Duvak & Fırsatlar",
    "menu.help.veil.veil": "Duvak",
    "menu.help.veil.veil.body": "Yerde bulup kuşan; tetikleyince birkaç sn görünmez olursun (ateş/saldırı bozar).",
    "menu.help.veil.chances": "Bölümlerde ara sıra opsiyonel 'Fırsat' hedefleri çıkar; çıkışı geciktirmez.",
    "menu.help.veil.ring": "Yüzük",
    "menu.help.veil.ring.body": "Ekstra altın verir — ama bir gelini çıldırtıp hızlandırır.",
    "menu.help.veil.mirror": "Ayna",
    "menu.help.veil.mirror.body": "Kehanet: birkaç sn beklersen çıkışın yönünü gösterir.",
    "menu.help.veil.bell": "Çan",
    "menu.help.veil.bell.body": "Tüm gelinleri çana çeker — hepsini bir noktada toplar.",
    "menu.help.veil.candles": "Mumlar / Kan izi",
    "menu.help.veil.candles.body": "Mumları yak ya da doğru kan izini takip et → ödül.",

    // — Konu: Ölüm Koşusu (Online) —
    "menu.help.race.title": "Ölüm Koşusu (Online)",
    "menu.help.race.body": "2-6 kişi aynı labirentte yarışır; ilk çıkan bölümü kazanır, puan birikir.",
    "menu.help.race.barrier": "Bariyer",
    "menu.help.race.barrier.body": "Bölüm başına 3 hakkın var; koyduğun bariyer rakibin yolunu kapar, bir atışla yıkılır.",
    "menu.help.race.shop": "Dükkân",
    "menu.help.race.shop.body": "Turlar arası dükkândan kazandığın altınla eşya al.",
    "menu.help.race.death": "Ölüm",
    "menu.help.race.death.body": "Can barın bitince 3 sn bekleyip başta güvenle doğarsın; yarış sürer.",
  },
  en: {
    // — Ana menü üst blok —
    "menu.eyebrow": "Escape the Dark",
    "menu.lore.a": "There was a wedding; no one came back alive.",
    "menu.lore.brides": "The blood brides",
    "menu.lore.b": "are still looking for their groom.",
    "menu.continue": "Continue",

    // — Alt kutular —
    "menu.box.missions": "Missions",
    "menu.box.modes": "Modes",
    "menu.box.shop": "Shop",
    "menu.box.achievements": "Achievements",
    "menu.box.journal": "Journal",
    "menu.box.secrets": "Secrets",

    // — Nasıl Oynanır modalı (çerçeve) —
    "menu.help.title": "How to Play",
    "menu.help.lead": "Tap whatever you're curious about:",
    "menu.help.close": "Close",

    // — Konu: Kontroller (dokunmatik / klavye) —
    "menu.help.controls.title": "Controls",
    "menu.help.controls.move": "Move",
    "menu.help.controls.move.touch": "Drag the joystick at the bottom left — you walk wherever you pull it.",
    "menu.help.controls.move.key": "WASD or the arrow keys · hold Shift to run (your breath bar drains).",
    "menu.help.controls.fire": "Fire / Sword",
    "menu.help.controls.fire.touch": "The big button at the bottom right uses the weapon you have equipped.",
    "menu.help.controls.fire.key": "Space or LEFT CLICK — uses the weapon you have equipped.",
    "menu.help.controls.swap": "Swap weapon",
    "menu.help.controls.swap.touch": "The button next to fire switches between ammo ↔ sword.",
    "menu.help.controls.swap.key": "F key or RIGHT CLICK — ammo ↔ sword.",

    // — Konu: Amaç & Bölüm —
    "menu.help.goal.title": "Goal & Chapters",
    "menu.help.goal.body": "Find your way through the pitch-black maze by lantern light.",
    "menu.help.goal.lock": "The exit is locked",
    "menu.help.goal.lock.body": "The exit starts LOCKED. Destroy at least 1 bride and it opens.",
    "menu.help.goal.next": "Next chapter",
    "menu.help.goal.next.body": "Reach the glowing green door → next chapter. Solo Escape has 10 chapters.",

    // — Konu: Kanlı Gelinler —
    "menu.help.brides.title": "Blood Brides",
    "menu.help.brides.classic": "Blood Bride",
    "menu.help.brides.classic.body": "The classic hunter. She runs the moment she sees you and never gives up — and she gets smarter every chapter.",
    "menu.help.brides.queen": "Queen Bride",
    "menu.help.brides.queen.body": "A giant boss, every few chapters. Crowned, wrapped in a crimson aura, and deadly.",
    "menu.help.brides.others": "Some kinds speed up in the dark, split in two, call for others or walk straight through walls — you'll meet them as you play.",

    // — Konu: Can & Ölüm —
    "menu.help.life.title": "Lives & Death",
    "menu.help.life.lives": "3 lives",
    "menu.help.life.lives.body": "A bride's touch drains your health bar. When the bar empties, you lose a life.",
    "menu.help.life.respawn": "Respawn",
    "menu.help.life.respawn.body": "When you die you respawn at the start of the chapter, briefly untouchable.",
    "menu.help.life.heart": "Heartbeat",
    "menu.help.life.heart.body": "Your heart races in the dark — that means a bride is close.",

    // — Konu: Mermi & Ateş —
    "menu.help.ammo.title": "Ammo & Shooting",
    "menu.help.ammo.limited": "Limited ammo",
    "menu.help.ammo.limited.body": "Pick up the glowing rounds on the ground; don't waste them.",
    "menu.help.ammo.noise": "Noise draws them",
    "menu.help.ammo.noise.body": "The sound of a shot pulls the brides straight to you.",
    "menu.help.ammo.respawn": "It comes back",
    "menu.help.ammo.respawn.body": "Ammo you pick up reappears in the same spot after 10 s.",

    // — Konu: Dükkân & Altın —
    "menu.help.gold.title": "Shop & Gold",
    "menu.help.gold.earn": "Earn gold",
    "menu.help.gold.earn.body": "You earn gold for every bride you kill and every chapter you clear.",
    "menu.help.gold.shop": "Shop",
    "menu.help.gold.shop.body": "Buy permanent upgrades (endless ammo, soldier ally) and cosmetics (lantern / sword / appearance colors).",
    "menu.help.gold.forever": "Works everywhere",
    "menu.help.gold.forever.body": "Everything you buy carries over to every mode and every chapter.",

    // — Konu: Duvak & Fırsatlar —
    "menu.help.veil.title": "Veil & Opportunities",
    "menu.help.veil.veil": "Veil",
    "menu.help.veil.veil.body": "Find one on the ground and put it on; trigger it to go invisible for a few seconds (firing or attacking breaks it).",
    "menu.help.veil.chances": "Optional 'Opportunity' objectives turn up in some chapters; they never hold up the exit.",
    "menu.help.veil.ring": "Ring",
    "menu.help.veil.ring.body": "Gives you extra gold — but it drives one bride mad and makes her faster.",
    "menu.help.veil.mirror": "Mirror",
    "menu.help.veil.mirror.body": "A vision: wait a few seconds and it reveals the way to the exit.",
    "menu.help.veil.bell": "Bell",
    "menu.help.veil.bell.body": "Pulls every bride toward the bell — gathering them all in one place.",
    "menu.help.veil.candles": "Candles / Blood trail",
    "menu.help.veil.candles.body": "Light the candles or follow the right blood trail → reward.",

    // — Konu: Ölüm Koşusu (Online) —
    "menu.help.race.title": "Death Run (Online)",
    "menu.help.race.body": "2-6 players race through the same maze; the first one out wins the chapter and banks points.",
    "menu.help.race.barrier": "Barrier",
    "menu.help.race.barrier.body": "You get 3 per chapter; a barrier you drop blocks a rival's path and falls to a single shot.",
    "menu.help.race.shop": "Shop",
    "menu.help.race.shop.body": "Between rounds, spend the gold you earned at the shop.",
    "menu.help.race.death": "Death",
    "menu.help.race.death.body": "When your health bar empties you wait 3 s and respawn safely at the start; the race goes on.",
  },
});
