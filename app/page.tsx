"use client";

import { useEffect, useRef, useState } from "react";
import Game, { type EndResult } from "@/components/Game";
import OnlineLobby from "@/components/OnlineLobby";
import OnlineGame from "@/components/OnlineGame";
import Settings from "@/components/Settings";
import Shop from "@/components/Shop";
import MainMenu from "@/components/MainMenu";
import Splash from "@/components/Splash";
import Friends from "@/components/Friends";
import Online from "@/components/Online";
import { FriendPresence, getFriends, addIncomingRequest, removeIncomingRequest } from "@/lib/friends";
import { getInventory } from "@/lib/inventory";
import { getCoins, initStarterCoins } from "@/lib/coins";
import { ACHIEVEMENTS, getUnlocked, unlock, achievementById, claimReward, getClaimed, bumpStat, setStatMax, evaluateAll, type AchCtx } from "@/lib/achievements";
import { JOURNAL, getCollected, collectNote, journalById } from "@/lib/journal";
import { TOTAL_LEVELS } from "@/lib/levels";
import { sound, type ScreenTrack } from "@/lib/audio";
import { randomThemeSeed } from "@/lib/themes";
import { INTRO_TITLE, INTRO_LINES, flavorForLevel } from "@/lib/story";
import { MISSIONS, ENDLESS, ARENA, KOR_GECE, HORDE, type Mission } from "@/lib/missions";
import {
  SECRETS,
  SECRET_COUNT,
  MISSION_SECRET,
  SECRET_ENDING,
  SECRET_ENDING_TITLE,
} from "@/lib/secrets";
import type { Diff } from "@/lib/engine";
import type { NetRoom } from "@/lib/net";
import type { StartInfo } from "@/lib/online";
import Icon, { type IconName } from "@/components/Icon";
import MenuShell from "@/components/MenuShell";

// OYUN ekranları: kabuk kullanmaz VE geri yığınına hedef olarak girmez
// (sonuç ekranından "geri" oyunu yeniden başlatmasın → döngü olmasın).
function isPlayScreen(s: string): boolean {
  return s === "playing" || s === "onlinegame" || s === "missionplay" || s === "endlessplay" || s === "arenaplay";
}

// Tek kişilik (Yalnız Kaçış) ilerleme kaydı — çıkıp tekrar girince kaldığı bölümden devam.
const SP_PROGRESS_KEY = "blackout_sp_progress";
function loadSpProgress(): { level: number; score: number; lives: number } | null {
  try {
    const s = localStorage.getItem(SP_PROGRESS_KEY);
    if (!s) return null;
    const o = JSON.parse(s);
    if (o && typeof o.level === "number" && o.level > 1) {
      return { level: o.level, score: o.score ?? 0, lives: o.lives ?? 1 };
    }
  } catch {
    /* geç */
  }
  return null;
}
function saveSpProgress(level: number, score: number, lives: number) {
  try {
    localStorage.setItem(SP_PROGRESS_KEY, JSON.stringify({ level, score, lives }));
  } catch {
    /* geç */
  }
}
function clearSpProgress() {
  try {
    localStorage.removeItem(SP_PROGRESS_KEY);
  } catch {
    /* geç */
  }
}

// Başarım rozetleri → ince ikon eşlemesi (emoji yerine)
const ACH_ICON: Record<string, IconName> = {
  first_kill: "drop", reach3: "target", first_coin: "coin", shopper: "cart",
  collector: "book", taste_dark: "skull", kills10: "swords",
  reach5: "map", reach8: "flame", flawless: "veil", queenslayer: "crown",
  savior: "handshake", escapist: "bomb", rich: "coin", kills50: "swords",
  kills100: "swords", deaths5: "skull", games10: "infinity", clears20: "map",
  coins500: "coin", coins1500: "coin", journal7: "book", secrets6: "photo",
  missions3: "target", missions6: "target", endless60: "infinity", endless180: "infinity",
  arena5: "swords", arena10: "swords", kor60: "moon", horde5: "swarm",
  use_veil: "veil", flawless3: "veil", queen3: "crown", escapes3: "bomb",
  buy_perm: "ammo",
  win: "trophy", win_hard: "crown", kills300: "swords", missions_all: "target",
  secrets_all: "photo", journal_all: "book", endless300: "infinity", arena20: "swords",
  queen5: "crown", rich5000: "coin",
};
// Zorluk kademesi → renk/etiket (başarım kartında rozet)
// Zorluk rozeti renkleri TEMAYA duyarlı: sabit parlak renkler (mint/sarı/pembe) açık
// zeminde okunmuyordu (1:1'e kadar düşüyordu). Değerler globals.css'te tanımlı.
const TIER_STYLE: Record<string, { label: string; color: string }> = {
  kolay: { label: "Kolay", color: "var(--tier-easy)" },
  orta: { label: "Orta", color: "var(--tier-mid)" },
  zor: { label: "Zor", color: "var(--tier-hard)" },
};

type Screen =
  | "menu"
  | "intro"
  | "ayarlar"
  | "missions"
  | "missionplay"
  | "missionresult"
  | "endlessplay"
  | "endlessresult"
  | "modes"
  | "multi"
  | "arenaplay"
  | "arenaresult"
  | "secrets"
  | "shop"
  | "achievements"
  | "journal"
  | "friends"
  | "online"
  | "playing"
  | "dead"
  | "levelclear"
  | "gameover"
  | "win"
  | "lobby"
  | "onlinegame";

// Kendi müziği olan menü ekranları. Burada OLMAYAN ekranlarda menü müziği kesintisiz sürer.
// (Oyun ekranları ve Ölüm Koşusu yukarıdaki efektte ayrıca ele alınır.)
const SCREEN_MUSIC: Partial<Record<Screen, ScreenTrack>> = {
  shop: "shop",
  achievements: "achievements",
  missions: "missions",
  modes: "modes",
  journal: "journal",
  secrets: "secrets",
};

// (arkadaş sistemi + davet bandı entegre edildi)
export default function Page() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [showSplash, setShowSplash] = useState(true); // açılış animasyonu (bir kez)
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  // Ekonomi (Faz A): bölüm sonu para bilgisi
  const [coinInfo, setCoinInfo] = useState({ gained: 0, bonus: 0, total: 0 });
  const [shopReturn, setShopReturn] = useState<Screen>("menu"); // dükkândan çıkınca dönülecek ekran
  const [newAch, setNewAch] = useState<string[]>([]); // sonuç ekranında gösterilecek yeni başarımlar
  const [deadCrushed, setDeadCrushed] = useState(false); // ölüm sebebi: çıkış çöktü (mesaj ayrımı)
  const [settingsReturn, setSettingsReturn] = useState<Screen>("menu"); // ayarlardan çıkınca dönülecek ekran
  const [openMission, setOpenMission] = useState<number | null>(null); // görev brifingi modalı (index)
  const [achList, setAchList] = useState<string[]>([]); // açılan başarımlar (menü)
  const [achClaimed, setAchClaimed] = useState<string[]>([]); // ödülü alınan başarımlar
  const [journalGot, setJournalGot] = useState<number[]>([]); // toplanan günlük sayfaları
  const [menuCoins, setMenuCoins] = useState(0); // ana menüde gösterilen cüzdan
  const [runId, setRunId] = useState(0);
  const [themeSeed, setThemeSeed] = useState(0); // her yeni oyunda rastgele
  const roomRef = useRef<NetRoom | null>(null);
  const [startInfo, setStartInfo] = useState<StartInfo | null>(null);
  // Arkadaş sistemi (global presence + davet)
  const presenceRef = useRef<FriendPresence | null>(null);
  const [friendsOnline, setFriendsOnline] = useState(0);
  const [invite, setInvite] = useState<{ fromName: string; room: string } | null>(null);
  const [pendingJoin, setPendingJoin] = useState<string | null>(null); // davet kabul → lobiye taşınan oda kodu
  const [lobbyPublic, setLobbyPublic] = useState(false); // oda "Online Odalar"da listelensin mi
  const [lobbyAutoHost, setLobbyAutoHost] = useState(false); // lobiye girer girmez oda kur (Online → Oda Kur)
  const [lobbyReturn, setLobbyReturn] = useState<Screen>("menu"); // lobiden "Geri" nereye döner
  const [friendReq, setFriendReq] = useState<{ fromCode: string; fromName: string } | null>(null);
  // İstek popup'ı ekranı kapatmasın: 5 sn sonra kendiliğinden kapanır. İstek silinmez —
  // Arkadaşlar ekranında beklemeye devam eder (kalıcı kayıt: friends.addIncomingRequest).
  useEffect(() => {
    if (!friendReq) return;
    const t = window.setTimeout(() => setFriendReq(null), 5000);
    return () => window.clearTimeout(t);
  }, [friendReq]);
  const [friendToast, setFriendToast] = useState("");
  // Görev modu
  const [missionIndex, setMissionIndex] = useState<number | null>(null);
  const [missionRunId, setMissionRunId] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [missionBest, setMissionBest] = useState<Record<number, number>>({});
  const [missionResult, setMissionResult] = useState<
    { ok: boolean; title: string; time: number; best: number; hasNext: boolean } | null
  >(null);
  // Sonsuz mod
  // Hayatta kalma modları (Bitmeyen Gece / Kör Gece = endless; Arena / Sürü = arena)
  const [endlessRunId, setEndlessRunId] = useState(0);
  const [endlessMission, setEndlessMission] = useState<Mission>(ENDLESS);
  const [endlessResult, setEndlessResult] = useState<{ survived: number; best: number; title: string } | null>(null);
  const [arenaRunId, setArenaRunId] = useState(0);
  const [arenaMission, setArenaMission] = useState<Mission>(ARENA);
  const [arenaResult, setArenaResult] = useState<{ wave: number; best: number; title: string } | null>(null);
  // Mod başına en iyi skor (mission.id → değer)
  const [survBest, setSurvBest] = useState<Record<number, number>>({});
  const bestKey = (m: Mission) =>
    m.id === ENDLESS.id ? "blackout_endless_best" : m.id === ARENA.id ? "blackout_arena_best" : `blackout_best_${m.id}`;
  // Sırlar (görev modundan açılır) — açılan sır indeksleri
  const [unlockedSecrets, setUnlockedSecrets] = useState<number[]>([]);
  const [openSecret, setOpenSecret] = useState<number | null>(null); // popup için
  // Tek kişilik zorluk
  const [spDiff, setSpDiff] = useState<Diff>("orta");
  // Nasıl Oynanır: düğme kabuğun sağ üstünde (MenuShell), modal MainMenu'de → durum burada
  const [helpOpen, setHelpOpen] = useState(false);

  // TEMA: Aydınlık (beyaz) tema KALDIRILDI (kullanıcı isteği) — oyun hep KARANLIK.
  // data-theme her zaman "dark"; eski blackout_theme kaydı yok sayılır, toggle gösterilmez.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    try {
      localStorage.removeItem("blackout_theme");
    } catch {
      /* geç */
    }
  }, []);

  // Kayıtlı ilerlemeyi yükle (tamamlanan görevler + en iyi süreler + sırlar + zorluk)
  useEffect(() => {
    // TEK SEFERLİK İLERLEME SIFIRLAMA: bu sürümle herkes SIFIRDAN başlar. Kimlik (arkadaş
    // kodu/isim/arkadaşlar) ve ses tercihleri KORUNUR; altın/envanter/görev/başarım/skor/
    // günlük/sır/devam kaydı silinir. reset_v eşleşince bir daha çalışmaz.
    try {
      const RESET_V = "2026-07-19-fresh";
      if (localStorage.getItem("blackout_reset_v") !== RESET_V) {
        const keep = new Set([
          "blackout_uid", "blackout_name", "blackout_friends", "blackout_sent",
          "blackout_freq_in", "blackout_vol", "blackout_music", "blackout_muted", "blackout_reset_v",
        ]);
        const rm: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith("blackout_") && !keep.has(k)) rm.push(k);
        }
        for (const k of rm) localStorage.removeItem(k);
        localStorage.setItem("blackout_reset_v", RESET_V);
      }
    } catch {
      /* geç */
    }
    initStarterCoins(); // yeni oyuncuya 1000 altın (bir kez)
    try {
      const raw = localStorage.getItem("blackout_missions_cleared");
      if (raw) setCleared(JSON.parse(raw));
      const best = localStorage.getItem("blackout_mission_best");
      if (best) setMissionBest(JSON.parse(best));
      const bests: Record<number, number> = {};
      for (const m of [ENDLESS, KOR_GECE, ARENA, HORDE]) {
        const v = localStorage.getItem(bestKey(m));
        if (v) bests[m.id] = parseInt(v, 10) || 0;
      }
      setSurvBest(bests);
      const sec = localStorage.getItem("blackout_secrets");
      if (sec) setUnlockedSecrets(JSON.parse(sec));
      const sd = localStorage.getItem("blackout_sp_diff");
      if (sd === "kolay" || sd === "orta" || sd === "zor") setSpDiff(sd);
      setAchList(getUnlocked()); // Faz F
      setAchClaimed(getClaimed());
      setJournalGot(getCollected());
      setMenuCoins(getCoins());
    } catch {
      /* geç */
    }
  }, []);

  // --- GERİ (kabuk butonu + telefon geri tuşu): bir önceki ekrana dön ---
  const backStack = useRef<Screen[]>([]);
  const lastScreen = useRef<Screen>("menu");
  const poppingRef = useRef(false);
  // Ekran değiştikçe geri yığınını güncelle (pop kaynaklı değişim yığına eklenmez).
  // ÖNEMLİ: OYUN ekranları geri hedefi OLAMAZ — yoksa sonuç ekranından "geri" oyunu
  // yeniden başlatır ve döngüye girer (modlar → arena → sonuç → geri → arena → …).
  useEffect(() => {
    if (poppingRef.current) {
      poppingRef.current = false;
    } else if (lastScreen.current !== screen && !isPlayScreen(lastScreen.current)) {
      // aynı ekranı üst üste iki kez yığına koyma
      if (backStack.current[backStack.current.length - 1] !== lastScreen.current) {
        backStack.current.push(lastScreen.current);
      }
      if (backStack.current.length > 40) backStack.current.shift();
    }
    lastScreen.current = screen;
  }, [screen]);
  // Geri tuşu → önceki ekran; yığın boşsa uygulamada kal (çıkma). Her pop'ta tampon bırak.
  useEffect(() => {
    window.history.pushState({ blackout: true }, "");
    const onPop = () => {
      window.history.pushState({ blackout: true }, ""); // her zaman bir tampon → geri = çıkış olmasın
      const prev = backStack.current.pop();
      if (prev !== undefined) {
        poppingRef.current = true;
        setScreen(prev);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Menüye her dönüşte istatistikleri tazele (dükkân/başarım/günlük sonrası güncel görünsün)
  useEffect(() => {
    if (screen === "menu") {
      setMenuCoins(getCoins());
      // Anlık verilere bağlı başarımları (para/görev/sır/günlük/skor) burada da değerlendir
      evaluateAll(buildAchCtx());
      setAchList(getUnlocked());
      setAchClaimed(getClaimed());
      setJournalGot(getCollected());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  function unlockSecret(missionId: number) {
    const idx = MISSION_SECRET[missionId];
    if (idx === undefined) return;
    setUnlockedSecrets((prev) => {
      if (prev.includes(idx)) return prev;
      const next = [...prev, idx];
      try {
        localStorage.setItem("blackout_secrets", JSON.stringify(next));
      } catch {
        /* geç */
      }
      return next;
    });
  }

  function chooseDiff(d: Diff) {
    setSpDiff(d);
    try {
      localStorage.setItem("blackout_sp_diff", d);
    } catch {
      /* geç */
    }
  }

  // Arkadaş presence'ı: uygulama açıkken sürekli çalışır (çevrimiçi arkadaş + davet yakalar)
  useEffect(() => {
    const p = new FriendPresence();
    presenceRef.current = p;
    const refresh = () => {
      const online = getFriends().filter((f) => p.isOnline(f.code)).length;
      setFriendsOnline(online);
    };
    p.onPresence = refresh;
    p.onInvite = (inv) => setInvite({ fromName: inv.fromName, room: inv.room });
    // Gelen istek: hem 5 sn'lik popup, hem KALICI kayıt (popup'ı kaçırırsan istek
    // Arkadaşlar ekranında bekler — eskiden yalnız bellekteydi, kayboluyordu).
    p.onFriendRequest = (req) => {
      addIncomingRequest(req.fromCode, req.fromName, Date.now());
      setFriendReq(req);
    };
    p.onRequestAccepted = (name) => {
      setFriendToast(`${name} arkadaşlık isteğini kabul etti 🤝`);
      setFriendsOnline(getFriends().filter((f) => p.isOnline(f.code)).length);
      window.setTimeout(() => setFriendToast(""), 3500);
    };
    p.start();
    const iv = window.setInterval(refresh, 3000);
    return () => {
      window.clearInterval(iv);
      p.stop();
      presenceRef.current = null;
    };
  }, []);

  function acceptInvite() {
    if (!invite) return;
    setPendingJoin(invite.room);
    setLobbyPublic(false);
    setLobbyAutoHost(false);
    setLobbyReturn("menu");
    setInvite(null);
    setScreen("lobby");
  }

  // Ses kilidi: ilk kullanıcı etkileşiminde (tarayıcı kuralı) sesi aç. BİR KEZ
  // açıldıktan sonra menü müziği ekranlar arası KESİNTİSİZ çalar (tekrar tıklama yok).
  const audioUnlocked = useRef(false);
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current) return;
      audioUnlocked.current = true;
      sound.resume();
      sound.revealMenuMusic();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // TÜM UI butonlarına ortak tıklama sesi ("şişe ağzı üflemesi", kısık). Tek yerden
  // dinlenir — her bileşene tek tek eklemeye gerek yok. Oyun-içi KONTROL butonları
  // (ateş/kılıç/koş/joystick/slot/bariyer) hariç: onların kendi oyun sesleri var ve
  // saniyede birkaç kez basıldıkları için UI sesi rahatsız ederdi.
  useEffect(() => {
    const SKIP = ".touch, .actionrow, .fire, .actbtn, .slotbtn, .invbtn, .barrierbtn, .joybase";
    const onDown = (e: PointerEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || typeof el.closest !== "function") return;
      const btn = el.closest("button, [role='button']") as HTMLElement | null;
      if (!btn || btn.hasAttribute("disabled")) return;
      if (btn.closest(SKIP)) return;
      sound.uiClick();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  // Menü/ekranlarda müzik çalsın; oyun ekranlarında dursun (oyun kendi sesini çalar).
  // Menü ekranları arası geçişte müziği DURDURMAYIZ — böylece kesintisiz akar.
  useEffect(() => {
    const inGame =
      screen === "playing" ||
      screen === "missionplay" ||
      screen === "endlessplay" ||
      screen === "arenaplay";
    if (inGame) {
      // Oyun (tek kişilik / görev / bitmeyen gece): menü + ekran müziklerini durdur,
      // oyun kendi müziğini (game.mp3) çalar; oyun-içi ıslığı başlat.
      sound.stopMenuMusic();
      sound.stopScreenMusic();
      sound.startWhistles();
      return;
    }
    // Ölüm Koşusu (online): kendi parçası (envanter.mp3) çalar + ıslık
    if (screen === "onlinegame") {
      sound.stopMenuMusic();
      sound.playScreenMusic("race");
      sound.startWhistles();
      return;
    }
    sound.stopWhistles();
    sound.stopGameMusic(); // oyun-dışı ekranlarda oyun müziği (game.mp3) SÜRMESİN (menüde çalmaya devam ediyordu)
    // Kendi müziği olan ekranlar (SCREEN_MUSIC): menü müziği kısılır, ekranın parçası açılır.
    const track = SCREEN_MUSIC[screen];
    if (track) {
      sound.stopMenuMusic();
      sound.playScreenMusic(track);
      return;
    }
    // Kendi müziği olmayan ekranlar: menü müziği DEVAM eder
    sound.stopScreenMusic();
    if (audioUnlocked.current) {
      sound.resume();
      sound.revealMenuMusic();
    } else {
      sound.primeMenuMusic();
    }
  }, [screen]);

  function play(lv: number, sc: number, lv3: number) {
    const capped = Math.min(4, lv3); // can hakkı EN FAZLA 4 (3 baz + 1 kalıcı); eski kayıtlar da kısılır
    saveSpProgress(lv, sc, capped); // kaldığı bölümden devam edebilsin
    setLevel(lv);
    setScore(sc);
    setLives(capped);
    setRunId((r) => r + 1);
    setScreen("playing");
  }

  function startNewGame() {
    setThemeSeed(randomThemeSeed()); // baştan başlayınca farklı temadan başla
    setScreen("intro"); // önce kısa hikaye girişi
  }

  function handleEnd(r: EndResult) {
    setDeadCrushed(!!r.crushed);
    // Oyun tamamen bitti (öldün ve can kalmadı / tüm bölümler bitti) → devam kaydını sıfırla
    if (r.status === "gameover" || r.status === "win") clearSpProgress();
    setScore(r.score);
    setLives(r.lives);
    setLevel(r.level);
    setCoinInfo({
      gained: r.coinsGained ?? 0,
      bonus: r.levelClearBonus ?? 0,
      total: r.coins ?? 0,
    });
    // Başarım istatistiklerini güncelle (kümülatif) + değerlendir
    if (r.kills) bumpStat("kills", r.kills);
    setStatMax("maxLevel", r.level);
    if (r.status === "dead" || r.status === "gameover") { bumpStat("deaths"); bumpStat("games"); }
    if (r.status === "win") { bumpStat("wins"); bumpStat("games"); }
    if (r.status === "levelclear" || r.status === "win") {
      if (r.status === "levelclear") bumpStat("clears");
      if (r.flawless) bumpStat("flawless");
      if (r.killedQueen) bumpStat("queen");
      if (r.hostageRescued) bumpStat("hostages");
      if (r.wasEscape) bumpStat("escapes");
    }
    const wonHard = r.status === "win" && spDiff === "zor";
    const newly = refreshAch({ wonHard, coins: r.coins ?? getCoins() });
    setNewAch(newly);
    setScreen(r.status);
  }

  // Başarım değerlendirme bağlamını güncel state'ten kur (overrides ile taze değer geç)
  function buildAchCtx(overrides: Partial<AchCtx> = {}): AchCtx {
    const inv = getInventory();
    return {
      coins: getCoins(),
      journal: getCollected().length,
      secrets: unlockedSecrets.length,
      missions: cleared.length,
      endlessBest: survBest[ENDLESS.id] ?? 0,
      korBest: survBest[KOR_GECE.id] ?? 0,
      arenaBest: survBest[ARENA.id] ?? 0,
      hordeBest: survBest[HORDE.id] ?? 0,
      permAmmo: inv.permAmmo,
      extraLives: inv.extraLives,
      wonHard: false,
      ...overrides,
    };
  }
  // Koşulları değerlendir; yeni açılanların id listesini döndür + menü listesini tazele.
  function refreshAch(overrides: Partial<AchCtx> = {}): string[] {
    const newly = evaluateAll(buildAchCtx(overrides));
    if (newly.length) setAchList(getUnlocked());
    return newly;
  }

  // Faz F: günlük sayfası toplandı
  function handleNote(id: number) {
    collectNote(id);
    const got = getCollected();
    setJournalGot(got);
    if (unlock("collector")) setAchList(getUnlocked());
    refreshAch({ journal: got.length }); // journal7 / journal_all
  }

  function playMission(i: number) {
    setMissionIndex(i);
    setMissionRunId((r) => r + 1);
    setScreen("missionplay");
  }

  function handleMissionEnd(r: EndResult) {
    const m = missionIndex != null ? MISSIONS[missionIndex] : null;
    const ok = r.status === "levelclear";
    const t = Math.floor(r.time ?? 0);
    let best = m ? missionBest[m.id] ?? 0 : 0;
    if (ok && m) {
      unlockSecret(m.id); // görev başarısı → karışık eşlemeyle bir sır aç
      // tamamlandı işaretle
      setCleared((prev) => {
        const next = prev.includes(m.id) ? prev : [...prev, m.id];
        try {
          localStorage.setItem("blackout_missions_cleared", JSON.stringify(next));
        } catch {
          /* geç */
        }
        return next;
      });
      // en iyi (en kısa) süre
      if (best === 0 || t < best) {
        best = t;
        setMissionBest((prev) => {
          const next = { ...prev, [m.id]: t };
          try {
            localStorage.setItem("blackout_mission_best", JSON.stringify(next));
          } catch {
            /* geç */
          }
          return next;
        });
      }
    }
    // Başarım: tamamlanan görev sayısı (bu koşuyu da say) + genel değerlendirme
    if (r.kills) bumpStat("kills", r.kills);
    const missionsDone = ok && m ? (cleared.includes(m.id) ? cleared.length : cleared.length + 1) : cleared.length;
    refreshAch({ missions: missionsDone });
    setMissionResult(
      m
        ? {
            ok,
            title: m.title,
            time: t,
            best,
            hasNext: missionIndex != null && missionIndex < MISSIONS.length - 1,
          }
        : null
    );
    setScreen("missionresult");
  }

  function playEndless(m: Mission = ENDLESS) {
    setEndlessMission(m);
    setEndlessRunId((r) => r + 1);
    setScreen("endlessplay");
  }

  function saveBest(m: Mission, val: number): number {
    const prev = survBest[m.id] ?? 0;
    const best = Math.max(prev, val);
    if (best > prev) {
      setSurvBest((s) => ({ ...s, [m.id]: best }));
      try {
        localStorage.setItem(bestKey(m), String(best));
      } catch {
        /* geç */
      }
    }
    return best;
  }

  function handleEndlessEnd(r: EndResult) {
    const survived = Math.floor(r.time ?? r.score ?? 0);
    const best = saveBest(endlessMission, survived);
    if (r.kills) bumpStat("kills", r.kills);
    refreshAch(endlessMission.id === KOR_GECE.id ? { korBest: best } : { endlessBest: best });
    setEndlessResult({ survived, best, title: endlessMission.title });
    setScreen("endlessresult");
  }

  function playArena(m: Mission = ARENA) {
    setArenaMission(m);
    setArenaRunId((r) => r + 1);
    setScreen("arenaplay");
  }

  function handleArenaEnd(r: EndResult) {
    const wave = Math.max(1, Math.floor(r.score ?? 1)); // skor = geçilen dalga
    const best = saveBest(arenaMission, wave);
    if (r.kills) bumpStat("kills", r.kills);
    refreshAch(arenaMission.id === HORDE.id ? { hordeBest: best } : { arenaBest: best });
    setArenaResult({ wave, best, title: arenaMission.title });
    setScreen("arenaresult");
  }

  function handleStarted(room: NetRoom, info: StartInfo) {
    roomRef.current = room;
    setStartInfo(info);
    setScreen("onlinegame");
  }

  function leaveOnline() {
    roomRef.current?.leave();
    roomRef.current = null;
    setStartInfo(null);
    setScreen("menu");
  }

  // Geri: tek buton (kabukta, sol üst) — geçmiş yığınından bir önceki ekrana döner.
  const goBack = () => {
    const prev = backStack.current.pop();
    poppingRef.current = true;
    setScreen(prev ?? "menu");
  };

  const bannerBase: React.CSSProperties = {
    position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 50,
    display: "flex", alignItems: "center", gap: 12, maxWidth: "92vw",
    border: "1px solid rgba(125,255,176,0.4)", borderRadius: 10, padding: "12px 16px",
    boxShadow: "0 12px 40px rgba(0,0,0,0.6)", color: "#e6f5ea",
    background: "linear-gradient(180deg, rgba(20,40,25,0.97), rgba(10,20,12,0.97))",
  };
  const inviteBanner = (
    <>
      {invite && (
        <div style={bannerBase}>
          <span style={{ fontSize: 14 }}>
            <b style={{ color: "#7dffb0" }}>{invite.fromName}</b> seni odaya davet etti
            <span style={{ color: "var(--muted)" }}> ({invite.room})</span>
          </span>
          <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={acceptInvite}>Katıl</button>
          <button className="btn" style={{ padding: "6px 10px", opacity: 0.7 }} onClick={() => setInvite(null)}>✕</button>
        </div>
      )}
      {friendReq && (
        <div style={{ ...bannerBase, top: invite ? 74 : 14 }}>
          <span style={{ fontSize: 14 }}>
            <b style={{ color: "#7dffb0" }}>{friendReq.fromName}</b> seni arkadaş olarak eklemek istiyor
          </span>
          <button
            className="btn btn-primary"
            style={{ padding: "6px 14px" }}
            onClick={() => {
              presenceRef.current?.acceptRequest(friendReq.fromCode, friendReq.fromName);
              removeIncomingRequest(friendReq.fromCode); // kabul edildi → bekleyen listeden çık
              setFriendsOnline(getFriends().filter((f) => presenceRef.current?.isOnline(f.code)).length);
              setFriendToast(`${friendReq.fromName} arkadaşın oldu`);
              window.setTimeout(() => setFriendToast(""), 3000);
              setFriendReq(null);
            }}
          >
            Kabul
          </button>
          <button
            className="btn"
            style={{ padding: "6px 10px", opacity: 0.7 }}
            onClick={() => { removeIncomingRequest(friendReq.fromCode); setFriendReq(null); }}
          >
            Reddet
          </button>
        </div>
      )}
      {friendToast && (
        <div style={{ ...bannerBase, top: 14, borderColor: "rgba(125,255,176,0.5)" }}>
          <span style={{ fontSize: 14, color: "#7dffb0" }}>{friendToast}</span>
        </div>
      )}
    </>
  );

  // ORTAK KABUK: oyun ekranları hariç TÜM ekranlar MenuShell içinde render edilir.
  // Kökte hep aynı <MenuShell> tipi döndüğü için React onu mount'ta tutar →
  // labirent/grain canvas'ı ekranlar arası KESİNTİSİZ akar (tasarım gereği).
  // Davet/arkadaşlık bildirimleri HER ekranda görünür (lobi + oyun dahil) — bu yüzden
  // kabuğun içinde. Eskiden yalnız menü ve brifingde basılıyordu; lobide ya da oyun
  // içindeyken arkadaşlık isteği gelince hiçbir şey görünmüyordu.
  const chrome = (body: React.ReactNode): React.ReactNode =>
    isPlayScreen(screen) ? (
      <>
        {inviteBanner}
        {body}
      </>
    ) : (
      <MenuShell
        menu={screen === "menu"}
        onBack={screen === "menu" ? undefined : goBack}
        onSettings={() => { setSettingsReturn(screen); setScreen("ayarlar"); }}
        onFriends={() => setScreen("friends")}
        onHelp={() => setHelpOpen(true)}
        coins={menuCoins}
        friendsOnline={friendsOnline}
      >
        {inviteBanner}
        {body}
      </MenuShell>
    );

  // Açılış animasyonu (marka splash) — her yüklemede bir kez, sonra menü. Dokun=atla.
  if (showSplash) return <Splash onDone={() => setShowSplash(false)} />;

  if (screen === "playing") {
    return (
      <Game
        key={runId}
        level={level}
        score={score}
        lives={lives}
        themeSeed={themeSeed}
        diff={spDiff}
        onEnd={handleEnd}
        onQuit={() => setScreen("menu")}
        onNote={handleNote}
      />
    );
  }

  if (screen === "lobby") {
    return chrome(
      <OnlineLobby
        onBack={() => { setPendingJoin(null); setScreen(lobbyReturn); }}
        onStarted={handleStarted}
        presence={presenceRef.current}
        initialJoinCode={pendingJoin}
        publicRoom={lobbyPublic}
        initialHost={lobbyAutoHost}
      />
    );
  }

  if (screen === "friends") {
    return chrome(<Friends presence={presenceRef.current} onBack={() => setScreen("menu")} />);
  }

  if (screen === "online") {
    return chrome(
      <Online
        presence={presenceRef.current}
        onJoin={(code) => { setPendingJoin(code); setLobbyPublic(true); setLobbyAutoHost(false); setLobbyReturn("online"); setScreen("lobby"); }}
        onCreateRoom={() => { setPendingJoin(null); setLobbyPublic(true); setLobbyAutoHost(true); setLobbyReturn("online"); setScreen("lobby"); }}
        onBack={() => setScreen("menu")}
      />
    );
  }

  if (screen === "ayarlar") {
    return chrome(<Settings onBack={() => setScreen(settingsReturn)} />);
  }

  if (screen === "shop") {
    return chrome(
      <Shop
        title={shopReturn === "levelclear" ? "BÖLÜM ARASI DÜKKÂN" : "DÜKKÂN"}
        onBack={() => setScreen(shopReturn)}
      />
    );
  }

  if (screen === "achievements") {
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">Karanlıkta Bıraktıkların</div>
          <h2 className="scr-title">BAŞARIMLAR</h2>
          <p className="scr-sub">{achList.length}/{ACHIEVEMENTS.length} açıldı</p>
        </div>
        <div className="scr-body" style={{ maxWidth: 1160 }}>
          <div className="grid grid-268">
            {[...ACHIEVEMENTS].sort((a, b) => ({ kolay: 0, orta: 1, zor: 2 })[a.tier] - ({ kolay: 0, orta: 1, zor: 2 })[b.tier]).map((a) => {
              const got = achList.includes(a.id);
              const claimed = achClaimed.includes(a.id);
              const ts = TIER_STYLE[a.tier];
              return (
                <div key={a.id} className={"card" + (got ? "" : " is-locked")}>
                  {/* Başlık ikonun ALTINDA değil YANINDA (tek satır: ikon + ad, sağda zorluk rozeti) */}
                  <div className="card-head">
                    <div className="item-ico" style={got ? undefined : { color: "var(--ink-dimmer)", background: "rgba(206,186,156,.06)", borderColor: "rgba(206,186,156,.18)" }}>
                      <Icon name={got ? (ACH_ICON[a.id] ?? "trophy") : "lock"} size={22} stroke={1.6} />
                    </div>
                    <div className="card-t">{a.title}</div>
                    <span className="badge-tier" style={{ color: ts.color }}>{ts.label}</span>
                  </div>
                  <div className="card-d">{a.desc}</div>
                  <div className="card-meta">
                    <span className="card-gold"><Icon name="coin" size={13} /> {a.reward}</span>
                    <span style={{ color: got ? "var(--ok-text)" : "var(--ink-dimmer)" }}>{got ? "Açıldı" : "Kilitli"}</span>
                  </div>
                  {got && !claimed && (
                    <button
                      className="buy-btn"
                      style={{ alignSelf: "stretch", justifyContent: "center" }}
                      onClick={() => {
                        const r = claimReward(a.id);
                        if (r.ok) { setMenuCoins(r.coins); setAchClaimed(getClaimed()); }
                      }}
                    >
                      <Icon name="coin" size={13} /> Ödülü Al (+{a.reward})
                    </button>
                  )}
                  {got && claimed && (
                    <div className="item-own" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Icon name="check" size={13} /> Ödül alındı
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "journal") {
    const roman = (n: number) =>
      ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV"][n - 1] ?? String(n);
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">Kendi Elimden</div>
          <h2 className="scr-title">GÜNLÜK</h2>
          <p className="scr-sub">Bölümlerde bulup topladığın sayfalar — {journalGot.length}/{JOURNAL.length}</p>
        </div>
        <div className="scr-body" style={{ maxWidth: 840 }}>
          <div className="grid grid-340">
            {JOURNAL.map((e, i) => {
              const got = journalGot.includes(e.id);
              return (
                <div key={e.id} className={"card card-strip" + (got ? "" : " is-locked")}>
                  {/* Roma rakamı + sayfa adı aynı satırda */}
                  <div className="card-head">
                    <span className="roman">{roman(i + 1)}</span>
                    <div className="card-t">{got ? e.title : "Kayıp Sayfa"}</div>
                    {!got && <Icon name="lock" size={15} />}
                  </div>
                  <div className="card-d">
                    {got ? e.text : "Bu sayfa henüz karanlıkta. Bölümlerde ararken bulabilirsin."}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "secrets") {
    const all = unlockedSecrets.length >= SECRET_COUNT;
    const sel = openSecret != null ? SECRETS[openSecret] : null;
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">O Gecenin Kalıntıları</div>
          <h2 className="scr-title">SIRLAR</h2>
          <p className="scr-sub">
            Görevleri tamamladıkça açılır — <b style={{ color: "var(--gold-lite)" }}>{unlockedSecrets.length}/{SECRET_COUNT}</b>
          </p>
        </div>
        <div className="scr-body" style={{ maxWidth: 1000 }}>
          <div className="grid grid-184">
            {SECRETS.map((s, i) => {
              const got = unlockedSecrets.includes(i);
              // Dolgu/yazı boyutu .secret-card sınıfında (satır içi stil, mobil
              // kuralını ezip kartların küçülmesini engelliyordu).
              return got ? (
                <button key={s.id} className="card secret-card" onClick={() => setOpenSecret(i)}>
                  <div className="secret-img" dangerouslySetInnerHTML={{ __html: s.svg }} />
                  <div className="card-t" style={{ color: "var(--gold-lite)" }}>{s.title}</div>
                </button>
              ) : (
                <div key={s.id} className="card secret-card is-locked">
                  <div className="secret-img"><Icon name="lock" size={30} /></div>
                  <div className="card-t" style={{ color: "var(--ink-dimmer)" }}>Sır {i + 1}</div>
                </div>
              );
            })}
          </div>

          {all && (
            <div className="panel panel-gold" style={{ marginTop: 18, textAlign: "center" }}>
              <h2 className="scr-title" style={{ fontSize: "clamp(24px,4vw,36px)", color: "var(--gold-lite)" }}>
                {SECRET_ENDING_TITLE}
              </h2>
              {SECRET_ENDING.map((line, i) => (
                <p key={i} className="panel-p" style={{ marginTop: 10 }}>{line}</p>
              ))}
            </div>
          )}
        </div>

        {/* Sır detayı modalı */}
        {sel && (
          <div className="mm-modal" onClick={(e) => { if (e.target === e.currentTarget) setOpenSecret(null); }}>
            <div className="mm-modal-card">
              <div
                style={{ width: "100%", maxWidth: 380, margin: "0 auto 16px", borderRadius: 9, overflow: "hidden", boxShadow: "0 6px 30px rgba(0,0,0,0.6)" }}
                dangerouslySetInnerHTML={{ __html: sel.svg }}
              />
              <div className="scr-eyebrow" style={{ textAlign: "center" }}>Sır {(openSecret ?? 0) + 1}</div>
              <h2 className="mm-modal-title" style={{ marginTop: 6 }}>{sel.title}</h2>
              <p className="panel-p" style={{ textAlign: "center" }}>{sel.text}</p>
              <button className="mm-modal-close" onClick={() => setOpenSecret(null)}>Kapat</button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === "missionplay" && missionIndex != null) {
    return (
      <Game
        key={`m${missionIndex}-${missionRunId}`}
        level={1}
        score={0}
        lives={3}
        themeSeed={missionIndex}
        mission={MISSIONS[missionIndex]}
        onEnd={handleMissionEnd}
        onQuit={() => setScreen("missions")}
      />
    );
  }

  // Hayatta kalma modları (Bitmeyen Gece / Arena) taban 1 canla başlar; KALICI
  // "ekstra can hakkı" paketi burada da geçerli (eskiden lives={1} sabitti → paket
  // bu modlarda hiç işlemiyordu). Birikmez: her oyunda taban + sahip olunan paket.
  if (screen === "endlessplay") {
    return (
      <Game
        key={`endless-${endlessRunId}`}
        level={1}
        score={0}
        lives={1}
        themeSeed={endlessRunId}
        mission={endlessMission}
        onEnd={handleEndlessEnd}
        onQuit={() => setScreen("modes")}
      />
    );
  }

  if (screen === "arenaplay") {
    return (
      <Game
        key={`arena-${arenaRunId}`}
        level={1}
        score={0}
        lives={1}
        themeSeed={arenaRunId}
        mission={arenaMission}
        onEnd={handleArenaEnd}
        onQuit={() => setScreen("modes")}
      />
    );
  }

  if (screen === "arenaresult" && arenaResult) {
    const rec = arenaResult.wave >= arenaResult.best && arenaResult.wave > 1;
    return chrome(
      <div className="screen">
        <div className="title" style={{ fontSize: "clamp(28px,7vw,50px)", color: "#ff9a3c" }}>
          {arenaResult.title.toLocaleUpperCase("tr")} DÜŞTÜ
        </div>
        <div className="subtitle" style={{ fontSize: "clamp(20px,5vw,30px)" }}>
          <b style={{ color: "#8be9ff" }}>{arenaResult.wave}. dalgaya</b> ulaştın
          {rec && <span style={{ color: "#7dffb0" }}> · yeni rekor!</span>}
        </div>
        <div className="subtitle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="trophy" size={17} style={{ color: "#7dffb0" }} />
          Rekor: <b style={{ color: "#7dffb0" }}>{arenaResult.best} dalga</b>
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => playArena(arenaMission)}>Tekrar Dene →</button>
          <button className="btn" onClick={() => setScreen("modes")}>← Modlar</button>
        </div>
      </div>
    );
  }

  if (screen === "modes") {
    const sBest = (m: Mission, unit: string) => (survBest[m.id] > 0 ? `Rekor ${survBest[m.id]}${unit}` : undefined);
    const modeList: { title: string; icon: IconName; desc: string; onClick: () => void; best?: string }[] = [
      { title: "Bitmeyen Gece", icon: "infinity", desc: "Çıkış yok; gelinler döner ve çoğalır. Dayandığın her saniye skorun.", onClick: () => playEndless(ENDLESS), best: sBest(ENDLESS, " sn") },
      { title: "Kör Gece", icon: "moon", desc: "Fenersiz, kapkaranlıkta hayatta kalma. Sesle ve refleksle dayan.", onClick: () => playEndless(KOR_GECE), best: sBest(KOR_GECE, " sn") },
      { title: "Arena", icon: "swords", desc: "Açık alanda dalga hayatta kalma. Her 6 öldürmede dalga yükselir; bol altın.", onClick: () => playArena(ARENA), best: sBest(ARENA, " dalga") },
      { title: "Sürü Gecesi", icon: "swarm", desc: "Açık alanda yoğun, hızlı büyüyen sürü. Arena'nın çok daha zoru.", onClick: () => playArena(HORDE), best: sBest(HORDE, " dalga") },
    ];
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">Hayatta Kalma</div>
          <h2 className="scr-title">MODLAR</h2>
        </div>
        <div className="scr-body" style={{ maxWidth: 800 }}>
          <div className="grid grid-340">
            {modeList.map((m) => (
              <button key={m.title} className="card" onClick={m.onClick}>
                {/* Mod adı ikonun ALTINDA değil YANINDA (diğer kartlarla aynı düzen) */}
                <div className="card-head">
                  <div className="item-ico"><Icon name={m.icon} size={22} stroke={1.6} /></div>
                  <div className="card-t">{m.title}</div>
                  {m.best && <span className="badge-ok">{m.best}</span>}
                </div>
                <div className="card-d">{m.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === "endlessresult" && endlessResult) {
    // Bu modda AMAÇ uzun dayanmak: süre = skor. Ekran bunu açıkça söylesin —
    // rekor kırdıysan kutla, kırmadıysan rekora ne kadar kaldığını göster.
    const rec = endlessResult.survived >= endlessResult.best && endlessResult.survived > 0;
    const gap = Math.max(0, endlessResult.best - endlessResult.survived);
    return chrome(
      <div className="screen">
        <div className="title" style={{ fontSize: "clamp(30px,8vw,56px)", color: rec ? "#7dffb0" : "#ff6b6b" }}>
          {rec ? "YENİ REKOR" : "GECE SENİ YENDİ"}
        </div>
        <div className="subtitle" style={{ color: "#c9b8d0", marginTop: -8 }}>{endlessResult.title}</div>

        <div className="subtitle" style={{ fontSize: "clamp(24px,6.5vw,40px)", lineHeight: 1.2 }}>
          <b style={{ color: "#8be9ff" }}>{endlessResult.survived} sn</b> dayandın
        </div>

        <div className="subtitle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, flexWrap: "wrap" }}>
          <Icon name="trophy" size={16} style={{ color: "#7dffb0" }} />
          Rekor: <b>{endlessResult.best} sn</b>
          {!rec && <span style={{ color: "var(--muted)" }}>· {gap} sn kaldı</span>}
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={() => playEndless(endlessMission)}>Daha Uzun Dayan →</button>
          <button className="btn" onClick={() => setScreen("modes")}>← Modlar</button>
        </div>
      </div>
    );
  }

  if (screen === "missionresult" && missionResult) {
    const mr = missionResult;
    return chrome(
      <div className="screen">
        <div
          className="title"
          style={{ fontSize: "clamp(30px,8vw,56px)", color: mr.ok ? "#7dffb0" : "#ff6b6b" }}
        >
          {mr.ok ? "GÖREV TAMAM" : "BAŞARISIZ"}
        </div>
        <div className="subtitle" style={{ fontSize: "clamp(18px,4.5vw,26px)" }}>
          {mr.title}
        </div>
        {mr.ok ? (
          <div className="subtitle">
            Süre: <b style={{ color: "#8be9ff" }}>{mr.time}s</b> · En iyi:{" "}
            <b style={{ color: "#7dffb0" }}>{mr.best}s</b>
          </div>
        ) : (
          <div className="subtitle" style={{ opacity: 0.8 }}>
            Karanlık seni yuttu. Tekrar dene.
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {mr.ok && mr.hasNext && missionIndex != null && (
            <button className="btn btn-primary" onClick={() => playMission(missionIndex + 1)}>
              Sonraki Görev →
            </button>
          )}
          {!mr.ok && missionIndex != null && (
            <button className="btn btn-primary" onClick={() => playMission(missionIndex)}>
              Tekrar Dene →
            </button>
          )}
          <button className="btn" onClick={() => setScreen("missions")}>
            Görev Listesi
          </button>
        </div>
      </div>
    );
  }

  if (screen === "missions") {
    const sel = openMission != null ? MISSIONS[openMission] : null;
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">Tek Kişilik</div>
          <h2 className="scr-title">KARANLIK GÖREVLER</h2>
          <p className="scr-sub">{cleared.length}/{MISSIONS.length} tamamlandı · her görev bir sır açar</p>
        </div>
        <div className="scr-body" style={{ maxWidth: 840 }}>
          <div className="grid grid-232">
            {MISSIONS.map((m, i) => {
              const done = cleared.includes(m.id);
              // Kademeli açılma: görevler 3'erli gruplar. İlk grup (1-3) hep açık; sonraki
              // grup, ÖNCEKİ 3 görevin HEPSİ bitince açılır.
              const group = Math.floor(i / 3);
              const prevCleared =
                group === 0 ||
                MISSIONS.slice((group - 1) * 3, group * 3).every((pm) => cleared.includes(pm.id));
              // Tamamlanmış görev, grubu kilitli görünse bile (eski/sırasız kayıt) her zaman oynanabilir.
              const locked = !prevCleared && !done;
              // Tamamlanan = hafif YEŞİL (yazılar okunur kalır, "Tamam" yazısı YOK).
              // Kilitli = soluk + kilit. Açık-bitmemiş = normal.
              const cls = "card" + (done ? " is-done" : locked ? " is-locked" : "");
              return (
                <button
                  key={m.id}
                  className={cls}
                  disabled={locked}
                  onClick={() => { if (!locked) setOpenMission(i); }}
                >
                  <div className="card-head">
                    <span className="badge-num">{m.id}</span>
                    <div className="card-t">{m.title}</div>
                    {locked && <span className="badge-lock" aria-label="Kilitli"><Icon name="lock" size={13} /></span>}
                    {done && <span className="badge-done" aria-label="Tamamlandı"><Icon name="check" size={14} /></span>}
                  </div>
                  <div className="card-d">{locked ? "Önceki 3 görevi tamamla" : m.objectiveHint}</div>
                  {!locked && missionBest[m.id] ? (
                    <div className="card-meta">
                      <span>En iyi {missionBest[m.id]}s</span>
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        {/* Görev brifingi modalı */}
        {sel && (
          <div className="mm-modal" onClick={(e) => { if (e.target === e.currentTarget) setOpenMission(null); }}>
            <div className="mm-modal-card">
              <div className="card-row" style={{ justifyContent: "center", gap: 12, marginBottom: 12 }}>
                <span className="badge-num">{sel.id}</span>
                {cleared.includes(sel.id) && <span className="badge-done" aria-label="Tamamlandı"><Icon name="check" size={15} /></span>}
              </div>
              <h2 className="mm-modal-title" style={{ marginBottom: 12 }}>{sel.title}</h2>
              <p className="panel-p" style={{ textAlign: "center" }}>{sel.brief}</p>
              <div className="cta-row" style={{ marginTop: 20 }}>
                <button className="btn-primary-x" onClick={() => { const i = openMission!; setOpenMission(null); playMission(i); }}>
                  Göreve Başla
                </button>
                <button className="mm-ghost" onClick={() => setOpenMission(null)}>Kapat</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === "onlinegame" && roomRef.current && startInfo) {
    // Oyun içindeyken de arkadaşlık isteği/davet görünsün (kabuk kullanmıyor)
    return (
      <>
        {inviteBanner}
        <OnlineGame
          room={roomRef.current}
          info={startInfo}
          onExit={leaveOnline}
        />
      </>
    );
  }


  if (screen === "menu") {
    const rp = loadSpProgress();
    return chrome(
      <>
      <MainMenu
        onSolo={startNewGame}
        onMulti={() => setScreen("multi")}
        onMissions={() => setScreen("missions")}
        onModes={() => setScreen("modes")}
        onShop={() => { setShopReturn("menu"); setScreen("shop"); }}
        onAchievements={() => setScreen("achievements")}
        onJournal={() => setScreen("journal")}
        onSecrets={() => setScreen("secrets")}
        continueLabel={rp ? `Bölüm ${rp.level}` : null}
        onContinue={() => rp && play(rp.level, rp.score, rp.lives)}
        help={helpOpen}
        onHelpClose={() => setHelpOpen(false)}
      />
      </>
    );
  }

  // ÇOK OYUNCULU — 2 kart (tasarım): Arkadaşlarınla Oyna / Online Odalar
  if (screen === "multi") {
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">Çok Oyunculu</div>
          <h2 className="scr-title">ÖLÜM KOŞUSU</h2>
          <p className="scr-sub">2–6 kişi, ilk kaçan kazanır.</p>
        </div>
        <div className="scr-body" style={{ maxWidth: 800 }}>
          <div className="mm-primaries" style={{ marginTop: 0 }}>
            <button
              className="mm-card"
              onClick={() => { setPendingJoin(null); setLobbyPublic(false); setLobbyAutoHost(false); setLobbyReturn("multi"); setScreen("lobby"); }}
            >
              <span className="mm-card-ico">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.4" />
                  <path d="M3 19a5.5 5.5 0 0 1 11 0M14.5 15a4.5 4.5 0 0 1 6.5 4" />
                </svg>
              </span>
              <span className="mm-card-txt">
                <span className="mm-card-title">ARKADAŞLARINLA OYNA</span>
                <span className="mm-card-sub">Oda kur, kodu paylaş · özel oda</span>
              </span>
            </button>
            <button
              className="mm-card"
              onClick={() => setScreen("online")}
            >
              <span className="mm-card-ico">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18z" />
                </svg>
              </span>
              <span className="mm-card-txt">
                <span className="mm-card-title">ONLINE ODALAR</span>
                <span className="mm-card-sub">Herkese açık odalara katıl</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // TEK KİŞİLİK — brifing / giriş (tasarım)
  if (screen === "intro") {
    const rp = loadSpProgress();
    return chrome(
      <div className="scr">
        <div className="scr-head">
          <div className="scr-eyebrow">Tek Kişilik · Yalnız Kaçış</div>
          <h2 className="scr-title">{INTRO_TITLE}</h2>
        </div>
        <div className="scr-body" style={{ maxWidth: 720 }}>
          <div className="panel panel-blood" style={{ padding: "22px 24px" }}>
            {INTRO_LINES.map((line, i) => (
              <p key={i} className="panel-p" style={{ marginTop: i === 0 ? 0 : 12 }}>{line}</p>
            ))}
          </div>

          {/* Zorluk seçici — tek tip 3'lü segment */}
          <div className="seg-label">Zorluk</div>
          <div className="seg seg-3">
            {([
              { key: "kolay", label: "Kolay", desc: "Az ve yavaş gelin" },
              { key: "orta", label: "Orta", desc: "Dengeli" },
              { key: "zor", label: "Zor", desc: "Çok/hızlı gelin, dar görüş" },
            ] as { key: Diff; label: string; desc: string }[]).map((d) => (
              <button
                key={d.key}
                className={"seg-item" + (spDiff === d.key ? " is-on" : "")}
                onClick={() => chooseDiff(d.key)}
              >
                <span className="seg-item-t">{d.label}</span>
                <span className="seg-item-d">{d.desc}</span>
              </button>
            ))}
          </div>

          <div className="cta-row">
            {rp ? (
              <>
                <button className="btn-primary-x" onClick={() => play(rp.level, rp.score, rp.lives)}>
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
                  Devam Et · Bölüm {rp.level}
                </button>
                <button className="mm-ghost" onClick={() => { clearSpProgress(); play(1, 0, 4); }}>
                  Baştan Başla
                </button>
              </>
            ) : (
              <button className="btn-primary-x" onClick={() => { clearSpProgress(); play(1, 0, 4); }}>
                Karanlığa Gir →
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return chrome(
    <div className="screen">
      {screen === "dead" && (
        <>
          <div className="big" style={{ color: "#ff6b6b" }}>
            {deadCrushed ? "ÇIKIŞ ÇÖKTÜ" : "SENİ BULDULAR"}
          </div>
          <div className="subtitle">
            {deadCrushed
              ? <>Süre doldu — tünel üstüne çöktü. Bir canın söndü. Bölüm {level} yeniden başlıyor.</>
              : <>Soğuk eller ensende… bir canın söndü. Bölüm {level} yeniden başlıyor.</>}
          </div>
          <div className="subtitle" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            Kalan can:
            {Array.from({ length: Math.max(3, lives) }, (_, i) => (
              <Icon key={i} name="heart" size={17} fill={i < lives} className={"heart" + (i < lives ? "" : " gone")} />
            ))}
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => play(level, score, lives)}>
              Devam Et
            </button>
            <button className="btn" onClick={() => setScreen("menu")}>
              ← Menüye Dön
            </button>
          </div>
        </>
      )}

      {screen === "levelclear" && (
        <div className="clear-scr">
          {/* Başlık (büyük) → ilerleme (biraz küçük) → (rehber notu) → eylemler → altın; cüzdan altta */}
          <div className="clear-title">Bölüm Tamamlandı</div>
          <div className="clear-progress">{level}<span className="clear-total"> / 10</span></div>
          {level === 1 && (
            <div className="clear-note">Rehber bitti. Bundan sonrası gerçek labirent.</div>
          )}
          {newAch.length > 0 && (
            <div className="clear-ach">
              <Icon name="trophy" size={16} /> Yeni başarım: {newAch.map((id) => achievementById(id)?.title).filter(Boolean).join(", ")}
            </div>
          )}
          <div className="clear-actions">
            <button className="btn btn-primary" onClick={() => play(level + 1, score, lives)}>
              Sonraki Bölüm →
            </button>
            <button
              className={"btn" + (level === 1 ? " pulse-gold" : "")}
              onClick={() => { setShopReturn("levelclear"); setScreen("shop"); }}
              style={{ display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              <Icon name="cart" size={16} /> Dükkâna Uğra
            </button>
          </div>
          <div className="clear-table">
            <div className="clear-row">
              <span className="clear-row-l"><Icon name="coin" size={15} /> Kazanılan</span>
              <span className="clear-row-v">+{coinInfo.gained}</span>
            </div>
            {coinInfo.bonus > 0 && (
              <div className="clear-row">
                <span className="clear-row-l"><Icon name="plus" size={15} /> Bonus</span>
                <span className="clear-row-v">+{coinInfo.bonus}</span>
              </div>
            )}
            <div className="clear-row">
              <span className="clear-row-l"><Icon name="wallet" size={15} /> Cüzdan</span>
              <span className="clear-row-v">{coinInfo.total}</span>
            </div>
          </div>
        </div>
      )}

      {screen === "gameover" && (
        <>
          <div className="title" style={{ fontSize: "clamp(36px,10vw,72px)" }}>
            KARANLIK KAZANDI
          </div>
          <div className="subtitle">
            Gelinlerin arasında kayboldun. Son bölüm: <b>{level}</b> · Skor:{" "}
            <b>{score}</b>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={startNewGame}>
              Baştan Başla
            </button>
            <button className="btn" onClick={() => setScreen("menu")}>
              ← Menüye Dön
            </button>
          </div>
        </>
      )}

      {screen === "win" && (
        <>
          <div className="title" style={{ color: "#7dffb0" }}>
            GÜN AĞARDI
          </div>
          <div className="subtitle">
            {TOTAL_LEVELS} bölümün karanlığından da sağ çıktın. Gelinler geride
            kaldı — şimdilik. Final skorun: <b>{score}</b>
          </div>
          <div className="subtitle" style={{ color: "#ffd75a", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <Icon name="coin" size={16} /> Cüzdan: <b>{coinInfo.total} altın</b>
          </div>
          {newAch.length > 0 && (
            <div className="subtitle" style={{ color: "#ffd75a", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, flexWrap: "wrap" }}>
              <Icon name="trophy" size={16} /> Yeni başarım: {newAch.map((id) => achievementById(id)?.title).filter(Boolean).join(", ")}
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={startNewGame}>
              Yeniden Oyna
            </button>
            <button className="btn" onClick={() => setScreen("menu")}>
              ← Menüye Dön
            </button>
          </div>
        </>
      )}

    </div>
  );
}
