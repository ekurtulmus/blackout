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
import { FRAGMENT_COUNT, FRAGMENTS, SECRET_ENDING, SECRET_ENDING_TITLE } from "@/lib/secrets";
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
  // Gizli fotoğraf parçaları (bölüm no listesi)
  const [fragments, setFragments] = useState<number[]>([]);

  // Kayıtlı ilerlemeyi yükle (tamamlanan görevler + en iyi süreler + gizli parçalar)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("blackout_missions_cleared");
      if (raw) setCleared(JSON.parse(raw));
      const best = localStorage.getItem("blackout_mission_best");
      if (best) setMissionBest(JSON.parse(best));
      const eb = localStorage.getItem("blackout_endless_best");
      if (eb) setEndlessBest(parseInt(eb, 10) || 0);
      const fr = localStorage.getItem("blackout_fragments");
      if (fr) setFragments(JSON.parse(fr));
    } catch {
      /* geç */
    }
  }, []);

  function saveFragment(lv: number) {
    setFragments((prev) => {
      if (prev.includes(lv)) return prev;
      const next = [...prev, lv].sort((a, b) => a - b);
      try {
        localStorage.setItem("blackout_fragments", JSON.stringify(next));
      } catch {
        /* geç */
      }
      return next;
    });
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
        withPhoto={!fragments.includes(level)}
        onFragment={() => saveFragment(level)}
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
    const all = fragments.length >= FRAGMENT_COUNT;
    return (
      <div className="screen">
        <div className="title" style={{ fontSize: "clamp(30px,8vw,56px)" }}>
          SIRLAR
        </div>
        <div className="subtitle">
          Bölümlere saklı <b style={{ color: "#efc987" }}>düğün fotoğrafı parçalarını</b> topla
          — <b>{fragments.length}/{FRAGMENT_COUNT}</b>. Hepsi gerçeği ortaya çıkarır.
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            width: "100%",
            maxWidth: 500,
            textAlign: "left",
          }}
        >
          {FRAGMENTS.map((txt, i) => {
            const got = fragments.includes(i + 1);
            return (
              <div
                key={i}
                className="how"
                style={{
                  margin: 0,
                  padding: "8px 12px",
                  opacity: got ? 1 : 0.5,
                  borderColor: got ? "rgba(239,201,135,0.4)" : undefined,
                }}
              >
                <b style={{ color: got ? "#efc987" : "var(--muted)" }}>
                  {got ? "📷" : "🔒"} Parça {i + 1}{" "}
                  <span style={{ fontSize: 11, opacity: 0.7 }}>(Bölüm {i + 1})</span>
                </b>
                <div style={{ fontSize: 13, marginTop: 3 }}>
                  {got ? txt : "??? — henüz bulunmadı"}
                </div>
              </div>
            );
          })}
        </div>

        {all && (
          <div
            className="how"
            style={{ maxWidth: 500, borderColor: "rgba(239,201,135,0.6)", lineHeight: 1.6 }}
          >
            <div className="title" style={{ fontSize: "clamp(22px,5vw,34px)", color: "#efc987" }}>
              {SECRET_ENDING_TITLE}
            </div>
            {SECRET_ENDING.map((line, i) => (
              <p key={i} style={{ margin: i === 0 ? "8px 0 0" : "8px 0 0" }}>
                {line}
              </p>
            ))}
          </div>
        )}

        <button className="btn btn-primary" onClick={() => setScreen("menu")}>
          ← Menü
        </button>
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
          GÖREV MODU
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
            Karanlık bir labirentte, elinde sadece zayıf bir el feneri.
            Yolunu keşfet, mermileri topla, seni avlayan <b>kanlı
            gelinlerden</b> kaç. Çıkış kilitli — yolunu açmak için{" "}
            <b>en az 1 gelini yok et</b>, sonra karanlıkta gizli çıkışı bul.
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
              ▶ Tek Kişilik
            </button>
            <button className="btn" onClick={() => setScreen("lobby")}>
              👥 Online Yarış (2-6)
            </button>
            <button className="btn" onClick={() => setScreen("missions")}>
              🎯 Görev Modu
            </button>
            <button className="btn" onClick={playEndless}>
              ♾️ Hayatta Kalma
            </button>
            <button className="btn" onClick={() => setScreen("secrets")}>
              📷 Sırlar {fragments.length > 0 ? `(${fragments.length}/${FRAGMENT_COUNT})` : ""}
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
            Yakalandın!
          </div>
          <div className="subtitle">
            Bir canını kaybettin. Bölüm {level} baştan başlıyor.
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
            Karanlıktan kaçtın. Skor: <b>{score}</b>
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
            OYUN BİTTİ
          </div>
          <div className="subtitle">
            Karanlık seni yuttu. Ulaştığın bölüm: <b>{level}</b> · Skor:{" "}
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
            KAÇTIN!
          </div>
          <div className="subtitle">
            {TOTAL_LEVELS} bölümün hepsini bitirdin ve karanlıktan tamamen
            kurtuldun. Final skorun: <b>{score}</b>
          </div>
          <button className="btn btn-primary" onClick={startNewGame}>
            Yeniden Oyna
          </button>
        </>
      )}

    </div>
  );
}
