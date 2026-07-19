"use client";

import { useEffect, useRef, useState } from "react";
import {
  NetRoom,
  generateRoomCode,
  type NetPlayer,
  type NetRole,
  type NetStatus,
} from "@/lib/net";
import {
  MAX_PLAYERS,
  ROOM_COST,
  deserializeLevel,
  generateArenaLevel,
  generateRaceLevel,
  serializeLevel,
  type RaceDiff,
  type SerializedLevel,
  type StartInfo,
} from "@/lib/online";
import { randomThemeSeed } from "@/lib/themes";
import { isOnlineAvailable } from "@/lib/supabaseClient";
import { getCoins, addCoins } from "@/lib/coins";
import { getFriends, getMyCode, isSent, type FriendPresence } from "@/lib/friends";
import Icon from "@/components/Icon";

type Mode = "choose" | "host" | "join";

// (ROOM_COST lib/online.ts'ten import edilir; yerel tanım yok)
const DIFFS: { key: RaceDiff; label: string; desc: string }[] = [
  { key: "kolay", label: "Kolay", desc: "az/yavaş gelin" },
  { key: "orta", label: "Orta", desc: "dengeli" },
  { key: "zor", label: "Zor", desc: "çok/hızlı/zeki gelin" },
];

const NAME_KEY = "blackout_name";

export default function OnlineLobby({
  onBack,
  onStarted,
  presence,
  initialJoinCode,
  publicRoom,
  initialHost,
}: {
  onBack: () => void;
  onStarted: (room: NetRoom, info: StartInfo) => void;
  presence?: FriendPresence | null;
  initialJoinCode?: string | null;
  publicRoom?: boolean;
  initialHost?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<NetStatus>("idle");
  const [players, setPlayers] = useState<NetPlayer[]>([]);
  const [diff, setDiff] = useState<RaceDiff>("orta");
  const [pvp, setPvp] = useState(false); // PvP: oyuncular birbirini vurabilir (%10 hasar)
  const [arena, setArena] = useState(false); // Arena: açık alan dalga hayatta kalma (çıkış yok)
  const [coins, setCoins] = useState(0);
  const [notice, setNotice] = useState("");
  const roomRef = useRef<NetRoom | null>(null);
  const handedOff = useRef(false); // oda OnlineGame'e devredildi mi
  const didInit = useRef(false); // otomatik host/join yalnız BİR KEZ (StrictMode çift ücreti önle)
  const online = isOnlineAvailable();

  // İsmi hatırla
  useEffect(() => {
    try {
      // Alanı KODLA doldurma: doldurulunca oda kurarken kod isim olarak kaydedilip
      // gerçek ismi eziyordu. Kod artık yalnız placeholder'da görünür.
      const saved = (localStorage.getItem(NAME_KEY) || "").trim();
      setName(saved === "Ev sahibi" || saved === "Oyuncu" ? "" : saved);
    } catch {
      /* geç */
    }
    setCoins(getCoins());
    // Otomatik host/join YALNIZ BİR KEZ (StrictMode çift-mount'ta tekrar çalışmasın → çift ücret yok)
    if (didInit.current) return;
    didInit.current = true;
    // Davet kabul edildiyse: doğrudan o odaya katıl
    if (initialJoinCode) {
      setCode(initialJoinCode.toUpperCase());
      setMode("join");
      startRoom(initialJoinCode.toUpperCase(), "guest");
    } else if (initialHost) {
      // Online Odalar → Oda Kur: doğrudan (herkese açık) oda kur
      host();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Host isem VE oda herkese açıksa: "Online Odalar" listesine duyur (bekleme lobisinde)
  useEffect(() => {
    if (mode !== "host" || !presence || !code || !publicRoom) return;
    presence.announceRoom(code, Math.max(1, players.length));
    return () => presence.stopAnnounceRoom();
  }, [mode, code, players.length, presence, publicRoom]);

  // Çevrimiçi arkadaş durumunu tazele (davet paneli için)
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = window.setInterval(() => setTick((t) => t + 1), 2500);
    return () => window.clearInterval(iv);
  }, []);
  // Odadaki oyuncu listesi + her birine "+ Arkadaş" (kendisi/zaten arkadaş hariç; istek kalıcı)
  const rosterList = () => {
    const friendCodes = new Set(getFriends().map((f) => f.code));
    const myId = roomRef.current?.id;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", maxWidth: 420, margin: "0 auto" }}>
        {players.map((p) => {
          const me = p.id === myId;
          const canAdd = !me && !!p.code && p.code !== getMyCode() && !friendCodes.has(p.code);
          return (
            <div key={p.id} className="how" style={{ padding: "8px 12px", margin: 0, display: "flex", alignItems: "center", gap: 10 }}>
              <b style={{ flex: 1, textAlign: "left", color: me ? "#6ee7ff" : "#7dffb0" }}>{(p.name && p.name.trim()) || p.code || "Oyuncu"}{me ? " (sen)" : ""}</b>
              {canAdd &&
                (isSent(p.code!) ? (
                  <span style={{ fontSize: 12, color: "#ffd75a" }}>istek ⏳</span>
                ) : (
                  <button
                    className="btn"
                    style={{ padding: "5px 9px", display: "inline-flex", alignItems: "center", gap: 3 }}
                    title="Arkadaş ekle"
                    aria-label="Arkadaş ekle"
                    onClick={() => { presence?.sendRequest(p.code!); setTick((t) => t + 1); }}
                  >
                    <span style={{ fontSize: 16, fontWeight: 800, lineHeight: 1 }}>+</span>
                    <Icon name="people" size={16} />
                  </button>
                ))}
            </div>
          );
        })}
      </div>
    );
  };

  const [invited, setInvited] = useState<Set<string>>(new Set());
  function inviteFriend(code: string) {
    presence?.invite(code, roomRef.current?.code || "");
    // Davet edildi → kalıcı (buton kaybolur, tekrar "Davet Et" görünmez)
    setInvited((s) => new Set(s).add(code));
  }

  // Ayrılırken kanalı kapat — AMA devredildiyse dokunma (OnlineGame kullanıyor)
  useEffect(() => {
    return () => {
      if (!handedOff.current) {
        roomRef.current?.leave();
        roomRef.current = null;
      }
    };
  }, []);

  // Yalnız gerçekten yazılmış ismi sakla — kod ASLA isim olarak kaydedilmez.
  function saveName(n: string) {
    try {
      const t = n.trim();
      if (t) localStorage.setItem(NAME_KEY, t);
    } catch {
      /* geç */
    }
  }

  // Odada görünecek ad: alana yazılan > KAYITLI isim > arkadaş kodu.
  // ÖNEMLİ: startRoom, mount effect'inden de çağrılıyor (otomatik oda kur / davetle
  // katıl). Orada `name` state'i HENÜZ boş — setName asenkron. State'e güvenilirse
  // isim yerine hep kod gönderilir. Bu yüzden kaynak localStorage.
  function resolveName(typed: string): string {
    const t = typed.trim();
    if (t) return t;
    try {
      const s = (localStorage.getItem(NAME_KEY) || "").trim();
      if (s && s !== "Ev sahibi" && s !== "Oyuncu") return s;
    } catch {
      /* geç */
    }
    return getMyCode();
  }

  function startRoom(c: string, role: NetRole) {
    roomRef.current?.leave();
    saveName(name); // boşsa hiçbir şey yazmaz
    const nm = resolveName(name); // odada görünecek ad (yedek: kayıtlı isim → kod)
    const room = new NetRoom(c, role, nm);
    room.onStatus = (s) => setStatus(s);
    room.onRoster = (pl) => setPlayers(pl);
    // Guest: host "Başlat"a basınca oyuna geç
    room.onStart = (payload) => {
      handedOff.current = true;
      const order = payload.order;
      const seat = Math.max(0, order.indexOf(room.id));
      onStarted(room, {
        role: "guest",
        seat,
        order,
        names: payload.names,
        diff: payload.diff as RaceDiff,
        themeSeed: payload.themeSeed ?? 0,
        initialLevel: deserializeLevel(payload.level as SerializedLevel),
        pvp: !!payload.pvp,
        arena: !!payload.arena,
      });
    };
    roomRef.current = room;
    setStatus("connecting");
    room.connect();
  }

  function host() {
    // Global oda kurmak 200 altın. Yetersizse kurulmaz.
    if (getCoins() < ROOM_COST) {
      setNotice(`Oda kurmak için ${ROOM_COST} altın gerekli (elinde ${getCoins()}). Oynayıp altın kazan veya dükkândan al.`);
      window.setTimeout(() => setNotice(""), 4000);
      return;
    }
    const left = addCoins(-ROOM_COST);
    setCoins(left);
    const c = generateRoomCode(4);
    setCode(c);
    setMode("host");
    startRoom(c, "host");
  }

  function join() {
    if (code.length < 4) return;
    setMode("join");
    startRoom(code, "guest");
  }

  // Host oyunu başlatır
  function startGame() {
    const room = roomRef.current;
    if (!room || room.role !== "host") return;
    if (players.length < 2) return;
    const themeSeed = randomThemeSeed();
    const pls = room.players();
    const lvl = arena
      ? generateArenaLevel(themeSeed, pls.length, diff) // zorluk arenaya da geçmeli
      : generateRaceLevel(1, diff, themeSeed, pls.length);
    room.startGame({ diff, level: serializeLevel(lvl), themeSeed, pvp, arena });
    handedOff.current = true;
    onStarted(room, {
      role: "host",
      seat: 0,
      order: pls.map((p) => p.id),
      names: pls.map((p) => p.name),
      diff,
      themeSeed,
      initialLevel: lvl,
      pvp,
      arena,
    });
  }

  function back() {
    roomRef.current?.leave();
    roomRef.current = null;
    // Online Odalar'dan gelindiyse (doğrudan oda kur/katıl) tamamen çık → geldiğin yere dön.
    // Elle (arkadaş lobisi) seçim ekranındaysan seçim ekranına dön.
    if (initialHost || initialJoinCode) {
      onBack();
      return;
    }
    setStatus("idle");
    setCode("");
    setPlayers([]);
    setMode("choose");
  }

  if (!online) {
    return (
      <div className="scr">
        <div className="scr-head">
          <h2 className="scr-title" style={{ color: "#ff6b6b" }}>ONLINE KULLANILAMIYOR</h2>
          <p className="scr-sub">Supabase ayarları eksik (.env.local). Tek kişilik oynayabilirsin.</p>
        </div>
      </div>
    );
  }

  const count = players.length;
  const nameInput = (
    <input
      className="codeinput"
      style={{ letterSpacing: "normal", fontSize: "clamp(18px,4vw,26px)", textTransform: "none" }}
      value={name}
      onChange={(e) => setName(e.target.value.slice(0, 8))}
      placeholder={getMyCode()}
      maxLength={8}
    />
  );

  return (
    <div className="scr lobby">
      <div className="scr-head">
        <div className="scr-eyebrow">{mode === "host" ? "Bekleme Lobisi" : mode === "join" ? "Odaya Katıl" : "Çok Oyunculu"}</div>
        <h2 className="scr-title">ÖLÜM KOŞUSU</h2>
      </div>

      {mode === "choose" && (
        <>
          <div className="subtitle">
            2-6 kişi aynı karanlığa hapis. Gelinler hepinizin peşinde — ilk
            kaçan hayatta kalır, ötekiler geride kalır. Oda kur ve kodu paylaş,
            ya da bir arkadaşının koduyla karanlığa katıl.
          </div>
          <div className="subtitle" style={{ marginBottom: 2 }}>Oyuncu adın:</div>
          {nameInput}
          <div className="subtitle" style={{ margin: "2px 0", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            Cüzdan <b style={{ color: "#ffd75a", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="coin" size={13} /> {coins}</b>
          </div>
          {notice && (
            <div className="subtitle" style={{ color: "#ff9a3c", fontSize: 14, maxWidth: 420 }}>{notice}</div>
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={host}
              disabled={coins < ROOM_COST}
              style={{ opacity: coins < ROOM_COST ? 0.5 : 1 }}
              title={coins < ROOM_COST ? `${ROOM_COST} altın gerekli` : "Oda kur"}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="home" size={15} /> Oda Kur ({ROOM_COST} <Icon name="coin" size={12} />)</span>
            </button>
            <button className="btn" onClick={() => setMode("join")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="key" size={15} /> Odaya Katıl</span>
            </button>
          </div>
        </>
      )}

      {mode === "host" && (
        <>
          <div className="subtitle">Bu kodu arkadaşlarına ver:</div>
          <div
            style={{
              fontSize: "clamp(48px,14vw,110px)",
              fontWeight: 900,
              letterSpacing: "0.2em",
              color: "#6ee7ff",
              textShadow: "0 0 24px rgba(110,231,255,0.4)",
            }}
          >
            {code}
          </div>

          <div className="subtitle" style={{ margin: "4px 0" }}>
            Oyuncular ({count}/{MAX_PLAYERS}){count < 2 ? " — en az 2 oyuncu gerekli" : ""}
          </div>
          {rosterList()}

          {/* Çevrimiçi arkadaşları odaya davet et — ZATEN ODADA OLANLAR listelenmez
              (onlara "Davet Et" göstermek anlamsızdı). */}
          {(() => {
            const inRoom = new Set(players.map((p) => p.code).filter(Boolean) as string[]);
            const onlineFriends = getFriends().filter(
              (f) => presence?.isOnline(f.code) && !inRoom.has(f.code)
            );
            return (
              <div className="how" style={{ maxWidth: 420, width: "100%", padding: 14 }}>
                <div style={{ fontWeight: 800, color: "#7dffb0", marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name="people" size={15} /> Arkadaşını çağır
                </div>
                {onlineFriends.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Davet edilebilecek çevrimiçi arkadaşın yok.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {onlineFriends.map((f) => (
                      <div key={f.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2e9e5b", boxShadow: "0 0 6px #2e9e5b", flex: "none" }} />
                        <span style={{ flex: 1, fontWeight: 700 }}>{f.name}</span>
                        {invited.has(f.code) ? (
                          <span style={{ fontSize: 12, color: "#7dffb0", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Icon name="check" size={13} /> Davet edildi
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{ padding: "5px 12px" }}
                            onClick={() => inviteFriend(f.code)}
                          >
                            Davet Et
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Zorluk: Tek Kişilik brifingiyle AYNI 3'lü segment → daima yan yana
              (eski hâli flex-wrap'liydi, dar ekranda alt alta yığılıyordu) */}
          <div style={{ margin: "6px 0", width: "100%", maxWidth: 420 }}>
            <div className="seg-label" style={{ marginTop: 0 }}>Zorluk</div>
            <div className="seg seg-3">
              {DIFFS.map((d) => (
                <button
                  key={d.key}
                  className={"seg-item" + (diff === d.key ? " is-on" : "")}
                  onClick={() => setDiff(d.key)}
                >
                  <span className="seg-item-t">{d.label}</span>
                  <span className="seg-item-d">{d.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Arena modu: açık alan dalga hayatta kalma (çıkış yok) */}
          <div style={{ margin: "2px 0 6px" }}>
            <button
              className={"btn" + (arena ? " btn-primary" : "")}
              onClick={() => setArena((v) => !v)}
              style={{ opacity: arena ? 1 : 0.75 }}
              title="Açıkça: labirent yerine açık arena; çıkış yok, dalga dalga gelen gelinlere karşı hayatta kal"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="swords" size={14} /> Arena Modu: {arena ? "AÇIK" : "KAPALI"}</span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
                Açık alan · çıkış yok · dalga hayatta kalma (skor = süre)
              </span>
            </button>
          </div>

          {/* PvP modu: oyuncular birbirini de vurabilir (mermi %10 hasar) */}
          <div style={{ margin: "2px 0 6px" }}>
            <button
              className={"btn" + (pvp ? " btn-primary" : "")}
              onClick={() => setPvp((v) => !v)}
              style={{ opacity: pvp ? 1 : 0.75 }}
              title="Açıkça: oyuncular birbirine de mermi işletir (her isabet %10 can)"
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="swords" size={14} /> Oyuncular Birbirini Vurabilsin: {pvp ? "AÇIK" : "KAPALI"}</span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
                Mermi rakibe de değer — her isabet canının %10'u
              </span>
            </button>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={startGame}
              disabled={count < 2}
              style={{ opacity: count < 2 ? 0.5 : 1 }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="play" size={13} fill /> Başlat ({count})</span>
            </button>
            <button className="btn" onClick={back}>
              ← İptal
            </button>
          </div>
          {status === "error" && (
            <div className="subtitle" style={{ color: "#ff6b6b" }}>
              Bağlantı hatası. Tekrar dene.
            </div>
          )}
        </>
      )}

      {/* Katılım: bağlanmadan önce kod gir */}
      {mode === "join" && status !== "connected" && (
        <>
          <div className="subtitle" style={{ marginBottom: 2 }}>Adın:</div>
          {nameInput}
          <div className="subtitle">Ev sahibinin verdiği 4 haneli kodu gir:</div>
          <input
            className="codeinput"
            value={code}
            onChange={(e) =>
              setCode(
                e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9]/g, "")
                  .slice(0, 4)
              )
            }
            placeholder="ABCD"
            maxLength={4}
            inputMode="text"
          />
          <div className="subtitle" style={{ minHeight: 22 }}>
            {status === "connecting"
              ? "Bağlanıyor…"
              : status === "error"
              ? "Bağlantı hatası. Kodu kontrol et."
              : status === "left"
              ? "Ev sahibi ayrıldı."
              : ""}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={join}
              disabled={code.length < 4}
            >
              Katıl →
            </button>
            <button className="btn" onClick={back}>
              ← Geri
            </button>
          </div>
        </>
      )}

      {/* Katıldıktan sonra: İZLEYİCİ lobisi — host'la aynı ekran ama zorluk/başlat PASİF */}
      {mode === "join" && status === "connected" && (
        <>
          <div className="subtitle" style={{ color: "#7dffb0" }}>Odaya katıldın — ev sahibi başlatınca oyun başlar.</div>
          <div
            style={{
              fontSize: "clamp(40px,12vw,90px)", fontWeight: 900, letterSpacing: "0.2em",
              color: "#6ee7ff", textShadow: "0 0 24px rgba(110,231,255,0.4)",
            }}
          >
            {code}
          </div>
          <div className="subtitle" style={{ margin: "4px 0" }}>
            Oyuncular ({count}/{MAX_PLAYERS})
          </div>
          {rosterList()}

          {/* Katılan: zorluğu göremez ama aynı düzende görsün (ev sahibi seçer) */}
          <div style={{ margin: "4px 0", opacity: 0.55, width: "100%", maxWidth: 420 }}>
            <div className="seg-label" style={{ marginTop: 0 }}>Zorluk <span style={{ letterSpacing: 0 }}>(ev sahibi seçer)</span></div>
            <div className="seg seg-3">
              {DIFFS.map((d) => (
                <button key={d.key} className="seg-item" disabled style={{ cursor: "not-allowed" }}>
                  <span className="seg-item-t">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
            Ev sahibi başlatır…
          </button>

          {/* Odada kod girme alanı KALDIRILDI: roster'daki her oyuncunun yanında zaten
              "+" ile istek gönderiliyor; kodu elle yazdırmak gereksizdi. */}
          <button className="btn" onClick={back}>← Ayrıl</button>
        </>
      )}
    </div>
  );
}
