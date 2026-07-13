"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audio";

export default function Settings({ onBack }: { onBack: () => void }) {
  const [vol, setVol] = useState(100);
  const [music, setMusic] = useState(true);
  const [muted, setMuted] = useState(false);

  // Ses motorunu hazırla ve kayıtlı tercihleri oku
  useEffect(() => {
    sound.init();
    setVol(Math.round(sound.getVolume() * 100));
    setMusic(sound.isMusicOn());
    setMuted(sound.muted);
  }, []);

  function changeVol(v: number) {
    setVol(v);
    sound.resume();
    sound.setVolume(v / 100);
  }
  function toggleMusic() {
    const on = !music;
    setMusic(on);
    sound.resume();
    sound.setMusic(on);
  }
  function toggleMuted() {
    const m = !muted;
    setMuted(m);
    sound.setMuted(m);
  }

  return (
    <div className="screen">
      <button className="topback" onClick={onBack}>← Menü</button>
      <div className="title" style={{ fontSize: "clamp(32px,8vw,60px)" }}>
        AYARLAR
      </div>

      <div
        className="how"
        style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 440, width: "100%" }}
      >
        {/* Ses seviyesi */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <b>Ses Seviyesi</b>
            <span style={{ color: "#e0a24a" }}>{vol}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={vol}
            onChange={(e) => changeVol(Number(e.target.value))}
            style={{ width: "100%", accentColor: "#e0a24a", cursor: "pointer" }}
          />
        </div>

        {/* Müzik aç/kapa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Müzik</b>
          <button className={"btn" + (music ? " btn-primary" : "")} onClick={toggleMusic}>
            {music ? "Açık 🎵" : "Kapalı 🔇"}
          </button>
        </div>

        {/* Tüm sesi aç/kapa */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <b>Tüm Sesler</b>
          <button className={"btn" + (!muted ? " btn-primary" : "")} onClick={toggleMuted}>
            {muted ? "Kapalı 🔇" : "Açık 🔊"}
          </button>
        </div>

        <div style={{ fontSize: 13, opacity: 0.7, lineHeight: 1.5 }}>
          <b>İpucu:</b> Oyun içinde <kbd>Esc</kbd> / <kbd>P</kbd> ile duraklat, HUD'daki
          🔊 ile sesi hızlıca kıs. Ayarların bu cihazda saklanır.
        </div>
      </div>

    </div>
  );
}
