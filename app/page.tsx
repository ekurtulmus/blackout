"use client";

import { useState } from "react";
import Game, { type EndResult } from "@/components/Game";
import { TOTAL_LEVELS } from "@/lib/levels";

type Screen =
  | "menu"
  | "playing"
  | "dead"
  | "levelclear"
  | "gameover"
  | "win";

export default function Page() {
  const [screen, setScreen] = useState<Screen>("menu");
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [runId, setRunId] = useState(0);

  function play(lv: number, sc: number, lv3: number) {
    setLevel(lv);
    setScore(sc);
    setLives(lv3);
    setRunId((r) => r + 1);
    setScreen("playing");
  }

  function startNewGame() {
    play(1, 0, 3);
  }

  function handleEnd(r: EndResult) {
    setScore(r.score);
    setLives(r.lives);
    setLevel(r.level);
    setScreen(r.status);
  }

  if (screen === "playing") {
    return (
      <Game
        key={runId}
        level={level}
        score={score}
        lives={lives}
        onEnd={handleEnd}
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
            Yolunu keşfet, mermileri topla, seni avlayan zombilerden kaç.
            Çıkış kilitli — yolunu açmak için <b>en az 1 zombi öldür</b>, sonra
            karanlıkta gizli çıkışı bul.
          </div>
          <div className="how">
            <b>Nasıl Oynanır</b>
            <br />• Hareket: <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd>{" "}
            veya ok tuşları
            <br />• Ateş: <kbd>Boşluk</kbd> — gittiğin yöne ateş eder
            <br />• Yerdeki parlayan <b>mermileri</b> topla (sınırlı!)
            <br />• En az 1 zombi öldürünce <b>çıkış açılır</b>
            <br />• Yeşil parlayan <b>kapıyı</b> bul ve ulaş → sonraki bölüm
            <br />• <b>3 can</b> hakkın var. Zombi teması can barını düşürür.
            <br />• Toplam <b>{TOTAL_LEVELS} bölüm</b> — gittikçe zorlaşır.
          </div>
          <button className="btn btn-primary" onClick={startNewGame}>
            ▶ Oyna
          </button>
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
