"use client";

import { useEffect, useRef, useState } from "react";
import {
  NetRoom,
  generateRoomCode,
  type NetRole,
  type NetStatus,
} from "@/lib/net";
import { isOnlineAvailable } from "@/lib/supabaseClient";

type Mode = "choose" | "host" | "join";

export default function OnlineLobby({
  onBack,
  onConnected,
}: {
  onBack: () => void;
  onConnected: (room: NetRoom, role: NetRole) => void;
}) {
  const [mode, setMode] = useState<Mode>("choose");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<NetStatus>("idle");
  const roomRef = useRef<NetRoom | null>(null);
  const handedOff = useRef(false); // oda OnlineGame'e devredildi mi
  const online = isOnlineAvailable();

  // Oda bağlanınca üst katmana devret (ve artık lobide kapatma)
  useEffect(() => {
    if (status === "connected" && roomRef.current) {
      handedOff.current = true;
      onConnected(roomRef.current, roomRef.current.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // Ayrılırken kanalı kapat — AMA devredildiyse dokunma (OnlineGame kullanıyor)
  useEffect(() => {
    return () => {
      if (!handedOff.current) {
        roomRef.current?.leave();
        roomRef.current = null;
      }
    };
  }, []);

  function startRoom(c: string, role: NetRole) {
    roomRef.current?.leave();
    const room = new NetRoom(c, role);
    room.onStatus = (s) => setStatus(s);
    roomRef.current = room;
    setStatus("connecting");
    room.connect();
  }

  function host() {
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

  function back() {
    roomRef.current?.leave();
    roomRef.current = null;
    setStatus("idle");
    setCode("");
    setMode("choose");
  }

  if (!online) {
    return (
      <div className="screen">
        <div className="big" style={{ color: "#ff6b6b" }}>
          Online kullanılamıyor
        </div>
        <div className="subtitle">
          Supabase ayarları eksik (.env.local). Tek kişilik oynayabilirsin.
        </div>
        <button className="btn btn-primary" onClick={onBack}>
          ← Menü
        </button>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="title" style={{ fontSize: "clamp(32px,8vw,60px)" }}>
        ONLINE YARIŞ
      </div>

      {mode === "choose" && (
        <>
          <div className="subtitle">
            Bir arkadaşınla yarış: aynı labirentte kim önce çıkarsa kazanır.
            Oda kur ve kodu paylaş, ya da arkadaşının koduyla katıl.
          </div>
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={host}>
              🏠 Oda Kur
            </button>
            <button className="btn" onClick={() => setMode("join")}>
              🔑 Odaya Katıl
            </button>
          </div>
          <button className="btn" onClick={onBack} style={{ opacity: 0.7 }}>
            ← Menü
          </button>
        </>
      )}

      {mode === "host" && (
        <>
          <div className="subtitle">Bu kodu arkadaşına ver:</div>
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
          <div className="subtitle">
            {status === "connected"
              ? "Bağlandı! Başlıyor…"
              : status === "error"
              ? "Bağlantı hatası. Tekrar dene."
              : "Rakip bekleniyor…"}
          </div>
          <button className="btn" onClick={back}>
            ← İptal
          </button>
        </>
      )}

      {mode === "join" && (
        <>
          <div className="subtitle">Arkadaşının verdiği 4 haneli kodu gir:</div>
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
            autoFocus
            inputMode="text"
          />
          <div className="subtitle" style={{ minHeight: 22 }}>
            {status === "connecting"
              ? "Bağlanıyor…"
              : status === "connected"
              ? "Bağlandı! Başlıyor…"
              : status === "error"
              ? "Bağlantı hatası. Kodu kontrol et."
              : ""}
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <button
              className="btn btn-primary"
              onClick={join}
              disabled={code.length < 4 || status === "connecting"}
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
