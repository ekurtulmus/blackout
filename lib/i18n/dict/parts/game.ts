import { definePart } from "./_part";

// Oyun ici (Game.tsx): HUD, duraklat, hazirlik, rehber (1. bolum) ipuclari, mini-gorevler, motor olaylari
// (Bu parca doldurulacak: tr = kaynak, en = ceviri. Anahtar bicimi: <alan>.<oge>)
export const game = definePart({
  tr: {
    // --- HUD çipleri ---
    "game.hud.chapter": "Bölüm",
    "game.hud.survived": "Dayandığın süre",
    "game.hud.left": "Kalan",
    "game.hud.time": "Süre",
    "game.hud.mission": "Görev",
    "game.hud.omen": "Kehanet",
    "game.hud.collapsing": "Çöküyor",
    "game.hud.invisible": "Görünmez",
    "game.hud.sidequest": "Fırsat görevi",
    "game.hud.exitdir": "Çıkış: {d}",
    "game.hud.exitarrow": "Çıkış → {d}",
    "game.hud.exit.open": "Çıkış açık",
    "game.hud.exit.locked": "Çıkış kilitli",
    "game.hud.exit.why": "Çıkış kilitli — neden?",
    "game.hud.menu": "Menü",
    "game.hud.help": "Hedef / kontroller / uyarı",
    "game.hud.soundon": "Sesi aç",
    "game.hud.soundoff": "Sesi kapat",
    "game.hud.pause": "Duraklat",
    "game.hud.resume": "Devam et",

    // --- Yönler (ayna kehaneti) ---
    "game.dir.right": "Sağ",
    "game.dir.down": "Aşağı",
    "game.dir.up": "Yukarı",
    "game.dir.left": "Sol",

    // --- Bölüm uyarıları (hazırlık ekranı) ---
    "game.notice.escape":
      "ÇIKIŞ ÇÖKÜYOR! Çıkış baştan açık — geri sayım bitmeden gizli kapıya ulaş, yoksa altında kalırsın.",
    "game.notice.soldier":
      "Karanlıkta zincirli asker(ler) var. Yanına git, zincirini çöz — arkanda gelir ve gelinlere ateş eder. Ölürse başka yerde doğar.",
    "game.notice.markedkill":
      "⊚ Çıkış KİLİTLİ: işaretli çemberin içinde bir gelin öldürünce açılır.",

    // --- Hazırlık / yardım ekranı ---
    "game.prep.eyebrow": "Hazırlık",
    "game.prep.chapter": "BÖLÜM {n}",
    "game.prep.desc": "Gelinleri yok et, gizli çıkışı bul. Karanlıkta hızlı ol.",
    "game.prep.controls": "Kontroller",
    "game.ctrl.move": "WASD/ok hareket",
    "game.ctrl.fire": "Boşluk ya da sol tık ateş",
    "game.ctrl.swap": "/sağ tık silah değiştir",
    "game.ctrl.run": "koş",
    "game.ctrl.inv": "envanter (Duvak)",
    "game.btn.continue": "Devam →",
    "game.btn.start": "Başla →",

    // --- Görev brifingi ---
    "game.brief.mode": "MOD",
    "game.brief.mission": "GÖREV {n}",
    "game.brief.objective": "Hedef",

    // --- Duraklat ---
    "game.pause.title": "Duraklatıldı",
    "game.pause.resume": "Devam Et",

    // --- Envanter / eşya slotu ---
    "game.inv.title": "ENVANTER",
    "game.inv.hint": "Kuşan → sonra ateşin yanındaki kutucukla kullan.",
    "game.inv.equipped": "kuşanıldı",
    "game.inv.empty": "Boş — dükkândan alabilirsin.",
    "game.inv.close": "Kapat",
    "game.inv.open": "Envanter",
    "game.item.veil": "Duvak",
    "game.item.veil.desc": "birkaç sn görünmez ol",
    "game.slot.use": "Kuşanılan eşyayı kullan",
    "game.slot.open": "Envanteri aç",

    // --- Dokunmatik butonlar ---
    "game.btn.sword": "KILIÇ",
    "game.btn.fire": "ATEŞ",
    "game.btn.run": "KOŞ",
    "game.btn.togun": "Silaha geç (F / sağ tık)",
    "game.btn.tosword": "Kılıca geç (F / sağ tık)",
    "game.btn.swap": "Silah değiştir",

    // --- Bildirimler / ödüller ---
    "game.reward.gold": "+{n} para",
    "game.reward.ammo": "+{n} mermi",
    "game.reward.health": "+{n} can",
    "game.reward.score": "+{n} puan",
    "game.toast.journal": "Günlük sayfası bulundu — menüden okuyabilirsin",

    // --- Tuvalde çizilen ---
    "game.soldier.you": "SEN",

    // --- Çıkış kilidi ---
    "game.exit.circle": "Çıkış kilitli: işaretli ÇEMBERİN içinde bir gelin öldürmelisin.",
    "game.exit.pieces": "Çıkış kilitli: {n} parça topla.",
    "game.exit.kills": "Çıkış kilitli: önce {n} gelini yok et.",
    "game.exit.warn": "Çıkış kilitli — önce en az 1 gelini yok et!",

    // --- Görev hedefi (HUD) ---
    "game.obj.wave": "Dalga {n} · {k}/6",
    "game.obj.time": "Süre {n}s",
    "game.obj.survive": "Dayan {n}s",
    "game.obj.escort.take": "Askeri çıkışa götür",
    "game.obj.escort.find": "Askeri bul ve kurtar",
    "game.obj.goexit": "Çıkışa git",
    "game.obj.brides": "Gelin {a}/{b}",
    "game.obj.pieces": "Parça {a}/{b}",
    "game.obj.reachexit": "Çıkışa ulaş",
    "game.obj.secs": "{n}s",

    // --- Mini-görevler ---
    "game.mq.candles.title": "Üç Mumu Yak",
    "game.mq.candles.hud": "Mumlar",
    "game.mq.candles.prog": "Mumlar {a}/{b}",
    "game.mq.ring.title": "Yüzüğü Bul",
    "game.mq.ring.hud": "Yüzüğü bul",
    "game.mq.markedkill.title": "İşaretli İnfaz",
    "game.mq.markedkill.hud": "Çemberde gelin öldür",
    "game.mq.bell.title": "Çanı Çal",
    "game.mq.bell.hud": "Çanı çal (gelinleri oyala)",
    "game.mq.bloodtrail.title": "Kanı Takip Et",
    "game.mq.bloodtrail.hud": "Kanı takip et",
    "game.mq.darkhall.title": "Fenersiz Koridor",
    "game.mq.darkhall.hud": "Koridorun sonuna ulaş",
    "game.mq.mirror.title": "Ayna Kehaneti",
    "game.mq.mirror.hud": "Aynanın yanında bekle",
    "game.mq.mirror.wait": "Bekle... {n}s",

    // --- REHBER (1. bölüm) — kısa, net, oyun oynanırken okunur ---
    "game.tut.start": "Karanlıktasın. Fenerin baktığın yeri aydınlatır — ilerle.",
    "game.tut.sword": "Yerde bir KILIÇ! Aldın, artık elinde. Yaklaşan geline saldır.",
    "game.tut.bride1": "Bir gelin! Üstüne git ve SALDIR — sana dokunursa CANIN gider.",
    "game.tut.gun": "TABANCA + mermi! Aldın, artık elinde. Uzaktan ATEŞ edebilirsin.",
    "game.tut.bride2": "Bu gelini uzaktan vur — ATEŞ et! (Sol tık / ATEŞ)",
    "game.tut.sprint": "Sıkışınca KOŞARAK kaç (nefesin tükenir, sonra dolar).",
    "game.tut.bride3": "Bir gelin daha — dilediğin silahla indir.",
    "game.tut.veil": "DUVAK aldın — birkaç saniye GÖRÜNMEZ oldun.",
    "game.tut.brideveil": "Görünmezken gelin seni fark etmez… ama duvak bitince saldırır!",
    "game.tut.shop": "Gelini indirince ALTIN kazandın! Bölüm sonunda dükkâna uğrayabilirsin.",
    "game.tut.openexit": "Bundan sonrası gerçek LABİRENT. Çıkışa ulaş ve maceraya başla!",
  },
  en: {
    // --- HUD chips ---
    "game.hud.chapter": "Chapter",
    "game.hud.survived": "Time survived",
    "game.hud.left": "Left",
    "game.hud.time": "Time",
    "game.hud.mission": "Mission",
    "game.hud.omen": "Omen",
    "game.hud.collapsing": "Collapsing",
    "game.hud.invisible": "Invisible",
    "game.hud.sidequest": "Side mission",
    "game.hud.exitdir": "Exit: {d}",
    "game.hud.exitarrow": "Exit → {d}",
    "game.hud.exit.open": "Exit open",
    "game.hud.exit.locked": "Exit locked",
    "game.hud.exit.why": "Exit locked — why?",
    "game.hud.menu": "Menu",
    "game.hud.help": "Objective / controls / warning",
    "game.hud.soundon": "Unmute",
    "game.hud.soundoff": "Mute",
    "game.hud.pause": "Pause",
    "game.hud.resume": "Resume",

    // --- Directions (mirror omen) ---
    "game.dir.right": "Right",
    "game.dir.down": "Down",
    "game.dir.up": "Up",
    "game.dir.left": "Left",

    // --- Chapter warnings (prep screen) ---
    "game.notice.escape":
      "THE EXIT IS COLLAPSING! It is open from the start — reach the hidden door before the countdown ends, or it comes down on you.",
    "game.notice.soldier":
      "Chained Soldiers are out there in the dark. Reach one and cut the chain — he follows you and shoots the Brides. If he dies, another wakes up elsewhere.",
    "game.notice.markedkill":
      "⊚ The Exit is LOCKED: it opens when you kill a Bride inside the marked circle.",

    // --- Prep / help screen ---
    "game.prep.eyebrow": "Get ready",
    "game.prep.chapter": "CHAPTER {n}",
    "game.prep.desc": "Destroy the Brides, find the hidden Exit. Be quick in the dark.",
    "game.prep.controls": "Controls",
    "game.ctrl.move": "WASD/arrows move",
    "game.ctrl.fire": "Space or left click fires",
    "game.ctrl.swap": "/right click swaps weapon",
    "game.ctrl.run": "run",
    "game.ctrl.inv": "inventory (Veil)",
    "game.btn.continue": "Continue →",
    "game.btn.start": "Start →",

    // --- Mission briefing ---
    "game.brief.mode": "MODE",
    "game.brief.mission": "MISSION {n}",
    "game.brief.objective": "Objective",

    // --- Pause ---
    "game.pause.title": "Paused",
    "game.pause.resume": "Resume",

    // --- Inventory / item slot ---
    "game.inv.title": "INVENTORY",
    "game.inv.hint": "Equip it → then use it from the slot next to FIRE.",
    "game.inv.equipped": "equipped",
    "game.inv.empty": "Empty — you can buy some at the Shop.",
    "game.inv.close": "Close",
    "game.inv.open": "Inventory",
    "game.item.veil": "Veil",
    "game.item.veil.desc": "go invisible for a few seconds",
    "game.slot.use": "Use equipped item",
    "game.slot.open": "Open inventory",

    // --- Touch buttons ---
    "game.btn.sword": "SWORD",
    "game.btn.fire": "FIRE",
    "game.btn.run": "RUN",
    "game.btn.togun": "Switch to gun (F / right click)",
    "game.btn.tosword": "Switch to Sword (F / right click)",
    "game.btn.swap": "Swap weapon",

    // --- Toasts / rewards ---
    "game.reward.gold": "+{n} Gold",
    "game.reward.ammo": "+{n} Ammo",
    "game.reward.health": "+{n} Health",
    "game.reward.score": "+{n} points",
    "game.toast.journal": "Journal page found — you can read it from the menu",

    // --- Drawn on canvas ---
    "game.soldier.you": "YOU",

    // --- Exit lock ---
    "game.exit.circle": "Exit locked: you must kill a Bride inside the marked CIRCLE.",
    "game.exit.pieces": "Exit locked — pieces to collect: {n}.",
    "game.exit.kills": "Exit locked — Brides to kill: {n}.",
    "game.exit.warn": "Exit locked — kill at least one Bride first!",

    // --- Mission objective (HUD) ---
    "game.obj.wave": "Wave {n} · {k}/6",
    "game.obj.time": "Time {n}s",
    "game.obj.survive": "Survive {n}s",
    "game.obj.escort.take": "Take the Soldier to the Exit",
    "game.obj.escort.find": "Find and free the Soldier",
    "game.obj.goexit": "Head for the Exit",
    "game.obj.brides": "Brides {a}/{b}",
    "game.obj.pieces": "Pieces {a}/{b}",
    "game.obj.reachexit": "Reach the Exit",
    "game.obj.secs": "{n}s",

    // --- Mini missions ---
    "game.mq.candles.title": "Light Three Candles",
    "game.mq.candles.hud": "Candles",
    "game.mq.candles.prog": "Candles {a}/{b}",
    "game.mq.ring.title": "Find the Ring",
    "game.mq.ring.hud": "Find the ring",
    "game.mq.markedkill.title": "Marked Execution",
    "game.mq.markedkill.hud": "Kill a Bride in the circle",
    "game.mq.bell.title": "Ring the Bell",
    "game.mq.bell.hud": "Ring the bell (lure the Brides)",
    "game.mq.bloodtrail.title": "Follow the Blood",
    "game.mq.bloodtrail.hud": "Follow the blood",
    "game.mq.darkhall.title": "The Lightless Hall",
    "game.mq.darkhall.hud": "Reach the end of the hall",
    "game.mq.mirror.title": "Mirror Omen",
    "game.mq.mirror.hud": "Wait by the mirror",
    "game.mq.mirror.wait": "Wait... {n}s",

    // --- TUTORIAL (Chapter 1) — short, clear, read while playing ---
    "game.tut.start": "You're in the dark. Your Lantern lights where you look — move.",
    "game.tut.sword": "A SWORD on the ground! You took it — it's in your hand. Strike the Bride coming at you.",
    "game.tut.bride1": "A Bride! Close in and STRIKE — if she touches you, you lose HEALTH.",
    "game.tut.gun": "A GUN + Ammo! You took it — it's in your hand. Now you can FIRE from a distance.",
    "game.tut.bride2": "Shoot this one from afar — FIRE! (Left click / FIRE)",
    "game.tut.sprint": "Cornered? RUN for it (your Breath drains, then refills).",
    "game.tut.bride3": "One more Bride — take her down with either weapon.",
    "game.tut.veil": "You took the VEIL — you're INVISIBLE for a few seconds.",
    "game.tut.brideveil": "Invisible, the Bride can't see you… but she attacks the moment the Veil fades!",
    "game.tut.shop": "Downing a Bride earned you GOLD! You can visit the Shop after the Chapter.",
    "game.tut.openexit": "From here on it's a real MAZE. Reach the Exit and the hunt begins!",
  },
});
