"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audio";
import { getMyCode } from "@/lib/friends";

// Sıfırlanacak ilerleme/satın alma anahtarları (ses tercihleri KORUNUR)
const PROGRESS_KEYS = [
  "blackout_coins",
  "blackout_inventory",
  "blackout_missions_cleared",
  "blackout_mission_best",
  "blackout_endless_best",
  "blackout_arena_best",
  "blackout_secrets",
  "blackout_sp_diff",
  "blackout_achievements",
  "blackout_ach_claimed",
  "blackout_journal",
];

const NAME_KEY = "blackout_name";

export default function Settings({ onBack }: { onBack: () => void }) {
  const [vol, setVol] = useState(100);
  const [music, setMusic] = useState(true);
  const [muted, setMuted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  function saveName(v: string) {
    setName(v);
    try {
      localStorage.setItem(NAME_KEY, v.trim());
    } catch {
      /* geç */
    }
    setNameMsg("✓ Kaydedildi");
    window.setTimeout(() => setNameMsg(""), 1500);
  }

  function resetProgress() {
    try {
      for (const k of PROGRESS_KEYS) localStorage.removeItem(k);
    } catch {
      /* geç */
    }
    // Tüm bellek önbelleklerini de temizlemek için sayfayı yeniden yükle
    try {
      window.location.reload();
    } catch {
      onBack();
    }
  }

  // Ses motorunu hazırla ve kayıtlı tercihleri oku
  useEffect(() => {
    sound.init();
    setVol(Math.round(sound.getVolume() * 100));
    setMusic(sound.isMusicOn());
    setMuted(sound.muted);
    try {
      const saved = localStorage.getItem(NAME_KEY);
      // Başta oyuncu kodu görünür; "Ev sahibi"/"Oyuncu" gibi otomatik varsayılanlar da kodla değiştirilir.
      const initial = !saved || saved === "Ev sahibi" || saved === "Oyuncu" ? getMyCode() : saved;
      setName(initial);
      if (initial !== saved) localStorage.setItem(NAME_KEY, initial);
    } catch {
      /* geç */
    }
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
      <button className="topback" onClick={onBack}>← Geri</button>
      <div className="title" style={{ fontSize: "clamp(32px,8vw,60px)" }}>
        AYARLAR
      </div>

      <div
        className="how"
        style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 440, width: "100%" }}
      >
        {/* Kalıcı oyuncu adı — online/çoklu/arkadaş listesinde kullanılır */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <b>Oyuncu Adın</b>
            <span style={{ color: "#7dffb0", fontSize: 13 }}>{nameMsg}</span>
          </div>
          <input
            value={name}
            onChange={(e) => saveName(e.target.value.slice(0, 8))}
            placeholder="Adını yaz…"
            maxLength={8}
            style={{
              width: "100%",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(150,140,120,0.35)",
              borderRadius: 8,
              padding: "10px 12px",
              color: "#e8e0cc",
              fontSize: 16,
              outline: "none",
            }}
          />
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6, lineHeight: 1.4 }}>
            Başta arkadaş kodun yazılı — <b style={{ color: "#e0a24a" }}>istediğin gibi değiştirebilirsin</b>.
            Bu isim online oyunlarda, çoklu oyunda ve arkadaş listende görünür.
          </div>
        </div>

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

      {/* Tehlikeli bölge: oyunu sıfırla */}
      <div
        className="how"
        style={{ maxWidth: 440, width: "100%", borderColor: "rgba(255,90,90,0.4)", display: "flex", flexDirection: "column", gap: 12 }}
      >
        <b style={{ color: "#ff6b6b", letterSpacing: "0.06em" }}>⚠️ Oyunu Sıfırla</b>
        {!confirmReset ? (
          <>
            <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
              Tüm ilerlemen silinir: <b>para, envanter ve satın almalar</b>, tamamlanan görevler,
              açılan sırlar, günlük sayfaları, başarımlar ve en iyi skorlar. <b>Geri alınamaz.</b>
            </div>
            <button className="btn" style={{ borderColor: "rgba(255,90,90,0.5)", color: "#ff9a3c" }} onClick={() => setConfirmReset(true)}>
              Oyunu Sıfırla
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, color: "#ff9a3c", lineHeight: 1.5, fontWeight: 700 }}>
              Emin misin? Tüm ilerlemen ve satın almaların kalıcı olarak silinecek.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn btn-primary" style={{ background: "#7a1f1f", borderColor: "#ff6b6b" }} onClick={resetProgress}>
                Evet, hepsini sil
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Vazgeç
              </button>
            </div>
          </>
        )}
      </div>

    </div>
  );
}
