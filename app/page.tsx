"use client";

import { useEffect, useRef, useState } from "react";
import Game, { type EndResult } from "@/components/Game";
import OnlineLobby from "@/components/OnlineLobby";
import OnlineGame from "@/components/OnlineGame";
import Settings from "@/components/Settings";
import { TOTAL_LEVELS } from "@/lib/levels";
import { sound } from "@/lib/audio";
import { randomThemeSeed } from "@/lib/themes";
import { INTRO_TITLE, INTRO_LINES, flavorForLevel } from "@/lib/story";
import { MISSIONS, ENDLESS } from "@/lib/missions";
import {
  SECRETS,
  SECRET_COUNT,
  MISSION_SECRET,
  SECRET_ENDING,
  SECRET_ENDING_TITLE,
} from "@/lib/secrets";
import type { Diff } from "@/lib/engine";
import type { NetRoom } from "@/lib/net";
import type { StartInfo } from "@/lib/online";

type Screen =
  | "menu"
  | "intro"
  | "ayarlar"
  | "missions"
  | "missionplay"
  | "missionresult"
  | "endlessplay"
  | "endlessresult"
  | "secrets"
  | "playing"
  | "dead"
  | "levelclear"
  | "gameover"
  | "win"
  | "lobby"
  | "onlinegame";

export default function Page() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [runId, setRunId] = useState(0);
  const [themeSeed, setThemeSeed] = useState(0); // her yeni oyunda rastgele
  const roomRef = useRef<NetRoom | null>(null);
  const [startInfo, setStartInfo] = useState<StartInfo | null>(null);
  // Görev modu
  const [missionIndex, setMissionIndex] = useState<number | null>(null);
  const [missionRunId, setMissionRunId] = useState(0);
  const [cleared, setCleared] = useState<number[]>([]);
  const [missionBest, setMissionBest] = useState<Record<number, number>>({});
  const [missionResult, setMissionResult] = useState<
    { ok: boolean; title: string; time: number; best: number; hasNext: boolean } | null
  >(null);
  // Sonsuz mod
  const [endlessRunId, setEndlessRunId] = useState(0);
  const [endlessBest, setEndlessBest] = useState(0);
  const [endlessResult, setEndlessResult] = useState<{ survived: number; best: number } | null>(null);
  // Sırlar (görev modundan açılır) — açılan sır indeksleri
  const [unlockedSecrets, setUnlockedSecrets] = useState<number[]>([]);
  const [openSecret, setOpenSecret] = useState<number | null>(null); // popup için
  // Tek kişilik zorluk
  const [spDiff, setSpDiff] = useState<Diff>("orta");

  // Kayıtlı ilerlemeyi yükle (tamamlanan görevler + en iyi süreler + sırlar + zorluk)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("blackout_missions_cleared");
      if (raw) setCleared(JSON.parse(raw));
      const best = localStorage.getItem("blackout_mission_best");
      if (best) setMissionBest(JSON.parse(best));
      const eb = localStorage.getItem("blackout_endless_best");
      if (eb) setEndlessBest(parseInt(eb, 10) || 0);
      const sec = localStorage.getItem("blackout_secrets");
      if (sec) setUnlockedSecrets(JSON.parse(sec));
      const sd = localStorage.getItem("blackout_sp_diff");
      if (sd === "kolay" || sd === "orta" || sd === "zor") setSpDiff(sd);
    } catch {
      /* geç */
    }
  }, []);

  function unlockSecret(missionId: number) {
    const idx = MISSION_SECRET[missionId];
    if (idx === undefined) return;
    setUnlockedSecrets((prev) => {
      if (prev.includes(idx)) return prev;
      const next = [...prev, idx];
      try {
        localStorage.setItem("blackout_secrets", JSON.stringify(next));
      } catch {
        /* geç */
      }
      return next;
    });
  }

  function chooseDiff(d: Diff) {
    setSpDiff(d);
    try {
      localStorage.setItem("blackout_sp_diff", d);
    } catch {
      /* geç */
    }
  }

  // Ses kilidi: ilk kullanıcı etkileşiminde (tarayıcı kuralı) sesi aç. BİR KEZ
  // açıldıktan sonra menü müziği ekranlar arası KESİNTİSİZ çalar (tekrar tıklama yok).
  const audioUnlocked = useRef(false);
  useEffect(() => {
    const unlock = () => {
      if (audioUnlocked.current) return;
      audioUnlocked.current = true;
      sound.resume();
      sound.revealMenuMusic();
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Menü/ekranlarda müzik çalsın; oyun ekranlarında dursun (oyun kendi sesini çalar).
  // Menü ekranları arası geçişte müziği DURDURMAYIZ — böylece kesintisiz akar.
  useEffect(() => {
    const inGame =
      screen === "playing" ||
      screen === "onlinegame" ||
      screen === "missionplay" ||
      screen === "endlessplay";
    if (inGame) {
      sound.stopMenuMusic();
      return;
    }
    // menü tarafı: ses açıldıysa doğrudan çal (tekrar tıklama gerektirmez),
    // açılmadıysa sessiz autoplay dene (ilk tıklamada yukarıdaki unlock açar)
    if (audioUnlocked.current) {
      sound.resume();
      sound.revealMenuMusic();
    } else {
      sound.primeMenuMusic();
    }
  }, [screen]);

  function play(lv: number, sc: number, lv3: number) {
    setLevel(lv);
    setScore(sc);
    setLives(lv3);
    setRunId((r) => r + 1);
    setScreen("playing");
  }

  function startNewGame() {
    setThemeSeed(randomThemeSeed()); // baştan başlayınca farklı temadan başla
    setScreen("intro"); // önce kısa hikaye girişi
  }

  function handleEnd(r: EndResult) {
    setScore(r.score);
    setLives(r.lives);
    setLevel(r.level);
    setScreen(r.status);
  }

  function playMission(i: number) {
    setMissionIndex(i);
    setMissionRunId((r) => r + 1);
    setScreen("missionplay");
  }

  function handleMissionEnd(r: EndResult) {
    const m = missionIndex != null ? MISSIONS[missionIndex] : null;
    const ok = r.status === "levelclear";
    const t = Math.floor(r.time ?? 0);
    let best = m ? missionBest[m.id] ?? 0 : 0;
    if (ok && m) {
      unlockSecret(m.id); // görev başarısı → karışık eşlemeyle bir sır aç
      // tamamlandı işaretle
      setCleared((prev) => {
        const next = prev.includes(m.id) ? prev : [...prev, m.id];
        try {
          localStorage.setItem("blackout_missions_cleared", JSON.stringify(next));
        } catch {
          /* geç */
        }
        return next;
      });
      // en iyi (en kısa) süre
      if (best === 0 || t < best) {
        best = t;
        setMissionBest((prev) => {
          const next = { ...prev, [m.id]: t };
          try {
            localStorage.setItem("blackout_mission_best", JSON.stringify(next));
          } catch {
            /* geç */
          }
          return next;
        });
      }
    }
    setMissionResult(
      m
        ? {
            ok,
            title: m.title,
            time: t,
            best,
            hasNext: missionIndex != null && missionIndex < MISSIONS.length - 1,
          }
        : null
    );
    setScreen("missionresult");
  }

  function playEndless() {
    setEndlessRunId((r) => r + 1);
    setScreen("endlessplay");
  }

  function handleEndlessEnd(r: EndResult) {
    const survived = Math.floor(r.time ?? r.score ?? 0);
    const best = Math.max(endlessBest, survived);
    if (best > endlessBest) {
      setEndlessBest(best);
      try {
        localStorage.setItem("blackout_endless_best", String(best));
      } catch {
        /* geç */
      }
    }
    setEndlessResult({ survived, best });
    setScreen("endlessresult");
  }

  function handleStarted(room: NetRoom, info: StartInfo) {
    roomRef.current = room;
    setStartInfo(info);
    setScreen("onlinegame");
  }

  function leaveOnline() {
    roomRef.current?.leave();
    roomRef.current = null;
    setStartInfo(null);
    setScreen("menu");
  }

  if (screen === "playing") {
    return (
      <Game
        key={runId}
        level={level}
        score={score}
        lives={lives}
        themeSeed={themeSeed}
        diff={spDiff}
        onEnd={handleEnd}
        onQuit={() => setScreen("menu")}
      />
    );
  }

  if (screen === "lobby") {
    return (
      <OnlineLobby onBack={() => setScreen("menu")} onStarted={handleStarted} />
    );
  }

  if (screen === "ayarlar") {
    return <Settings onBack={() => setScreen("menu")} />;
  }

  if (screen === "secrets") {
    const all = unlockedSecrets.length >= SECRET_COUNT;
    const sel = openSecret != null ? SECRETS[openSecret] : null;
    return (
      <div className="screen">
        <div className="title" style={{ fontSize: "clamp(30px,8vw,56px)" }}>
          SIRLAR
        </div>
        <div className="subtitle">
          <b style={{ color: "#efc987" }}>Görevleri tamamladıkça</b> gelinin hikâyesinden bir sır
          açılır — <b>{unlockedSecrets.length}/{SECRET_COUNT}</b>. Açık bir sırra tıkla, fotoğrafı gör.
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 10,
            width: "100%",
            maxWidth: 520,
          }}
        >
          {SECRETS.map((s, i) => {
            const got = unlockedSecrets.includes(i);
            return (
              <button
                key={s.id}
                className="how"
                onClick={() => got && setOpenSecret(i)}
                disabled={!got}
                style={{
                  margin: 0,
                  padding: 8,
                  cursor: got ? "pointer" : "default",
                  opacity: got ? 1 : 0.45,
                  borderColor: got ? "rgba(239,201,135,0.5)" : undefined,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <div
                  style={{
                    width: "100%",
                    aspectRatio: "4 / 3",
                    borderRadius: 4,
                    overflow: "hidden",
                    filter: got ? "none" : "grayscale(1) brightness(0.4)",
                    background: "#000",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {got ? (
                    <div
                      style={{ width: "100%", height: "100%" }}
                      dangerouslySetInnerHTML={{ __html: s.svg }}
                    />
                  ) : (
                    <span style={{ fontSize: 26, opacity: 0.6 }}>🔒</span>
                  )}
                </div>
                <b style={{ fontSize: 13, color: got ? "#efc987" : "var(--muted)" }}>
                  {got ? s.title : `Sır ${i + 1}`}
                </b>
              </button>
            );
          })}
        </div>

        {all && (
          <div
            className="how"
            style={{ maxWidth: 520, borderColor: "rgba(239,201,135,0.6)", lineHeight: 1.6 }}
          >
            <div className="title" style={{ fontSize: "clamp(22px,5vw,34px)", color: "#efc987" }}>
              {SECRET_ENDING_TITLE}
            </div>
            {SECRET_ENDING.map((line, i) => (
              <p key={i} style={{ margin: "8px 0 0" }}>
                {line}
              </p>
            ))}
          </div>
        )}

        <button className="btn btn-primary" onClick={() => setScreen("menu")}>
          ← Menü
        </button>

        {/* Sır popup'ı: fotoğraf + altında metin */}
        {sel && (
          <div
            className="screen"
            style={{ background: "rgba(0,0,0,0.88)", cursor: "pointer", padding: 20 }}
            onClick={() => setOpenSecret(null)}
          >
            <div
              className="how"
              onClick={(e) => e.stopPropagation()}
              style={{
                maxWidth: 440,
                cursor: "default",
                borderColor: "rgba(239,201,135,0.6)",
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  width: "100%",
                  maxWidth: 360,
                  margin: "0 auto 12px",
                  borderRadius: 6,
                  overflow: "hidden",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                dangerouslySetInnerHTML={{ __html: sel.svg }}
              />
              <div
                className="title"
                style={{ fontSize: "clamp(20px,5vw,30px)", color: "#efc987", marginBottom: 6 }}
              >
                {sel.title}
              </div>
              <p style={{ margin: 0 }}>{sel.text}</p>
              <button
                className="btn btn-primary"
                onClick={() => setOpenSecret(null)}
                style={{ marginTop: 14 }}
              >
                Kapat
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (screen === "missionplay" && missionIndex != null) {
    return (
      <Game
        key={`m${missionIndex}-${missionRunId}`}
        level={1}
        score={0}
        lives={3}
        themeSeed={missionIndex}
        mission={MISSIONS[missionIndex]}
        onEnd={handleMissionEnd}
        onQuit={() => setScreen("missions")}
      />
    );
  }

  if (screen === "endlessplay") {
    return (
      <Game
        key={`endless-${endlessRunId}`}
        level={1}
        score={0}
        lives={1}
        themeSeed={endlessRunId}
        mission={ENDLESS}
        onEnd={handleEndlessEnd}
        onQuit={() => setScreen("menu")}
      />
    );
  }

  if (screen === "endlessresult" && endlessResult) {
    const rec = endlessResult.survived >= endlessResult.best && endlessResult.survived > 0;
    return (
      <div className="screen">
        <div className="title" style={{ fontSize: "clamp(30px,8vw,56px)", color: "#ff9a3c" }}>
          DAYANAMADIN
        </div>
        <div className="subtitle" style={{ fontSize: "clamp(20px,5vw,30px)" }}>
          <b style={{ color: "#8be9ff" }}>{endlessResult.survived} saniye</b> hayatta kaldın
          {rec && <span style={{ color: "#7dffb0" }}> · yeni rekor! 🏆</span>}
        </div>
        <div className="subtitle">En iyi: <b style={{ color: "#7dffb0" }}>{endlessResult.best}s</b></div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <button className="btn btn-primary" onClick={playEndless}>↻ Tekrar Dene</button>
          <button className="btn" onClick={() => setScreen("menu")}>← Menü</button>
        </div>
      </div>
    );
  }

  if (screen === "missionresult" && missionResult) {
    const mr = missionResult;
    return (
      <div className="screen">
        <div
          className="title"
          style={{ fontSize: "clamp(30px,8vw,56px)", color: mr.ok ? "#7dffb0" : "#ff6b6b" }}
        >
          {mr.ok ? "GÖREV TAMAM 🏆" : "BAŞARISIZ"}
        </div>
        <div className="subtitle" style={{ fontSize: "clamp(18px,4.5vw,26px)" }}>
          {mr.title}
        </div>
        {mr.ok ? (
          <div className="subtitle">
            Süre: <b style={{ color: "#8be9ff" }}>{mr.time}s</b> · En iyi:{" "}
            <b style={{ color: "#7dffb0" }}>{mr.best}s</b>
          </div>
        ) : (
          <div className="subtitle" style={{ opacity: 0.8 }}>
            Karanlık seni yuttu. Tekrar dene.
          </div>
        )}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          {mr.ok && mr.hasNext && missionIndex != null && (
            <button className="btn btn-primary" onClick={() => playMission(missionIndex + 1)}>
              Sonraki Görev →
            </button>
          )}
          {!mr.ok && missionIndex != null && (
            <button className="btn btn-primary" onClick={() => playMission(missionIndex)}>
              ↻ Tekrar Dene
            </button>
          )}
          <button className="btn" onClick={() => setScreen("missions")}>
            Görev Listesi
          </button>
        </div>
      </div>
    );
  }

  if (screen === "missions") {
    return (
      <div className="screen">
        <div className="title" style={{ fontSize: "clamp(32px,8vw,60px)" }}>
          KARANLIK GÖREVLER
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            width: "100%",
            maxWidth: 460,
          }}
        >
          {MISSIONS.map((m, i) => {
            const done = cleared.includes(m.id);
            return (
              <button
                key={m.id}
                className="btn"
                onClick={() => playMission(i)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  textAlign: "left",
                  gap: 12,
                  borderColor: done ? "rgba(125,255,176,0.5)" : undefined,
                }}
              >
                <span>
                  <b>{m.id}. {m.title}</b>
                  <span style={{ display: "block", fontSize: 12, opacity: 0.7 }}>
                    {m.objectiveHint}
                    {missionBest[m.id] ? ` · en iyi ${missionBest[m.id]}s` : ""}
                  </span>
                </span>
                <span style={{ color: done ? "#7dffb0" : "var(--muted)", fontSize: 20 }}>
                  {done ? "✓" : "▶"}
                </span>
              </button>
            );
          })}
        </div>
        <button className="btn" onClick={() => setScreen("menu")} style={{ opacity: 0.7 }}>
          ← Menü
        </button>
      </div>
    );
  }

  if (screen === "onlinegame" && roomRef.current && startInfo) {
    return (
      <OnlineGame
        room={roomRef.current}
        info={startInfo}
        onExit={leaveOnline}
      />
    );
  }

  return (
    <div className="screen">
      {screen === "menu" && (
        <>
          <div className="title">BLACKOUT</div>
          <div className="subtitle">
            Zifiri bir labirentte uyanıyorsun; elinde titrek bir el feneri.
            Kanlı yüzlü <b>gelinler</b> seni çoktan duydu. Yolunu yokla,
            mermileri topla, nefesini tut. Çıkış mühürlü — açmak için{" "}
            <b>en az birini sustur</b>, sonra karanlıkta gizli kapıyı bul.
            Yakalanırsan geri dönüşü yok.
          </div>
          <div className="how">
            <b>Nasıl Oynanır</b>
            <br />• Hareket: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>{" "}
            veya ok tuşları
            <br />• Ateş: <kbd>Boşluk</kbd> — gittiğin yöne ateş eder
            <br />• Yerdeki parlayan <b>mermileri</b> topla (sınırlı!)
            <br />• En az 1 <b>gelini</b> yok edince <b>çıkış açılır</b>
            <br />• Yeşil parlayan <b>kapıyı</b> bul ve ulaş → sonraki bölüm
            <br />• <b>3 can</b> hakkın var. Gelin teması can barını düşürür.
            <br />• Toplam <b>{TOTAL_LEVELS} bölüm</b> — gittikçe zorlaşır.
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={startNewGame}>
              🕯️ Yalnız Kaçış
            </button>
            <button className="btn" onClick={() => setScreen("lobby")}>
              💀 Ölüm Yarışı (2-6)
            </button>
            <button className="btn" onClick={() => setScreen("missions")}>
              🩸 Karanlık Görevler
            </button>
            <button className="btn" onClick={playEndless}>
              🌑 Bitmeyen Gece
            </button>
            <button className="btn" onClick={() => setScreen("secrets")}>
              📷 Sırlar{" "}
              {unlockedSecrets.length > 0 ? `(${unlockedSecrets.length}/${SECRET_COUNT})` : ""}
            </button>
            <button className="btn" onClick={() => setScreen("ayarlar")}>
              ⚙ Ayarlar
            </button>
          </div>
        </>
      )}

      {screen === "intro" && (
        <>
          <div className="title" style={{ fontSize: "clamp(32px,8vw,60px)" }}>
            {INTRO_TITLE}
          </div>
          <div className="how" style={{ textAlign: "left", lineHeight: 1.6 }}>
            {INTRO_LINES.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? 0 : "10px 0 0" }}>
                {line}
              </p>
            ))}
          </div>
          <div>
            <div className="subtitle" style={{ marginBottom: 8 }}>Zorluk</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              {([
                { key: "kolay", label: "Kolay", desc: "az/yavaş gelin" },
                { key: "orta", label: "Orta", desc: "dengeli" },
                { key: "zor", label: "Zor", desc: "çok/hızlı gelin, dar görüş" },
              ] as { key: Diff; label: string; desc: string }[]).map((d) => (
                <button
                  key={d.key}
                  className={"btn" + (spDiff === d.key ? " btn-primary" : "")}
                  onClick={() => chooseDiff(d.key)}
                  style={{ opacity: spDiff === d.key ? 1 : 0.7 }}
                >
                  {d.label}
                  <span style={{ display: "block", fontSize: 12, opacity: 0.7 }}>{d.desc}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={() => play(1, 0, 3)}>
              Karanlığa Gir →
            </button>
            <button className="btn" onClick={() => setScreen("menu")} style={{ opacity: 0.7 }}>
              ← Menü
            </button>
          </div>
        </>
      )}

      {screen === "dead" && (
        <>
          <div className="big" style={{ color: "#ff6b6b" }}>
            SENİ BULDULAR
          </div>
          <div className="subtitle">
            Soğuk eller ensende… bir canın söndü. Bölüm {level} yeniden başlıyor.
            <br />
            Kalan can: {"♥".repeat(lives)}
          </div>
          <button className="btn btn-primary" onClick={() => play(level, score, lives)}>
            Tekrar Dene
          </button>
        </>
      )}

      {screen === "levelclear" && (
        <>
          <div className="big" style={{ color: "#6ee7ff" }}>
            Bölüm {level} Tamamlandı
          </div>
          <div className="subtitle" style={{ fontStyle: "italic", color: "#c9b8d0" }}>
            “{flavorForLevel(level)}”
          </div>
          <div className="subtitle">
            Bu koridordan sağ çıktın… ama fısıltılar peşinde. Skor: <b>{score}</b>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => play(level + 1, score, lives)}
          >
            Sonraki Bölüm →
          </button>
        </>
      )}

      {screen === "gameover" && (
        <>
          <div className="title" style={{ fontSize: "clamp(36px,10vw,72px)" }}>
            KARANLIK KAZANDI
          </div>
          <div className="subtitle">
            Gelinlerin arasında kayboldun. Son bölüm: <b>{level}</b> · Skor:{" "}
            <b>{score}</b>
          </div>
          <button className="btn btn-primary" onClick={startNewGame}>
            Baştan Başla
          </button>
        </>
      )}

      {screen === "win" && (
        <>
          <div className="title" style={{ color: "#7dffb0" }}>
            GÜN AĞARDI
          </div>
          <div className="subtitle">
            {TOTAL_LEVELS} bölümün karanlığından da sağ çıktın. Gelinler geride
            kaldı — şimdilik. Final skorun: <b>{score}</b>
          </div>
          <button className="btn btn-primary" onClick={startNewGame}>
            Yeniden Oyna
          </button>
        </>
      )}

    </div>
  );
}
