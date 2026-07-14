"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { getFriends, type FriendPresence } from "@/lib/friends";

// Online Odalar ekranı — arkadaştan bağımsız: açık oyun odalarını ve çevrimiçi
// oyuncuları (kod + isim) gör; odaya katıl ya da arkadaşlık isteği gönder.
export default function Online({
  presence,
  onJoin,
  onBack,
}: {
  presence: FriendPresence | null;
  onJoin: (code: string) => void;
  onBack: () => void;
}) {
  const [, setTick] = useState(0);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState<Set<string>>(new Set());

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
  const players = presence?.getOnlinePlayers() ?? [];
  const friendCodes = new Set(getFriends().map((f) => f.code));

  function req(code: string) {
    presence?.sendRequest(code);
    setSent((s) => new Set(s).add(code));
    setMsg("✓ Arkadaşlık isteği gönderildi");
    window.setTimeout(() => setMsg(""), 2500);
  }

  return (
    <div className="menuscreen">
      <button className="topback" onClick={onBack}>← Geri</button>
      <div style={{ maxWidth: 620, margin: "0 auto", width: "100%" }}>
        <div className="big" style={{ color: "#6ee7ff" }}>Online Odalar</div>
        <div className="subtitle">
          Açık odalara katıl ya da çevrimiçi oyunculara arkadaşlık isteği gönder.
        </div>
        <div style={{ minHeight: 20, color: "#7dffb0", fontWeight: 700, margin: "4px 0" }}>{msg}</div>

        {/* Açık odalar */}
        <div style={{ fontWeight: 800, color: "#e0a24a", fontFamily: "'Cinzel',serif", letterSpacing: "0.08em", margin: "8px 0" }}>
          🏠 Açık Odalar
        </div>
        {rooms.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--muted)", padding: "6px 0 14px" }}>
            Şu an açık oda yok. Sen bir oda kur (Arkadaşlarınla Oyna → Ölüm Koşusu → Oda Kur), herkes görsün.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {rooms.map((r) => (
              <div key={r.code} className="card-parch" style={{ padding: 12, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800 }}>
                    {r.hostName}<span style={{ color: "var(--muted)", fontWeight: 400 }}> · oda {r.code}</span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.08em" }}>
                    <Icon name="people" size={12} style={{ margin: "0 4px -2px 0" }} />{r.count} kişi · kod {r.hostCode}
                  </div>
                </div>
                {!friendCodes.has(r.hostCode) && (
                  <button className="btn" style={{ padding: "5px 10px" }} disabled={sent.has(r.hostCode)} onClick={() => req(r.hostCode)}>
                    {sent.has(r.hostCode) ? "✓" : "+ Arkadaş"}
                  </button>
                )}
                <button className="btn btn-primary" style={{ padding: "6px 14px" }} onClick={() => onJoin(r.code)}>
                  Katıl
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Çevrimiçi oyuncular */}
        <div style={{ fontWeight: 800, color: "#e0a24a", fontFamily: "'Cinzel',serif", letterSpacing: "0.08em", margin: "8px 0" }}>
          <Icon name="people" size={16} style={{ margin: "0 6px -3px 0" }} />Çevrimiçi Oyuncular
        </div>
        {players.length === 0 ? (
          <div style={{ fontSize: 14, color: "var(--muted)", padding: "6px 0" }}>
            Şu an başka çevrimiçi oyuncu görünmüyor.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {players.map((p) => {
              const isFriend = friendCodes.has(p.code);
              return (
                <div key={p.code} className="card-parch" style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#2e9e5b", boxShadow: "0 0 6px #2e9e5b", flex: "none" }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "var(--muted)", letterSpacing: "0.1em" }}>{p.code}</div>
                  </div>
                  {isFriend ? (
                    <span style={{ fontSize: 12, color: "#7dffb0" }}>arkadaş ✓</span>
                  ) : (
                    <button className="btn btn-primary" style={{ padding: "5px 12px" }} disabled={sent.has(p.code)} onClick={() => req(p.code)}>
                      {sent.has(p.code) ? "✓ Gönderildi" : "+ Arkadaş"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 16, lineHeight: 1.5 }}>
          Çevrimiçi algılama gerçek zamanlıdır; oyuncular/odalar birkaç saniyede bir güncellenir.
          Tam görünürlük için karşı tarafın da uygulamayı açık tutması gerekir.
        </div>
      </div>
    </div>
  );
}
