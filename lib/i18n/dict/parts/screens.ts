import { definePart } from "./_part";

// app/page.tsx ekranlari: brifing, bolum-sonu, olum, gameover, win, modlar/gorevler/basarim/gunluk/sirlar ekran basliklari
// (Bu parca doldurulacak: tr = kaynak, en = ceviri. Anahtar bicimi: <alan>.<oge>)
export const screens = definePart({
  tr: {
    // --- ortak (birden fazla ekranda kullanilir) ---
    "scr.close": "Kapat",
    "scr.retry": "Tekrar Dene →",
    "scr.restart": "Baştan Başla",
    "scr.continue": "Devam Et",
    "scr.tomenu": "← Menüye Dön",
    "scr.tomodes": "← Modlar",
    "scr.locked": "Kilitli",
    "scr.completed": "Tamamlandı",
    "scr.chapter": "Bölüm {n}",
    "scr.record.label": "Rekor:",
    "scr.record.new": "· yeni rekor!",
    "scr.score.label": "Skor:",
    "scr.secs": "{n} sn",
    "scr.wallet": "Cüzdan",

    // --- zorluk (brifing secici + basarim rozetleri) ---
    "scr.diff.label": "Zorluk",
    "scr.diff.easy": "Kolay",
    "scr.diff.easy.desc": "Az ve yavaş gelin",
    "scr.diff.normal": "Orta",
    "scr.diff.normal.desc": "Dengeli",
    "scr.diff.hard": "Zor",
    "scr.diff.hard.desc": "Çok/hızlı gelin, dar görüş",

    // --- tek kisilik brifing ---
    "scr.intro.eyebrow": "Tek Kişilik · Yalnız Kaçış",
    "scr.intro.continue": "Devam Et · Bölüm {n}",
    "scr.intro.start": "Karanlığa Gir →",

    // --- olum ekrani ---
    "scr.dead.title": "SENİ BULDULAR",
    "scr.dead.crushed": "ÇIKIŞ ÇÖKTÜ",
    "scr.dead.sub": "Soğuk eller ensende… bir canın söndü. Bölüm {n} yeniden başlıyor.",
    "scr.dead.crushed.sub": "Süre doldu — tünel üstüne çöktü. Bir canın söndü. Bölüm {n} yeniden başlıyor.",
    "scr.dead.lives": "Kalan can:",

    // --- bolum sonu ---
    "scr.clear.title": "Bölüm Tamamlandı",
    "scr.clear.note1": "Rehber bitti. Bundan sonrası gerçek labirent.",
    "scr.clear.newach": "Yeni başarım:",
    "scr.clear.next": "Sonraki Bölüm →",
    "scr.clear.shop": "Dükkâna Uğra",
    "scr.clear.earned": "Kazanılan",
    "scr.clear.bonus": "Bonus",

    // --- oyun bitti ---
    "scr.gameover.title": "KARANLIK KAZANDI",
    "scr.gameover.sub": "Gelinlerin arasında kayboldun. Son bölüm:",

    // --- kazanma ---
    "scr.win.title": "Karanlığı Bitirdin",
    "scr.win.note": "Gelinler geride kaldı — şimdilik.",
    "scr.win.replay": "Yeniden Oyna",
    "scr.win.finalscore": "Final skoru",

    // --- basarimlar ---
    "scr.ach.eyebrow": "Karanlıkta Bıraktıkların",
    "scr.ach.title": "BAŞARIMLAR",
    "scr.ach.sub": "{n}/{total} açıldı",
    "scr.ach.unlocked": "Açıldı",
    "scr.ach.claim": "Ödülü Al (+{n})",
    "scr.ach.claimed": "Ödül alındı",

    // --- gunluk ---
    "scr.journal.eyebrow": "Kendi Elimden",
    "scr.journal.title": "GÜNLÜK",
    "scr.journal.sub": "Bölümlerde bulup topladığın sayfalar — {n}/{total}",
    "scr.journal.lost": "Kayıp Sayfa",
    "scr.journal.lost.desc": "Bu sayfa henüz karanlıkta. Bölümlerde ararken bulabilirsin.",

    // --- sirlar ---
    "scr.secrets.eyebrow": "O Gecenin Kalıntıları",
    "scr.secrets.title": "SIRLAR",
    "scr.secrets.sub": "Görevleri tamamladıkça açılır —",
    "scr.secrets.n": "Sır {n}",

    // --- modlar ---
    "scr.modes.eyebrow": "Hayatta Kalma",
    "scr.modes.title": "MODLAR",
    "scr.modes.endless": "Bitmeyen Gece",
    "scr.modes.endless.desc": "Çıkış yok; gelinler döner ve çoğalır. Dayandığın her saniye skorun.",
    "scr.modes.blind": "Kör Gece",
    "scr.modes.blind.desc": "Fenersiz, kapkaranlıkta hayatta kalma. Sesle ve refleksle dayan.",
    "scr.modes.arena": "Arena",
    "scr.modes.arena.desc": "Açık alanda dalga hayatta kalma. Her 6 öldürmede dalga yükselir; bol altın.",
    "scr.modes.horde": "Sürü Gecesi",
    "scr.modes.horde.desc": "Açık alanda yoğun, hızlı büyüyen sürü. Arena'nın çok daha zoru.",
    "scr.modes.best.sec": "Rekor {n} sn",
    "scr.modes.best.wave": "Rekor {n} dalga",

    // --- bitmeyen gece / kor gece sonucu ---
    "scr.endless.newrecord": "YENİ REKOR",
    "scr.endless.lost": "GECE SENİ YENDİ",
    "scr.endless.survived": "dayandın",
    "scr.endless.gap": "· {n} sn kaldı",
    "scr.endless.again": "Daha Uzun Dayan →",

    // --- arena / suru gecesi sonucu ---
    "scr.arena.fell": "{title} DÜŞTÜ",
    "scr.arena.wave": "{n}. dalgaya",
    "scr.arena.reached": "ulaştın",
    "scr.arena.waves": "{n} dalga",

    // --- gorev listesi + brifing modali ---
    "scr.missions.eyebrow": "Tek Kişilik",
    "scr.missions.title": "KARANLIK GÖREVLER",
    "scr.missions.sub": "{n}/{total} tamamlandı · her görev bir sır açar",
    "scr.missions.locked.desc": "Önceki 3 görevi tamamla",
    "scr.missions.best": "En iyi {n}s",
    "scr.missions.start": "Göreve Başla",

    // --- gorev sonucu ---
    "scr.mres.ok": "GÖREV TAMAM",
    "scr.mres.fail": "BAŞARISIZ",
    "scr.mres.time": "Süre:",
    "scr.mres.best": "En iyi:",
    "scr.mres.failsub": "Karanlık seni yuttu. Tekrar dene.",
    "scr.mres.next": "Sonraki Görev →",
    "scr.mres.list": "Görev Listesi",

    // --- davet / arkadaslik bildirimleri (her ekranda gorunur) ---
    "scr.invite.text": "seni odaya davet etti",
    "scr.invite.join": "Katıl",
    "scr.friendreq.text": "seni arkadaş olarak eklemek istiyor",
    "scr.friendreq.accept": "Kabul",
    "scr.friendreq.decline": "Reddet",
    "scr.friend.accepted": "{name} arkadaşlık isteğini kabul etti 🤝",
    "scr.friend.added": "{name} arkadaşın oldu",

    // --- dukkan basligi (page.tsx'ten Shop'a gecilir) ---
    "scr.shop.title": "DÜKKÂN",
    "scr.shop.between": "BÖLÜM ARASI DÜKKÂN",
  },
  en: {
    // --- shared ---
    "scr.close": "Close",
    "scr.retry": "Try Again →",
    "scr.restart": "Start Over",
    "scr.continue": "Continue",
    "scr.tomenu": "← Back to Menu",
    "scr.tomodes": "← Modes",
    "scr.locked": "Locked",
    "scr.completed": "Completed",
    "scr.chapter": "Chapter {n}",
    "scr.record.label": "Record:",
    "scr.record.new": "· new record!",
    "scr.score.label": "Score:",
    "scr.secs": "{n}s",
    "scr.wallet": "Wallet",

    // --- difficulty ---
    "scr.diff.label": "Difficulty",
    "scr.diff.easy": "Easy",
    "scr.diff.easy.desc": "Fewer and slower brides",
    "scr.diff.normal": "Normal",
    "scr.diff.normal.desc": "Balanced",
    "scr.diff.hard": "Hard",
    "scr.diff.hard.desc": "More and faster brides, narrow sight",

    // --- single player briefing ---
    "scr.intro.eyebrow": "Single Player · Solo Escape",
    "scr.intro.continue": "Continue · Chapter {n}",
    "scr.intro.start": "Step Into the Dark →",

    // --- death screen ---
    "scr.dead.title": "THEY FOUND YOU",
    "scr.dead.crushed": "THE EXIT COLLAPSED",
    "scr.dead.sub": "Cold hands on your neck… one life is gone. Chapter {n} starts over.",
    "scr.dead.crushed.sub": "Time ran out — the tunnel caved in on you. One life is gone. Chapter {n} starts over.",
    "scr.dead.lives": "Lives left:",

    // --- chapter clear ---
    "scr.clear.title": "Chapter Complete",
    "scr.clear.note1": "The guided part is over. From here on it's the real maze.",
    "scr.clear.newach": "New achievement:",
    "scr.clear.next": "Next Chapter →",
    "scr.clear.shop": "Visit the Shop",
    "scr.clear.earned": "Earned",
    "scr.clear.bonus": "Bonus",

    // --- game over ---
    "scr.gameover.title": "THE DARK WON",
    "scr.gameover.sub": "You were lost among the brides. Last chapter:",

    // --- win ---
    "scr.win.title": "You Ended the Dark",
    "scr.win.note": "The brides are behind you — for now.",
    "scr.win.replay": "Play Again",
    "scr.win.finalscore": "Final score",

    // --- achievements ---
    "scr.ach.eyebrow": "What You Left in the Dark",
    "scr.ach.title": "ACHIEVEMENTS",
    "scr.ach.sub": "{n}/{total} unlocked",
    "scr.ach.unlocked": "Unlocked",
    "scr.ach.claim": "Claim Reward (+{n})",
    "scr.ach.claimed": "Reward claimed",

    // --- journal ---
    "scr.journal.eyebrow": "In My Own Hand",
    "scr.journal.title": "JOURNAL",
    "scr.journal.sub": "Pages you found and collected across the chapters — {n}/{total}",
    "scr.journal.lost": "Lost Page",
    "scr.journal.lost.desc": "This page is still in the dark. You can find it while searching the chapters.",

    // --- secrets ---
    "scr.secrets.eyebrow": "Remnants of That Night",
    "scr.secrets.title": "SECRETS",
    "scr.secrets.sub": "Unlocks as you complete missions —",
    "scr.secrets.n": "Secret {n}",

    // --- modes ---
    "scr.modes.eyebrow": "Survival",
    "scr.modes.title": "MODES",
    "scr.modes.endless": "Endless Night",
    "scr.modes.endless.desc": "No exit; the brides keep returning and multiplying. Every second you last is your score.",
    "scr.modes.blind": "Blind Night",
    "scr.modes.blind.desc": "Survival in pitch darkness, without a lantern. Hold on by sound and reflex.",
    "scr.modes.arena": "Arena",
    "scr.modes.arena.desc": "Wave survival in the open. Every 6 kills raises the wave; plenty of gold.",
    "scr.modes.horde": "Swarm Night",
    "scr.modes.horde.desc": "A dense, fast-growing swarm in the open. Far harsher than the Arena.",
    "scr.modes.best.sec": "Record {n}s",
    "scr.modes.best.wave": "Record {n} waves",

    // --- endless / blind night result ---
    "scr.endless.newrecord": "NEW RECORD",
    "scr.endless.lost": "THE NIGHT BEAT YOU",
    "scr.endless.survived": "survived",
    "scr.endless.gap": "· {n}s short",
    "scr.endless.again": "Last Longer →",

    // --- arena / swarm night result ---
    "scr.arena.fell": "{title} — YOU FELL",
    "scr.arena.wave": "Wave {n}",
    "scr.arena.reached": "reached",
    "scr.arena.waves": "{n} waves",

    // --- mission list + briefing modal ---
    "scr.missions.eyebrow": "Single Player",
    "scr.missions.title": "DARK MISSIONS",
    "scr.missions.sub": "{n}/{total} completed · every mission unlocks a secret",
    "scr.missions.locked.desc": "Complete the previous 3 missions",
    "scr.missions.best": "Best {n}s",
    "scr.missions.start": "Begin Mission",

    // --- mission result ---
    "scr.mres.ok": "MISSION COMPLETE",
    "scr.mres.fail": "FAILED",
    "scr.mres.time": "Time:",
    "scr.mres.best": "Best:",
    "scr.mres.failsub": "The dark swallowed you. Try again.",
    "scr.mres.next": "Next Mission →",
    "scr.mres.list": "Mission List",

    // --- invite / friend notifications ---
    "scr.invite.text": "invited you to a room",
    "scr.invite.join": "Join",
    "scr.friendreq.text": "wants to add you as a friend",
    "scr.friendreq.accept": "Accept",
    "scr.friendreq.decline": "Decline",
    "scr.friend.accepted": "{name} accepted your friend request 🤝",
    "scr.friend.added": "{name} is now your friend",

    // --- shop title (passed from page.tsx to Shop) ---
    "scr.shop.title": "SHOP",
    "scr.shop.between": "BETWEEN-CHAPTER SHOP",
  },
});
