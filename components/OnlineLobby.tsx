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
  deserializeLevel,
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

type Mode = "choose" | "host" | "join";

const ROOM_COST = 200; // global oda kurma maliyeti (altın)

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
  const [coins, setCoins] = useState(0);
  const [notice, setNotice] = useState("");
  const roomRef = useRef<NetRoom | null>(null);
  const handedOff = useRef(false); // oda OnlineGame'e devredildi mi
  const online = isOnlineAvailable();

  // İsmi hatırla
  useEffect(() => {
    try {
      const saved = localStorage.getItem(NAME_KEY);
      setName(saved && saved !== "Ev sahibi" && saved !== "Oyuncu" ? saved : getMyCode());
    } catch {
      /* geç */
    }
    setCoins(getCoins());
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
  const [reqCode, setReqCode] = useState(""); // izleyici: arkadaş isteği kodu
  const [reqMsg, setReqMsg] = useState("");
  function sendFriendReq() {
    const c = reqCode.trim().toUpperCase();
    if (c.length < 4) return;
    presence?.sendRequest(c);
    setReqCode("");
    setReqMsg("✓ İstek gönderildi (arkadaşın çevrimiçiyse kabul edebilir)");
    window.setTimeout(() => setReqMsg(""), 3000);
  }
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
              <b style={{ flex: 1, textAlign: "left", color: me ? "#6ee7ff" : "#7dffb0" }}>{p.name}{me ? " (sen)" : ""}</b>
              {canAdd &&
                (isSent(p.code!) ? (
                  <span style={{ fontSize: 12, color: "#ffd75a" }}>istek ⏳</span>
                ) : (
                  <button className="btn" style={{ padding: "4px 10px" }} onClick={() => { presence?.sendRequest(p.code!); setTick((t) => t + 1); }}>
                    + Arkadaş
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
    setInvited((s) => new Set(s).add(code));
    window.setTimeout(() => setInvited((s) => { const n = new Set(s); n.delete(code); return n; }), 4000);
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

  function saveName(n: string) {
    try {
      localStorage.setItem(NAME_KEY, n);
    } catch {
      /* geç */
    }
  }

  function startRoom(c: string, role: NetRole) {
    roomRef.current?.leave();
    const nm = name.trim() || getMyCode();
    saveName(nm);
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
    const lvl = generateRaceLevel(1, diff, themeSeed, pls.length);
    room.startGame({ diff, level: serializeLevel(lvl), themeSeed });
    handedOff.current = true;
    onStarted(room, {
      role: "host",
      seat: 0,
      order: pls.map((p) => p.id),
      names: pls.map((p) => p.name),
      diff,
      themeSeed,
      initialLevel: lvl,
    });
  }

  function back() {
    roomRef.current?.leave();
    roomRef.current = null;
    setStatus("idle");
    setCode("");
    setPlayers([]);
    setMode("choose");
  }

  if (!online) {
    return (
      <div className="screen">
        <button className="topback" onClick={onBack}>← Menü</button>
        <div className="big" style={{ color: "#ff6b6b" }}>
          Online kullanılamıyor
        </div>
        <div className="subtitle">
          Supabase ayarları eksik (.env.local). Tek kişilik oynayabilirsin.
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
      placeholder="Adın (max 8)"
      maxLength={8}
    />
  );

  return (
    <div className="screen">
      <button className="topback" onClick={onBack}>← Menü</button>
      <div className="title" style={{ fontSize: "clamp(32px,8vw,60px)" }}>
        ÖLÜM KOŞUSU
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
          <div className="subtitle" style={{ margin: "2px 0", fontSize: 15 }}>
            Cüzdan: <b style={{ color: "#ffd75a" }}>🪙 {coins}</b> · Oda kurmak <b style={{ color: "#ffd75a" }}>{ROOM_COST}🪙</b>
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
              🏠 Oda Kur ({ROOM_COST}🪙)
            </button>
            <button className="btn" onClick={() => setMode("join")}>
              🔑 Odaya Katıl
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

          {/* Çevrimiçi arkadaşları odaya davet et */}
          {(() => {
            const onlineFriends = getFriends().filter((f) => presence?.isOnline(f.code));
            return (
              <div className="how" style={{ maxWidth: 420, width: "100%", padding: 14 }}>
                <div style={{ fontWeight: 800, color: "#7dffb0", marginBottom: 8 }}>👥 Arkadaşını çağır</div>
                {onlineFriends.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    Çevrimiçi arkadaşın yok. (Menüdeki 👥 ile arkadaş ekleyebilirsin.)
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {onlineFriends.map((f) => (
                      <div key={f.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2e9e5b", boxShadow: "0 0 6px #2e9e5b", flex: "none" }} />
                        <span style={{ flex: 1, fontWeight: 700 }}>{f.name}</span>
                        <button
                          className={"btn" + (invited.has(f.code) ? "" : " btn-primary")}
                          style={{ padding: "5px 12px" }}
                          disabled={invited.has(f.code)}
                          onClick={() => inviteFriend(f.code)}
                        >
                          {invited.has(f.code) ? "✓ Davet edildi" : "Davet Et"}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ margin: "6px 0" }}>
            <div className="subtitle" style={{ marginBottom: 8 }}>Zorluk</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {DIFFS.map((d) => (
                <button
                  key={d.key}
                  className={"btn" + (diff === d.key ? " btn-primary" : "")}
                  onClick={() => setDiff(d.key)}
                  style={{ opacity: diff === d.key ? 1 : 0.7 }}
                >
                  {d.label}
                  <span style={{ display: "block", fontSize: 12, opacity: 0.7 }}>
                    {d.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={startGame}
              disabled={count < 2}
              style={{ opacity: count < 2 ? 0.5 : 1 }}
            >
              ▶ Başlat ({count})
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
          <div className="subtitle" style={{ color: "#7dffb0" }}>Odaya katıldın 👀 İzleyicisin — ev sahibi başlatınca oyun başlar.</div>
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

          <div style={{ margin: "4px 0", opacity: 0.55 }}>
            <div className="subtitle" style={{ marginBottom: 8 }}>Zorluk <span style={{ fontSize: 12 }}>(ev sahibi seçer)</span></div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {DIFFS.map((d) => (
                <button key={d.key} className="btn" disabled style={{ cursor: "not-allowed" }}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
            ▶ Ev sahibi başlatır…
          </button>

          {/* İzleyici de arkadaş ekleyebilir */}
          <div className="how" style={{ maxWidth: 420, width: "100%", padding: 14 }}>
            <div style={{ fontWeight: 800, color: "#7dffb0", marginBottom: 8 }}>👥 Arkadaş ekle</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 8 }}>{reqMsg || "Kod gir, istek gönder."}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={reqCode}
                onChange={(e) => setReqCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6))}
                placeholder="Arkadaş kodu"
                maxLength={6}
                style={{ flex: 1, background: "rgba(0,0,0,0.35)", border: "1px solid rgba(150,140,120,0.35)", borderRadius: 8, padding: "9px 12px", color: "#e8e0cc", fontSize: 15, letterSpacing: "0.08em", outline: "none" }}
              />
              <button className="btn btn-primary" onClick={sendFriendReq} disabled={reqCode.trim().length < 4}>İstek</button>
            </div>
          </div>

          <button className="btn" onClick={back}>← Ayrıl</button>
        </>
      )}
    </div>
  );
}
