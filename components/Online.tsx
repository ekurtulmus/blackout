"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { type FriendPresence } from "@/lib/friends";
import { getCoins } from "@/lib/coins";
import { ROOM_COST } from "@/lib/online";

// Online Odalar — arkadaş odalarından AYRI, herkese açık odalar. Buradan yeni oda
// kurabilir ya da açık bir odaya katılabilirsin. Arkadaşlık isteği ODA İÇİNDE (lobide) atılır.
export default function Online({
  presence,
  onJoin,
  onCreateRoom,
  onBack,
}: {
  presence: FriendPresence | null;
  onJoin: (code: string) => void;
  onCreateRoom: () => void;
  onBack: () => void;
}) {
  const [, setTick] = useState(0);
  const [warn, setWarn] = useState("");

  function createRoom() {
    if (getCoins() < ROOM_COST) {
      setWarn(`Yetersiz altın — oda kurmak ${ROOM_COST} altın gerekli (elinde ${getCoins()}).`);
      window.setTimeout(() => setWarn(""), 4000);
      return;
    }
    onCreateRoom();
  }

  useEffect(() => {
    if (!presence) return;
    const prev = presence.onPresence;
    presence.onPresence = () => setTick((t) => t + 1);
    const iv = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => {
      presence.onPresence = prev;
      window.clearInterval(iv);
    };
  }, [presence]);

  const rooms = presence?.getRooms() ?? [];

  return (
    <div className="menuscreen">
      <button className="topback" onClick={onBack}>← Geri</button>
      <div style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
        <div className="big" style={{ color: "#6ee7ff" }}>Online Odalar</div>
        <div className="subtitle">
          Herkese açık odalar. Yeni bir oda kur ya da açık bir odaya katıl. Odaya girince
          içindeki oyunculara arkadaşlık isteği gönderebilirsin.
        </div>

        <div style={{ textAlign: "center", margin: "6px 0 6px" }}>
          <button className="btn btn-primary" onClick={createRoom}>🏠 Yeni Oda Kur ({ROOM_COST}🪙)</button>
        </div>
        {warn && (
          <div className="subtitle" style={{ color: "#ff9a3c", fontSize: 14, margin: "0 0 12px" }}>{warn}</div>
        )}

        <div style={{ fontWeight: 800, color: "#e0a24a", fontFamily: "'Cinzel',serif", letterSpacing: "0.08em", margin: "8px 0" }}>
          Açık Odalar
        </div>
        {rooms.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--muted)", padding: "6px 0" }}>
            Şu an açık oda yok. İlk odayı sen kur — herkes listede görsün.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rooms.map((r) => (
              <div key={r.code} className="card-parch" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>
                    {r.hostName}<span style={{ color: "var(--muted)", fontWeight: 400 }}> · oda {r.code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.08em" }}>
                    <Icon name="people" size={12} style={{ margin: "0 4px -2px 0" }} />{r.count} kişi
                  </div>
                </div>
                <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={() => onJoin(r.code)}>
                  Katıl
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, lineHeight: 1.5 }}>
          Odalar birkaç saniyede bir güncellenir. Bir oda ancak kurucusu bekleme lobisindeyken
          listede görünür (yarış başlayınca kapanır).
        </div>
      </div>
    </div>
  );
}
