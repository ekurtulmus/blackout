"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audio";
import { getMyCode } from "@/lib/friends";
import Icon from "@/components/Icon";

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
    <div className="scr">
      <div className="scr-head">
        <div className="scr-eyebrow">Tercihlerin</div>
        <h2 className="scr-title">AYARLAR</h2>
      </div>

      <div className="scr-body" style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* Kalıcı oyuncu adı */}
        <div className="panel">
          <div className="field-row">
            <span className="field-t">Oyuncu Adın</span>
            <span style={{ color: "var(--ok-text)", fontSize: 13 }}>{nameMsg}</span>
          </div>
          <input
            className="field-input"
            value={name}
            onChange={(e) => saveName(e.target.value.slice(0, 8))}
            placeholder="Adını yaz…"
            maxLength={8}
          />
          <div className="field-d">
            Başta arkadaş kodun yazılı — <b style={{ color: "var(--gold)" }}>istediğin gibi değiştirebilirsin</b>.
            Bu isim online oyunlarda, çok oyunculuda ve arkadaş listende görünür.
          </div>
        </div>

        {/* Ses */}
        <div className="panel">
          <div className="field-row">
            <span className="field-t">Ses Seviyesi</span>
            <span style={{ color: "var(--gold)", fontWeight: 700 }}>{vol}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={vol}
            onChange={(e) => changeVol(Number(e.target.value))}
            className="field-range"
          />

          <div className="field-row" style={{ marginTop: 18 }}>
            <span className="field-t">Müzik</span>
            <button className={"toggle" + (music ? " is-on" : "")} onClick={toggleMusic}>
              <Icon name={music ? "music" : "mute"} size={14} />
              {music ? "Açık" : "Kapalı"}
            </button>
          </div>
          <div className="field-row" style={{ marginTop: 12 }}>
            <span className="field-t">Tüm Sesler</span>
            <button className={"toggle" + (!muted ? " is-on" : "")} onClick={toggleMuted}>
              <Icon name={muted ? "mute" : "music"} size={14} />
              {muted ? "Kapalı" : "Açık"}
            </button>
          </div>

          <div className="field-d" style={{ marginTop: 16 }}>
            Oyun içinde <b>Esc</b> / <b>P</b> ile duraklat. Ayarların bu cihazda saklanır.
          </div>
        </div>

        {/* Tehlikeli bölge */}
        <div className="panel" style={{ borderColor: "rgba(255,90,90,0.4)", borderTop: "2px solid var(--blood)" }}>
          <div className="field-t" style={{ color: "var(--danger-text)", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Icon name="warn" size={16} /> Tüm İlerlemeyi Sıfırla
          </div>
          {!confirmReset ? (
            <>
              <div className="field-d" style={{ marginTop: 8 }}>
                Tüm ilerlemen silinir: <b>altın, envanter ve satın almalar</b>, tamamlanan görevler,
                açılan sırlar, günlük sayfaları, başarımlar ve en iyi skorlar. <b>Geri alınamaz.</b>
                {" "}Ses tercihlerin korunur.
              </div>
              <button className="danger-btn" onClick={() => setConfirmReset(true)}>Sıfırla</button>
            </>
          ) : (
            <>
              <div style={{ marginTop: 8, fontSize: 14, color: "var(--warn-text)", lineHeight: 1.5, fontWeight: 700 }}>
                Emin misin? Tüm ilerlemen ve satın almaların kalıcı olarak silinecek.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button className="danger-btn is-solid" onClick={resetProgress}>Evet, hepsini sil</button>
                <button className="mm-ghost" onClick={() => setConfirmReset(false)}>Vazgeç</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
