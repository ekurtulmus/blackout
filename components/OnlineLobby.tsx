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
import { useT } from "@/lib/i18n";

type Mode = "choose" | "host" | "join";

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
  const t = useT();
  // (ROOM_COST lib/online.ts'ten import edilir; yerel tanım yok)
  const DIFFS: { key: RaceDiff; label: string; desc: string }[] = [
    { key: "kolay", label: t("online.lobby.diff.easy"), desc: t("online.lobby.diff.easy.d") },
    { key: "orta", label: t("online.lobby.diff.normal"), desc: t("online.lobby.diff.normal.d") },
    { key: "zor", label: t("online.lobby.diff.hard"), desc: t("online.lobby.diff.hard.d") },
  ];
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
    const iv = window.setInterval(() => setTick((n) => n + 1), 2500);
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
              <b style={{ flex: 1, textAlign: "left", color: me ? "#6ee7ff" : "#7dffb0" }}>{(p.name && p.name.trim()) || p.code || t("online.lobby.player")}{me ? ` (${t("online.you")})` : ""}</b>
              {canAdd &&
                (isSent(p.code!) ? (
                  <span style={{ fontSize: 12, color: "#ffd75a" }}>{t("online.lobby.reqPending")}</span>
                ) : (
                  <button
                    className="btn"
                    style={{ padding: "5px 9px", display: "inline-flex", alignItems: "center", gap: 3 }}
                    title={t("online.friends.add.btn")}
                    aria-label={t("online.friends.add.btn")}
                    onClick={() => {
                      const r = presence?.sendRequest(p.code!);
                      if (!r?.ok) {
                        setNotice(t(r?.reason ?? "online.friends.err.failed"));
                        window.setTimeout(() => setNotice(""), 4000);
                      }
                      setTick((n) => n + 1);
                    }}
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
      const v = n.trim();
      if (v) localStorage.setItem(NAME_KEY, v);
    } catch {
      /* geç */
    }
  }

  // Odada görünecek ad: alana yazılan > KAYITLI isim > arkadaş kodu.
  // ÖNEMLİ: startRoom, mount effect'inden de çağrılıyor (otomatik oda kur / davetle
  // katıl). Orada `name` state'i HENÜZ boş — setName asenkron. State'e güvenilirse
  // isim yerine hep kod gönderilir. Bu yüzden kaynak localStorage.
  function resolveName(typed: string): string {
    const v = typed.trim();
    if (v) return v;
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
    // Oda ücreti YALNIZ herkese açık odalar için ("Online Odalar" listesine düşenler).
    // ARKADAŞ ODASI (özel, kodla paylaşılan) ÜCRETSİZ: dükkânda altın satışı kalktı ve
    // başlangıç altını 0 → ücret alınsaydı yeni oyuncu arkadaşıyla HİÇ oynayamazdı.
    const cost = publicRoom ? ROOM_COST : 0;
    if (getCoins() < cost) {
      setNotice(t("online.lobby.needGold", { cost, have: getCoins() }));
      window.setTimeout(() => setNotice(""), 4000);
      return;
    }
    if (cost > 0) setCoins(addCoins(-cost));
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
          <h2 className="scr-title" style={{ color: "#ff6b6b" }}>{t("online.lobby.offline.title")}</h2>
          <p className="scr-sub">{t("online.lobby.offline.sub")}</p>
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
        <div className="scr-eyebrow">{mode === "host" ? t("online.lobby.eyebrow.host") : mode === "join" ? t("online.lobby.eyebrow.join") : t("online.lobby.eyebrow.choose")}</div>
        <h2 className="scr-title">{t("online.lobby.title")}</h2>
      </div>

      {mode === "choose" && (
        <>
          <div className="subtitle">{t("online.lobby.intro")}</div>
          <div className="subtitle" style={{ marginBottom: 2 }}>{t("online.lobby.yourName")}</div>
          {nameInput}
          <div className="subtitle" style={{ margin: "2px 0", fontSize: 15, display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
            {t("online.lobby.wallet")} <b style={{ color: "#ffd75a", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="coin" size={13} /> {coins}</b>
          </div>
          {notice && (
            <div className="subtitle" style={{ color: "#ff9a3c", fontSize: 14, maxWidth: 420 }}>{notice}</div>
          )}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button
              className="btn btn-primary"
              onClick={host}
              disabled={publicRoom ? coins < ROOM_COST : false}
              style={{ opacity: publicRoom && coins < ROOM_COST ? 0.5 : 1 }}
              title={publicRoom && coins < ROOM_COST ? t("online.lobby.needGold.short", { cost: ROOM_COST }) : t("online.lobby.host.tip")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="home" size={15} /> {t("online.lobby.host")}
                {publicRoom && <>({ROOM_COST} <Icon name="coin" size={12} />)</>}
              </span>
            </button>
            <button className="btn" onClick={() => setMode("join")}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="key" size={15} /> {t("online.lobby.join")}</span>
            </button>
          </div>
        </>
      )}

      {mode === "host" && (
        <>
          <div className="subtitle">{t("online.lobby.shareCode")}</div>
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
            {t("online.lobby.players", { n: count, max: MAX_PLAYERS })}
            {count < 2 ? ` ${t("online.lobby.need2")}` : ""}
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
                  <Icon name="people" size={15} /> {t("online.lobby.inviteTitle")}
                </div>
                {onlineFriends.length === 0 ? (
                  <div style={{ fontSize: 13, color: "var(--muted)" }}>
                    {t("online.lobby.noFriendsOnline")}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {onlineFriends.map((f) => (
                      <div key={f.code} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2e9e5b", boxShadow: "0 0 6px #2e9e5b", flex: "none" }} />
                        <span style={{ flex: 1, fontWeight: 700 }}>{f.name}</span>
                        {invited.has(f.code) ? (
                          <span style={{ fontSize: 12, color: "#7dffb0", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Icon name="check" size={13} /> {t("online.lobby.invited")}
                          </span>
                        ) : (
                          <button
                            className="btn btn-primary"
                            style={{ padding: "5px 12px" }}
                            onClick={() => inviteFriend(f.code)}
                          >
                            {t("online.lobby.invite")}
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
            <div className="seg-label" style={{ marginTop: 0 }}>{t("online.lobby.diff")}</div>
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
              title={t("online.lobby.arena.tip")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="swords" size={14} /> {t("online.lobby.arena", { v: arena ? t("online.on") : t("online.off") })}</span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
                {t("online.lobby.arena.d")}
              </span>
            </button>
          </div>

          {/* PvP modu: oyuncular birbirini de vurabilir (mermi %10 hasar) */}
          <div style={{ margin: "2px 0 6px" }}>
            <button
              className={"btn" + (pvp ? " btn-primary" : "")}
              onClick={() => setPvp((v) => !v)}
              style={{ opacity: pvp ? 1 : 0.75 }}
              title={t("online.lobby.pvp.tip")}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="swords" size={14} /> {t("online.lobby.pvp", { v: pvp ? t("online.on") : t("online.off") })}</span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.75, fontWeight: 400 }}>
                {t("online.lobby.pvp.d")}
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
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="play" size={13} fill /> {t("online.lobby.start", { n: count })}</span>
            </button>
            <button className="btn" onClick={back}>
              ← {t("online.lobby.cancel")}
            </button>
          </div>
          {status === "error" && (
            <div className="subtitle" style={{ color: "#ff6b6b" }}>
              {t("online.lobby.err.retry")}
            </div>
          )}
        </>
      )}

      {/* Katılım: bağlanmadan önce kod gir */}
      {mode === "join" && status !== "connected" && (
        <>
          <div className="subtitle" style={{ marginBottom: 2 }}>{t("online.lobby.yourNameShort")}</div>
          {nameInput}
          <div className="subtitle">{t("online.lobby.enterCode")}</div>
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
              ? t("online.lobby.connecting")
              : status === "error"
              ? t("online.lobby.err.code")
              : status === "left"
              ? t("online.lobby.hostLeft")
              : ""}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={join}
              disabled={code.length < 4}
            >
              {t("online.lobby.joinGo")} →
            </button>
            <button className="btn" onClick={back}>
              ← {t("common.back")}
            </button>
          </div>
        </>
      )}

      {/* Katıldıktan sonra: İZLEYİCİ lobisi — host'la aynı ekran ama zorluk/başlat PASİF */}
      {mode === "join" && status === "connected" && (
        <>
          <div className="subtitle" style={{ color: "#7dffb0" }}>{t("online.lobby.joined")}</div>
          <div
            style={{
              fontSize: "clamp(40px,12vw,90px)", fontWeight: 900, letterSpacing: "0.2em",
              color: "#6ee7ff", textShadow: "0 0 24px rgba(110,231,255,0.4)",
            }}
          >
            {code}
          </div>
          <div className="subtitle" style={{ margin: "4px 0" }}>
            {t("online.lobby.players", { n: count, max: MAX_PLAYERS })}
          </div>
          {rosterList()}

          {/* Katılan: zorluğu göremez ama aynı düzende görsün (ev sahibi seçer) */}
          <div style={{ margin: "4px 0", opacity: 0.55, width: "100%", maxWidth: 420 }}>
            <div className="seg-label" style={{ marginTop: 0 }}>{t("online.lobby.diff")} <span style={{ letterSpacing: 0 }}>{t("online.lobby.diff.hostPicks")}</span></div>
            <div className="seg seg-3">
              {DIFFS.map((d) => (
                <button key={d.key} className="seg-item" disabled style={{ cursor: "not-allowed" }}>
                  <span className="seg-item-t">{d.label}</span>
                </button>
              ))}
            </div>
          </div>

          <button className="btn btn-primary" disabled style={{ opacity: 0.4, cursor: "not-allowed" }}>
            {t("online.lobby.waitHost")}
          </button>

          {/* Odada kod girme alanı KALDIRILDI: roster'daki her oyuncunun yanında zaten
              "+" ile istek gönderiliyor; kodu elle yazdırmak gereksizdi. */}
          <button className="btn" onClick={back}>← {t("online.lobby.leave")}</button>
        </>
      )}
    </div>
  );
}
