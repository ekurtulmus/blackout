"use client";

import { useEffect, useState } from "react";
import {
  getMyCode,
  getFriends,
  addFriend,
  removeFriend,
  type Friend,
  type FriendPresence,
} from "@/lib/friends";

// Arkadaşlar ekranı — kendi kodunu paylaş, arkadaş ekle, çevrimiçi olanları gör.
// presence: global FriendPresence (çevrimiçi durumu). onBack: menüye dön.
export default function Friends({
  presence,
  onBack,
}: {
  presence: FriendPresence | null;
  onBack: () => void;
}) {
  const myCode = getMyCode();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [code, setCode] = useState("");
  const [fname, setFname] = useState("");
  const [msg, setMsg] = useState("");
  const [, setTick] = useState(0); // çevrimiçi durumu tazelemek için

  useEffect(() => {
    setFriends(getFriends());
    if (!presence) return;
    const prev = presence.onPresence;
    presence.onPresence = () => setTick((t) => t + 1);
    const iv = window.setInterval(() => setTick((t) => t + 1), 2000);
    return () => {
      presence.onPresence = prev;
      window.clearInterval(iv);
    };
  }, [presence]);

  function doAdd() {
    const r = addFriend(code, fname);
    if (r.ok) {
      setFriends(getFriends());
      setCode("");
      setFname("");
      setMsg("✓ Arkadaş eklendi");
    } else {
      setMsg("✗ " + (r.reason ?? "Eklenemedi"));
    }
    window.setTimeout(() => setMsg(""), 2000);
  }

  function copyCode() {
    try {
      navigator.clipboard?.writeText(myCode);
      setMsg("✓ Kodun kopyalandı");
      window.setTimeout(() => setMsg(""), 1600);
    } catch {
      /* geç */
    }
  }

  const onlineCount = friends.filter((f) => presence?.isOnline(f.code)).length;

  return (
    <div className="menuscreen">
      <button className="topback" onClick={onBack}>← Menü</button>
      <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
        <div className="big" style={{ color: "#7dffb0" }}>👥 Arkadaşlar</div>
        <div className="subtitle">
          {friends.length} arkadaş · <b style={{ color: "#7dffb0" }}>{onlineCount} çevrimiçi</b>
        </div>

        <div style={{ minHeight: 20, color: "#8be9ff", fontWeight: 700, margin: "4px 0" }}>{msg}</div>

        {/* Kendi kodun */}
        <div className="card-parch" style={{ padding: 14, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Senin arkadaş kodun (paylaş):</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 6 }}>
            <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: "0.22em", color: "#7dffb0" }}>{myCode}</div>
            <button className="btn" style={{ padding: "6px 12px" }} onClick={copyCode}>Kopyala</button>
          </div>
        </div>

        {/* Arkadaş ekle */}
        <div className="card-parch" style={{ padding: 14, marginBottom: 12, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 800, color: "#e0a24a" }}>Arkadaş ekle</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Kod (örn. K7M2QP)"
              maxLength={6}
              style={inputStyle}
            />
            <input
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              placeholder="İsim (isteğe bağlı)"
              maxLength={16}
              style={{ ...inputStyle, flex: 1, minWidth: 120 }}
            />
            <button className="btn btn-primary" onClick={doAdd} disabled={code.trim().length < 4}>
              Ekle
            </button>
          </div>
        </div>

        {/* Liste */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {friends.length === 0 && (
            <div style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", padding: 16 }}>
              Henüz arkadaşın yok. Kodunu paylaş ya da bir arkadaşının kodunu ekle.
            </div>
          )}
          {friends.map((f) => {
            const on = presence?.isOnline(f.code);
            return (
              <div
                key={f.code}
                className="card-parch"
                style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}
              >
                <span
                  title={on ? "Çevrimiçi" : "Çevrimdışı"}
                  style={{ width: 10, height: 10, borderRadius: "50%", background: on ? "#2e9e5b" : "#555", boxShadow: on ? "0 0 8px #2e9e5b" : "none", flex: "none" }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em" }}>{f.code}</div>
                </div>
                <span style={{ fontSize: 12, color: on ? "#7dffb0" : "var(--muted)" }}>
                  {on ? "çevrimiçi" : "çevrimdışı"}
                </span>
                <button className="btn" style={{ padding: "5px 10px", opacity: 0.7 }} onClick={() => { removeFriend(f.code); setFriends(getFriends()); }}>
                  Sil
                </button>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, lineHeight: 1.5 }}>
          Çevrimiçi bir arkadaşını oyuna çağırmak için <b>Ölüm Koşusu → Oda Kur</b> ekranındaki
          arkadaş butonunu kullan.
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "rgba(0,0,0,0.35)",
  border: "1px solid rgba(150,140,120,0.35)",
  borderRadius: 8,
  padding: "9px 12px",
  color: "#e8e0cc",
  fontSize: 15,
  letterSpacing: "0.08em",
  outline: "none",
};
