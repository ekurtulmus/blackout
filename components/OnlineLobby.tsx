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
}: {
  onBack: () => void;
  onStarted: (room: NetRoom, info: StartInfo) => void;
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
      if (saved) setName(saved);
    } catch {
      /* geç */
    }
    setCoins(getCoins());
  }, []);

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
    const nm = name.trim() || (role === "host" ? "Ev sahibi" : "Oyuncu");
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
      onChange={(e) => setName(e.target.value.slice(0, 14))}
      placeholder="Adın"
      maxLength={14}
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
            Oyuncular ({count}/{MAX_PLAYERS}):{" "}
            {players.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ", "}
                <b style={{ color: p.id === roomRef.current?.id ? "#6ee7ff" : "#7dffb0" }}>{p.name}</b>
              </span>
            ))}
            {count < 2 ? " — en az 2 oyuncu gerekli" : ""}
          </div>

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

      {mode === "join" && (
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
            {status === "connected"
              ? `Bağlandı! Oyuncular: ${count}. Ev sahibi başlatınca oyun başlayacak…`
              : status === "connecting"
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
              disabled={code.length < 4 || status === "connected"}
            >
              Katıl →
            </button>
            <button className="btn" onClick={back}>
              ← Geri
            </button>
          </div>
        </>
      )}
    </div>
  );
}
