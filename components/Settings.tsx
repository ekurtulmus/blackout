"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/audio";
import { getMyCode } from "@/lib/friends";
import { wipeProgress } from "@/lib/progress";
import { useLang, useT } from "@/lib/i18n";
import { LANGS, LANG_META } from "@/lib/i18n/langs";
import Icon from "@/components/Icon";

// Sıfırlama kuralı + korunan anahtarlar TEK KAYNAKTA: lib/progress.ts
// (app/page.tsx'teki tek-seferlik sürüm sıfırlaması da aynı fonksiyonu kullanır).

const NAME_KEY = "blackout_name";

export default function Settings({ onBack }: { onBack: () => void }) {
  const t = useT();
  const { lang, setLang } = useLang();
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
    setNameMsg(v.trim() ? t("settings.name.saved") : "");
    window.setTimeout(() => setNameMsg(""), 1500);
  }

  function resetProgress() {
    wipeProgress();
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
        <div className="scr-eyebrow">{t("settings.eyebrow")}</div>
        <h2 className="scr-title">{t("settings.title")}</h2>
      </div>

      <div className="scr-body" style={{ maxWidth: 760, display: "flex", flexDirection: "column", gap: 12 }}>
        {/* DİL — en üstte: oyunu anlamadığı dilde açan biri ilk bunu bulmalı.
            Diller KENDİ adlarıyla yazılır ("Русский"), yoksa o dilin oyuncusu tanıyamaz. */}
        <div className="panel">
          <div className="field-row">
            <span className="field-t">{t("lang.title")}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            {LANGS.map((l) => (
              <button
                key={l}
                className={"toggle" + (lang === l ? " is-on" : "")}
                onClick={() => setLang(l)}
                lang={l}
                aria-pressed={lang === l}
              >
                <span aria-hidden="true">{LANG_META[l].flag}</span>
                {LANG_META[l].native}
              </button>
            ))}
          </div>
          <div className="field-d" style={{ marginTop: 12 }}>{t("lang.desc")}</div>
        </div>

        {/* Kalıcı oyuncu adı */}
        <div className="panel">
          <div className="field-row">
            <span className="field-t">{t("settings.name")}</span>
            <span style={{ color: "var(--ok-text)", fontSize: 13 }}>{nameMsg}</span>
          </div>
          <input
            className="field-input"
            value={name}
            onChange={(e) => saveName(e.target.value.slice(0, 8))}
            placeholder={getMyCode()}
            maxLength={8}
          />
          <div className="field-d">{t("settings.name.desc", { code: getMyCode() })}</div>
        </div>

        {/* Ses */}
        <div className="panel">
          <div className="field-row">
            <span className="field-t">{t("settings.volume")}</span>
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
            <span className="field-t">{t("settings.sound")}</span>
            <button className={"toggle" + (!muted ? " is-on" : "")} onClick={toggleSound}>
              <Icon name={muted ? "mute" : "music"} size={14} />
              {muted ? t("settings.off") : t("settings.on")}
            </button>
          </div>

          <div className="field-d" style={{ marginTop: 16 }}>{t("settings.hint")}</div>
        </div>

        {/* Tehlikeli bölge */}
        <div className="panel" style={{ borderColor: "rgba(255,90,90,0.4)", borderTop: "2px solid var(--blood)" }}>
          <div className="field-t" style={{ color: "var(--danger-text)", display: "inline-flex", alignItems: "center", gap: 7 }}>
            <Icon name="warn" size={16} /> {t("settings.reset.title")}
          </div>
          {!confirmReset ? (
            <>
              <div className="field-d" style={{ marginTop: 8 }}>{t("settings.reset.desc")}</div>
              <button className="danger-btn" onClick={() => setConfirmReset(true)}>{t("settings.reset.btn")}</button>
            </>
          ) : (
            <>
              <div style={{ marginTop: 8, fontSize: 14, color: "var(--warn-text)", lineHeight: 1.5, fontWeight: 700 }}>
                {t("settings.reset.confirm")}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
                <button className="danger-btn is-solid" onClick={resetProgress}>{t("settings.reset.yes")}</button>
                <button className="mm-ghost" onClick={() => setConfirmReset(false)}>{t("settings.reset.cancel")}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
