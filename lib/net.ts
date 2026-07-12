// BLACKOUT online — Supabase Realtime "broadcast" ile oda yönetimi.
// Veritabanı yok. İki oyuncu aynı kanala girer; TEKRAR DENEMELİ el sıkışma
// (her 0.5 sn "hello") ile birbirini garantili bulur — kaçan mesaj sorunu olmaz.
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabaseClient";

export type NetRole = "host" | "guest";
export type NetStatus =
  | "idle"
  | "connecting"
  | "waiting" // host: rakip bekleniyor
  | "connected"
  | "left" // rakip ayrıldı
  | "error";

// Tüm oyun mesajları { t: tür, ... } biçiminde
export type NetMessage = { t: string; [k: string]: unknown };

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // karışması zor karakterler

export function generateRoomCode(len = 4): string {
  let s = "";
  for (let i = 0; i < len; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

export class NetRoom {
  code: string;
  role: NetRole;
  status: NetStatus = "idle";
  onStatus: (s: NetStatus) => void = () => {};
  onMessage: (m: NetMessage, fromRole: NetRole) => void = () => {};

  private ch: RealtimeChannel | null = null;
  private id: string;
  private peerId: string | null = null;
  private connectedOnce = false;
  private hsTimer: number | null = null;

  constructor(code: string, role: NetRole) {
    this.code = code.toUpperCase();
    this.role = role;
    this.id = role + "-" + Math.floor(Math.random() * 1e9).toString(36);
  }

  private set(s: NetStatus) {
    this.status = s;
    this.onStatus(s);
  }

  connect() {
    const client = getBrowserClient();
    if (!client) {
      this.set("error");
      return;
    }
    this.set("connecting");

    const ch = client.channel(`blackout:${this.code}`, {
      config: { broadcast: { self: false, ack: false } },
    });
    this.ch = ch;

    // El sıkışma mesajları
    ch.on("broadcast", { event: "hs" }, (p) => {
      const d = p.payload as { from: string; kind: string };
      if (!d || d.from === this.id) return;
      this.peerId = d.from;
      if (d.kind === "hello") {
        this.markConnected();
        this.sendHs("welcome"); // her hello'ya welcome ile karşılık ver
      } else if (d.kind === "welcome") {
        this.markConnected();
      } else if (d.kind === "bye") {
        if (this.connectedOnce) this.set("left");
      }
    });

    // Oyun mesajları (Faz 2+)
    ch.on("broadcast", { event: "m" }, (p) => {
      const d = p.payload as { from: string; msg: NetMessage };
      if (!d || d.from === this.id) return;
      const fromRole: NetRole = d.from.startsWith("host") ? "host" : "guest";
      this.onMessage(d.msg, fromRole);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (this.role === "host") this.set("waiting");
        this.startHandshake();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.set("error");
      }
    });
  }

  // İki taraf da bağlanana kadar periyodik "hello" atar (kaçan mesajı telafi eder)
  private startHandshake() {
    let tries = 0;
    const tick = () => {
      if (this.connectedOnce || !this.ch) return;
      this.sendHs("hello");
      tries++;
      if (tries < 40) {
        this.hsTimer = window.setTimeout(tick, 500); // ~20 sn dene
      }
    };
    tick();
  }

  private sendHs(kind: string) {
    this.ch?.send({
      type: "broadcast",
      event: "hs",
      payload: { from: this.id, kind },
    });
  }

  private markConnected() {
    if (this.connectedOnce) return;
    this.connectedOnce = true;
    if (this.hsTimer) {
      window.clearTimeout(this.hsTimer);
      this.hsTimer = null;
    }
    this.set("connected");
    this.sendHs("welcome"); // karşının da bağlanmasını sağlamlaştır
  }

  send(msg: NetMessage) {
    this.ch?.send({
      type: "broadcast",
      event: "m",
      payload: { from: this.id, msg },
    });
  }

  leave() {
    if (this.hsTimer) {
      window.clearTimeout(this.hsTimer);
      this.hsTimer = null;
    }
    const ch = this.ch;
    this.ch = null;
    if (ch) {
      try {
        ch.send({
          type: "broadcast",
          event: "hs",
          payload: { from: this.id, kind: "bye" },
        });
      } catch {
        /* yok say */
      }
      const client = getBrowserClient();
      client?.removeChannel(ch);
    }
  }
}
