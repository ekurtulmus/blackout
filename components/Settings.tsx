"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audio";
import { getMyCode } from "@/lib/friends";
import Icon from "@/components/Icon";

// Sıfırlamada KORUNACAK anahtarlar: kimlik (arkadaş kodu/isim/arkadaşlar) + ses tercihleri.
// DİKKAT — burada "SİLİNECEKLER" listesi TUTMUYORUZ: eskiden öyleydi ve her yeni özellikte
// unutuluyordu. Unutulanlar yüzünden "sıfırladım ama hiçbir şey sıfırlanmadı" oluyordu:
//   blackout_sp_progress  → "Devam Et · Bölüm 7" duruyordu
//   blackout_stats        → başarım sayaçları duruyordu, başarımlar anında geri açılıyordu
//   blackout_equipped     → kuşanılan kozmetik duruyordu
//   blackout_best_<id>    → Kör Gece / Sürü Gecesi rekorları duruyordu (yalnız endless+arena siliniyordu)
// Artık TERSİ: "blackout_" ile başlayan HER ŞEY silinir, yalnız aşağıdakiler kalır.
// (app/page.tsx'teki tek-seferlik sürüm sıfırlamasıyla AYNI mantık — yeni anahtar
// eklendiğinde burayı güncellemek GEREKMEZ.)
const KEEP_KEYS = new Set([
  "blackout_uid",
  "blackout_name",
  "blackout_friends",
  "blackout_sent",
  "blackout_freq_in",
  "blackout_vol",
  "blackout_music",
  "blackout_muted",
  "blackout_reset_v",
]);

const NAME_KEY = "blackout_name";

export default function Settings({ onBack }: { onBack: () => void }) {
  const [vol, setVol] = useState(100);
  const [music, setMusic] = useState(true);
  const [muted, setMuted] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [name, setName] = useState("");
  const [nameMsg, setNameMsg] = useState("");

  // Yalnız KULLANICININ YAZDIĞI isim saklanır. Alan boşsa anahtar SİLİNİR (boş string
  // yazılmaz): boş kayıt, okuyan tarafta "isim yok" ile aynı anlama gelir ve yedek
  // (arkadaş kodu) devreye girer. Kodu isim olarak kaydetmek ismi kalıcı ezmişti.
  function saveName(v: string) {
    setName(v);
    try {
      const t = v.trim();
      if (t) localStorage.setItem(NAME_KEY, t);
      else localStorage.removeItem(NAME_KEY);
    } catch {
      /* geç */
    }
    setNameMsg(v.trim() ? "✓ Kaydedildi" : "");
    window.setTimeout(() => setNameMsg(""), 1500);
  }

  function resetProgress() {
    try {
      // Önce topla, SONRA sil: silerken indeksler kayar, aynı döngüde silmek anahtar atlatır.
      const rm: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith("blackout_") && !KEEP_KEYS.has(k)) rm.push(k);
      }
      for (const k of rm) localStorage.removeItem(k);
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
      // SADECE kayıtlı ismi göster. Kod artık kaydedilmez, yalnız yer tutucu olarak
      // görünür (aşağıdaki input'un placeholder'ı) — eskiden buraya yazılan kod,
      // seçilmiş isimden ayırt edilemediği için ismi kalıcı olarak eziyordu.
      const saved = (localStorage.getItem(NAME_KEY) || "").trim();
      setName(saved === "Ev sahibi" || saved === "Oyuncu" ? "" : saved);
    } catch {
      /* geç */
    }
  }, []);

  function changeVol(v: number) {
    setVol(v);
    sound.resume();
    sound.setVolume(v / 100);
  }
  // Ses aç/kapa TEK anahtar: kapalı = sus; açık = müzik + efektler birlikte açık.
  function toggleSound() {
    const m = !muted;
    setMuted(m);
    sound.setMuted(m);
    if (!m) {
      // sesi açtı → müzik de açık olsun
      sound.resume();
      setMusic(true);
      sound.setMusic(true);
    }
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
            placeholder={getMyCode()}
            maxLength={8}
          />
          <div className="field-d">
            Boş bırakırsan <b style={{ color: "var(--gold)" }}>arkadaş kodun</b> ({getMyCode()}) görünür.
            Çok oyunculuda ve arkadaş listende bu isim görünür.
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

          {/* Ses aç/kapa — TEK anahtar (müzik + efektler birlikte) */}
          <div className="field-row" style={{ marginTop: 18 }}>
            <span className="field-t">Ses</span>
            <button className={"toggle" + (!muted ? " is-on" : "")} onClick={toggleSound}>
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
                açılan sırlar, günlük sayfaları, başarımlar, en iyi skorlar ve <b>kaldığın bölüm</b>.
                {" "}<b>Geri alınamaz.</b> Adın, arkadaşların ve ses tercihlerin korunur.
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
