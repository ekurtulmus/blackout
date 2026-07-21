"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useT } from "@/lib/i18n";
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
  const t = useT();
  const [, setTick] = useState(0);
  const [warn, setWarn] = useState("");

  function createRoom() {
    if (getCoins() < ROOM_COST) {
      setWarn(t("online.rooms.needGold", { cost: ROOM_COST, have: getCoins() }));
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
    <div className="scr">
      <div className="scr-head">
        <div className="scr-eyebrow">{t("online.rooms.eyebrow")}</div>
        <h2 className="scr-title">{t("online.rooms.title")}</h2>
        <p className="scr-sub">{t("online.rooms.sub")}</p>
      </div>

      <div className="scr-body" style={{ maxWidth: 800, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ textAlign: "center" }}>
          <button className="btn-primary-x" onClick={createRoom}>
            <Icon name="home" size={16} /> {t("online.rooms.create", { cost: ROOM_COST })}
          </button>
        </div>
        {warn && (
          <div style={{ color: "#ff9a3c", fontSize: 13.5, textAlign: "center" }}>{warn}</div>
        )}

        <div className="cos-label" style={{ marginTop: 8, marginBottom: 0 }}>{t("online.rooms.open")}</div>
        {rooms.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", color: "var(--ink-dimmer)", fontSize: 14 }}>
            {t("online.rooms.empty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rooms.map((r) => (
              <div key={r.code} className="panel" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="card-t" style={{ fontSize: 15 }}>
                    {r.hostName}
                    <span style={{ color: "var(--ink-dimmer)", fontWeight: 400 }}> {t("online.rooms.code", { code: r.code })}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--ink-dimmer)", letterSpacing: "0.08em", display: "inline-flex", alignItems: "center", gap: 5, marginTop: 3 }}>
                    <Icon name="people" size={13} /> {t("online.rooms.count", { n: r.count })}
                  </div>
                </div>
                <button className="buy-btn" onClick={() => onJoin(r.code)}>{t("online.rooms.join")}</button>
              </div>
            ))}
          </div>
        )}

        <div className="field-d" style={{ textAlign: "center" }}>{t("online.rooms.note")}</div>
      </div>
    </div>
  );
}
