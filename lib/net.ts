// BLACKOUT online — Supabase Realtime "broadcast" ile oda yönetimi (2-6 oyuncu).
// Veritabanı yok. Herkes aynı kanala girer. HOST otoriterdir: katılanları bir
// ROSTER'da toplar (isimleriyle) ve periyodik yayınlar; oyunu "start" ile başlatır.
// TEKRAR DENEMELİ el sıkışma (periyodik "hello") ile kaçan mesaj sorunu olmaz.
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabaseClient";
import { getMyCode } from "./friends";

export type NetRole = "host" | "guest";
export type NetStatus =
  | "idle"
  | "connecting"
  | "connected" // odaya girildi (host: kanal hazır; guest: roster'da görünüyor)
  | "left" // host ayrıldı / oda kapandı
  | "error";

export type NetPlayer = { id: string; name: string; code?: string };

// Tüm oyun mesajları { t: tür, ... } biçiminde
export type NetMessage = { t: string; [k: string]: unknown };

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // karışması zor karakterler
const STALE_MS = 6000; // bu kadar süre "hello" gelmeyen oyuncu roster'dan düşer
const ROOM_CAP = 6; // en fazla oyuncu (online.ts MAX_PLAYERS ile aynı)

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
  name: string;
  status: NetStatus = "idle";
  id: string; // bu istemcinin benzersiz kimliği (herkese açık)

  onStatus: (s: NetStatus) => void = () => {};
  onMessage: (m: NetMessage, fromId: string) => void = () => {};
  onRoster: (players: NetPlayer[]) => void = () => {};
  onStart: (payload: { diff: string; order: string[]; names: string[]; themeSeed: number; level: unknown }) => void =
    () => {};

  private ch: RealtimeChannel | null = null;
  private started = false;
  fcode = getMyCode(); // bu istemcinin kalıcı arkadaş kodu (roster'da taşınır)
  // Host: kimlik -> {son görülme, isim, arkadaş kodu} (giriş sırası korunur)
  private roster = new Map<string, { seen: number; name: string; fcode?: string }>();
  private rosterPlayers: NetPlayer[] = []; // guest'in bildiği sıra+isimler (host'tan gelir)
  private hsTimer: number | null = null;
  private rosterTimer: number | null = null;

  constructor(code: string, role: NetRole, name: string) {
    this.code = code.toUpperCase();
    this.role = role;
    this.name = (name || "").trim() || (role === "host" ? "Ev sahibi" : "Oyuncu");
    this.id = role + "-" + Math.floor(Math.random() * 1e9).toString(36);
  }

  private set(s: NetStatus) {
    if (this.status === s) return;
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

    // El sıkışma / varlık (presence)
    ch.on("broadcast", { event: "hs" }, (p) => {
      const d = p.payload as { from: string; role?: NetRole; kind: string; name?: string; fcode?: string };
      if (!d || d.from === this.id) return;
      if (d.kind === "hello") {
        if (this.role === "host") {
          const isNew = !this.roster.has(d.from);
          if (isNew && this.roster.size >= ROOM_CAP) return; // oda dolu
          this.roster.set(d.from, { seen: Date.now(), name: d.name || "Oyuncu", fcode: d.fcode });
          if (isNew) this.broadcastRoster(); // yeni katılana hemen roster yolla
        }
      } else if (d.kind === "bye") {
        if (this.role === "host") {
          if (this.roster.delete(d.from)) this.broadcastRoster();
        } else {
          // host ayrıldıysa oda kapanır (lobide)
          if (this.rosterPlayers.length > 0 && d.from === this.rosterPlayers[0].id) {
            this.set("left");
          }
        }
      }
    });

    // Roster (host -> herkes)
    ch.on("broadcast", { event: "roster" }, (p) => {
      const d = p.payload as { players: NetPlayer[] };
      if (!d || this.role === "host") return;
      this.rosterPlayers = d.players;
      if (d.players.some((pl) => pl.id === this.id)) this.set("connected");
      this.onRoster(d.players);
    });

    // Başlat (host -> herkes)
    ch.on("broadcast", { event: "start" }, (p) => {
      const d = p.payload as { diff: string; order: string[]; names: string[]; themeSeed: number; level: unknown };
      if (!d || this.role === "host") return;
      this.started = true;
      this.stopTimers();
      this.onStart(d);
    });

    // Oyun mesajları
    ch.on("broadcast", { event: "m" }, (p) => {
      const d = p.payload as { from: string; msg: NetMessage };
      if (!d || d.from === this.id) return;
      this.onMessage(d.msg, d.from);
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        if (this.role === "host") {
          this.roster.set(this.id, { seen: Date.now(), name: this.name, fcode: this.fcode }); // host kendini ekler (sıra 0)
          this.set("connected");
          this.broadcastRoster();
          this.startRosterLoop();
        }
        this.startHandshake();
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        this.set("error");
      }
    });
  }

  // Periyodik "hello" — host katılanları toplar, guest varlığını+ismini bildirir.
  private startHandshake() {
    const tick = () => {
      if (this.started || !this.ch) return;
      this.sendHs("hello");
      this.hsTimer = window.setTimeout(tick, 1000);
    };
    tick();
  }

  // Host: eskiyen oyuncuları at + roster'ı düzenli yayınla (lobide).
  private startRosterLoop() {
    const tick = () => {
      if (this.started || !this.ch || this.role !== "host") return;
      const now = Date.now();
      let changed = false;
      for (const [id, v] of this.roster) {
        if (id !== this.id && now - v.seen > STALE_MS) {
          this.roster.delete(id);
          changed = true;
        }
      }
      this.broadcastRoster();
      if (changed) this.onRoster(this.getPlayers());
      this.rosterTimer = window.setTimeout(tick, 1500);
    };
    this.rosterTimer = window.setTimeout(tick, 1500);
  }

  private getPlayers(): NetPlayer[] {
    // Map giriş sırasını korur: host (sıra 0) önce, sonra katılanlar.
    return Array.from(this.roster.entries()).map(([id, v]) => ({ id, name: v.name, code: v.fcode }));
  }

  private broadcastRoster() {
    if (this.role !== "host") return;
    const players = this.getPlayers();
    this.ch?.send({ type: "broadcast", event: "roster", payload: { players } });
    this.onRoster(players);
  }

  private sendHs(kind: string) {
    this.ch?.send({
      type: "broadcast",
      event: "hs",
      payload: { from: this.id, role: this.role, kind, name: this.name, fcode: this.fcode },
    });
  }

  // Host oyunu başlatır: sıra + isimler + zorluk + tema + ilk seviye herkese yollanır.
  startGame(payload: { diff: string; level: unknown; themeSeed: number }) {
    if (this.role !== "host") return;
    this.started = true;
    this.stopTimers();
    const players = this.getPlayers();
    this.ch?.send({
      type: "broadcast",
      event: "start",
      payload: {
        ...payload,
        order: players.map((p) => p.id),
        names: players.map((p) => p.name),
      },
    });
  }

  // O anki oyuncular (seat = index): host roster'ından, guest son roster'dan.
  players(): NetPlayer[] {
    return this.role === "host" ? this.getPlayers() : this.rosterPlayers;
  }

  send(msg: NetMessage) {
    this.ch?.send({
      type: "broadcast",
      event: "m",
      payload: { from: this.id, msg },
    });
  }

  private stopTimers() {
    if (this.hsTimer) {
      window.clearTimeout(this.hsTimer);
      this.hsTimer = null;
    }
    if (this.rosterTimer) {
      window.clearTimeout(this.rosterTimer);
      this.rosterTimer = null;
    }
  }

  leave() {
    this.stopTimers();
    const ch = this.ch;
    this.ch = null;
    if (ch) {
      try {
        ch.send({
          type: "broadcast",
          event: "hs",
          payload: { from: this.id, role: this.role, kind: "bye", name: this.name },
        });
      } catch {
        /* yok say */
      }
      const client = getBrowserClient();
      client?.removeChannel(ch);
    }
  }
}
