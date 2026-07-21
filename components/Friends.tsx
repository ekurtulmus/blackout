"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import { useT } from "@/lib/i18n";
import {
  getMyCode,
  getFriends,
  getSentRequests,
  getIncomingRequests,
  removeIncomingRequest,
  clearSent,
  isSent,
  type Friend,
  type FriendPresence,
  type IncomingReq,
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
  const t = useT();
  const myCode = getMyCode();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<IncomingReq[]>([]); // bekleyen gelen istekler
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");
  const [, setTick] = useState(0); // çevrimiçi durumu tazelemek için

  useEffect(() => {
    setFriends(getFriends());
    setIncoming(getIncomingRequests());
    if (!presence) return;
    const prev = presence.onPresence;
    presence.onPresence = () => setTick((n) => n + 1);
    const iv = window.setInterval(() => setTick((n) => n + 1), 2000);
    return () => {
      presence.onPresence = prev;
      window.clearInterval(iv);
    };
  }, [presence]);

  function doAdd() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { flash(t("online.friends.err.invalid")); return; }
    if (c === myCode) { flash(t("online.friends.err.self")); return; }
    if (friends.some((f) => f.code === c)) { flash(t("online.friends.err.already")); return; }
    if (isSent(c)) { flash(t("online.friends.err.duplicate")); return; }
    // Kod çevrimiçi değilse istek GÖNDERİLMEZ (boşluğa gitmesin) — kutu da temizlenmez
    // ki kullanıcı kodu düzeltip tekrar deneyebilsin.
    const r = presence?.sendRequest(c);
    // reason bir ÇEVİRİ ANAHTARIDIR (lib/friends.ts) → t() ile bas
    if (!r?.ok) { flash("✗ " + t(r?.reason ?? "online.friends.err.failed")); return; }
    setCode("");
    setTick((n) => n + 1);
    flash(t("online.friends.sent"));
  }
  function flash(m: string) {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 2600);
  }

  function copyCode() {
    try {
      navigator.clipboard?.writeText(myCode);
      setMsg(t("online.friends.copied"));
      window.setTimeout(() => setMsg(""), 1600);
    } catch {
      /* geç */
    }
  }

  const onlineCount = friends.filter((f) => presence?.isOnline(f.code)).length;

  return (
    <div className="scr">
      <div className="scr-head">
        <div className="scr-eyebrow">{t("online.friends.eyebrow")}</div>
        <h2 className="scr-title">{t("online.friends.title")}</h2>
        <p className="scr-sub">
          {t("online.friends.count", { n: friends.length })} ·{" "}
          <b style={{ color: "var(--ok-text)" }}>{t("online.friends.onlineN", { n: onlineCount })}</b>
        </p>
      </div>

      <div className="scr-body" style={{ maxWidth: 780, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ minHeight: 18, color: "var(--ok-text)", fontWeight: 600, fontSize: 13.5, textAlign: "center" }}>{msg}</div>

        {/* BEKLEYEN İSTEKLER — popup 5 sn sonra kapanır, istek burada bekler */}
        {incoming.length > 0 && (
          <div className="panel" style={{ borderColor: "rgba(125,255,176,0.45)", borderTop: "2px solid var(--ok-dot)" }}>
            <span className="field-t">{t("online.friends.incoming", { n: incoming.length })}</span>
            <div className="field-d">{t("online.friends.incoming.desc")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
              {incoming.map((r) => (
                <div key={r.code} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <b style={{ flex: 1, minWidth: 90, textAlign: "left", color: "var(--ok-text)" }}>{r.name}</b>
                  <span style={{ fontSize: 12, color: "var(--ink-dimmer)", letterSpacing: "0.1em" }}>{r.code}</span>
                  <button
                    className="buy-btn"
                    onClick={() => {
                      presence?.acceptRequest(r.code, r.name);
                      removeIncomingRequest(r.code);
                      setIncoming(getIncomingRequests());
                      setFriends(getFriends());
                      flash(t("online.friends.nowFriend", { name: r.name }));
                    }}
                  >
                    {t("online.friends.accept")}
                  </button>
                  <button
                    className="mm-ghost"
                    style={{ padding: "7px 12px" }}
                    onClick={() => { removeIncomingRequest(r.code); setIncoming(getIncomingRequests()); }}
                  >
                    {t("online.friends.reject")}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Senin kodun */}
        <div className="panel">
          <div className="field-d" style={{ marginTop: 0 }}>{t("online.friends.myCode")}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
            <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: "0.22em", color: "var(--ok-text)" }}>{myCode}</div>
            <button className="mm-ghost" onClick={copyCode}>{t("online.friends.copy")}</button>
          </div>
        </div>

        {/* Arkadaş ekle */}
        <div className="panel">
          <span className="field-t">{t("online.friends.add")}</span>
          <div className="field-d">{t("online.friends.add.desc")}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input
              className="field-input"
              style={{ marginTop: 0, flex: 1 }}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("online.friends.add.ph")}
              maxLength={6}
            />
            <button
              className="buy-btn"
              onClick={doAdd}
              disabled={code.trim().length < 4}
              title={t("online.friends.add.btn")}
              aria-label={t("online.friends.add.btn")}
              style={{ alignSelf: "stretch", padding: "0 14px" }}
            >
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>+</span>
              <Icon name="people" size={18} />
            </button>
          </div>
        </div>

        {/* Liste */}
        {friends.length === 0 ? (
          <div className="panel" style={{ textAlign: "center", color: "var(--ink-dimmer)", fontSize: 14 }}>
            {t("online.friends.empty")}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map((f) => {
              const on = presence?.isOnline(f.code);
              return (
                <div key={f.code} className="panel" style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span
                    title={on ? t("online.friends.online") : t("online.friends.offline")}
                    style={{ width: 10, height: 10, borderRadius: "50%", background: on ? "var(--ok-dot)" : "#555", boxShadow: on ? "0 0 8px var(--ok-dot)" : "none", flex: "none" }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="card-t" style={{ fontSize: 15 }}>{f.name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-dimmer)", letterSpacing: "0.1em" }}>{f.code}</div>
                  </div>
                  <span style={{ fontSize: 12, color: on ? "var(--ok-text)" : "var(--ink-dimmer)" }}>
                    {on ? t("online.friends.online.low") : t("online.friends.offline.low")}
                  </span>
                  <button
                    className="danger-btn"
                    style={{ marginTop: 0, padding: "6px 12px", letterSpacing: "0.08em" }}
                    onClick={() => { presence?.unfriend(f.code); setFriends(getFriends()); }}
                  >
                    {t("online.friends.remove")}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Gönderilen (bekleyen) istekler */}
        {getSentRequests().length > 0 && (
          <>
            <div className="cos-label" style={{ marginTop: 8 }}>{t("online.friends.sentList")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {getSentRequests().map((c) => (
                <div key={c} className="panel" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1, letterSpacing: "0.1em", fontWeight: 700 }}>{c}</div>
                  <span style={{ fontSize: 12, color: "var(--gold)" }}>{t("online.friends.pending")}</span>
                  <button className="mm-ghost" style={{ padding: "6px 12px", letterSpacing: "0.08em" }} onClick={() => { clearSent(c); setTick((n) => n + 1); }}>
                    {t("online.friends.cancel")}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="field-d" style={{ textAlign: "center" }}>
          {t("online.friends.hint.1")} <b>{t("online.friends.hint.path")}</b>{" "}
          {t("online.friends.hint.2")}
        </div>
      </div>
    </div>
  );
}
