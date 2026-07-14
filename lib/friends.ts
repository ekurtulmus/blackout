// BLACKOUT — arkadaş sistemi (hesapsız). Her cihaza kalıcı bir ARKADAŞ KODU verilir
// (localStorage). Arkadaşını koduyla eklersin (yerel liste). Global bir Supabase
// "broadcast" kanalı (blackout:friends) üzerinden PRESENCE (kim çevrimiçi) + DAVET
// (arkadaşını odana çağır) çalışır. Veritabanı yok; NetRoom ile aynı desen.
"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "./supabaseClient";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const UID_KEY = "blackout_uid";
const FRIENDS_KEY = "blackout_friends";
const NAME_KEY = "blackout_name";
const ONLINE_MS = 7000; // bu süre içinde "here" gelen arkadaş çevrimiçi sayılır

export type Friend = { code: string; name: string };

function randomCode(len = 6): string {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

// Bu cihazın kalıcı arkadaş kodu (yoksa üretilir)
export function getMyCode(): string {
  try {
    let c = localStorage.getItem(UID_KEY);
    if (!c) {
      c = randomCode(6);
      localStorage.setItem(UID_KEY, c);
    }
    return c;
  } catch {
    return "AAAAAA";
  }
}

export function getMyName(): string {
  try {
    return localStorage.getItem(NAME_KEY) || "Oyuncu";
  } catch {
    return "Oyuncu";
  }
}

export function getFriends(): Friend[] {
  try {
    const v = localStorage.getItem(FRIENDS_KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return [];
}

function saveFriends(list: Friend[]) {
  try {
    localStorage.setItem(FRIENDS_KEY, JSON.stringify(list));
  } catch {
    /* geç */
  }
}

// Arkadaş ekle. { ok, reason } döner.
export function addFriend(code: string, name?: string): { ok: boolean; reason?: string } {
  const c = code.trim().toUpperCase();
  if (c.length < 4) return { ok: false, reason: "Geçersiz kod" };
  if (c === getMyCode()) return { ok: false, reason: "Bu senin kendi kodun" };
  const list = getFriends();
  if (list.some((f) => f.code === c)) return { ok: false, reason: "Zaten ekli" };
  list.push({ code: c, name: (name || "").trim() || c });
  saveFriends(list);
  return { ok: true };
}

export function removeFriend(code: string) {
  saveFriends(getFriends().filter((f) => f.code !== code));
}

export function renameFriend(code: string, name: string) {
  const list = getFriends();
  const f = list.find((x) => x.code === code);
  if (f) {
    f.name = name.trim() || f.code;
    saveFriends(list);
  }
}

export type FriendInvite = { fromCode: string; fromName: string; room: string };

// Global presence + davet kanalı. Menü açıkken sürekli çalışır (davetleri yakalar).
export class FriendPresence {
  private ch: RealtimeChannel | null = null;
  private hbTimer: number | null = null;
  private online = new Map<string, number>(); // code -> son görülme (ms)
  code = getMyCode();
  name = getMyName();

  onPresence: () => void = () => {}; // çevrimiçi liste değişince
  onInvite: (inv: FriendInvite) => void = () => {}; // bana davet geldi
  onFriendRequest: (req: { fromCode: string; fromName: string }) => void = () => {}; // arkadaşlık isteği geldi
  onRequestAccepted: (name: string) => void = () => {}; // isteğim kabul edildi

  start() {
    if (this.ch) return;
    const client = getBrowserClient();
    if (!client) return;
    this.name = getMyName();
    const ch = client.channel("blackout:friends", {
      config: { broadcast: { self: false, ack: false } },
    });
    this.ch = ch;

    // "here": çevrimiçi kalp atışı (kim online)
    ch.on("broadcast", { event: "here" }, (p) => {
      const d = p.payload as { code: string; name: string };
      if (!d || d.code === this.code) return;
      const known = this.online.has(d.code);
      this.online.set(d.code, Date.now());
      if (!known) this.onPresence();
    });

    // "invite": bana odaya davet
    ch.on("broadcast", { event: "invite" }, (p) => {
      const d = p.payload as FriendInvite & { to: string };
      if (!d || d.to !== this.code) return;
      this.onInvite({ fromCode: d.fromCode, fromName: d.fromName, room: d.room });
    });

    // "freq": bana arkadaşlık isteği geldi
    ch.on("broadcast", { event: "freq" }, (p) => {
      const d = p.payload as { to: string; fromCode: string; fromName: string };
      if (!d || d.to !== this.code) return;
      // zaten arkadaşsa yok say
      if (getFriends().some((f) => f.code === d.fromCode)) return;
      this.onFriendRequest({ fromCode: d.fromCode, fromName: d.fromName });
    });

    // "faccept": isteğim kabul edildi → ben de karşı tarafı ekliyorum
    ch.on("broadcast", { event: "faccept" }, (p) => {
      const d = p.payload as { to: string; fromCode: string; fromName: string };
      if (!d || d.to !== this.code) return;
      addFriend(d.fromCode, d.fromName);
      this.onRequestAccepted(d.fromName);
      this.onPresence();
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        this.beat();
        this.hbTimer = window.setInterval(() => {
          this.beat();
          // eskiyenleri düş
          const now = Date.now();
          let changed = false;
          for (const [c, t] of this.online) {
            if (now - t > ONLINE_MS) {
              this.online.delete(c);
              changed = true;
            }
          }
          if (changed) this.onPresence();
        }, 3000);
      }
    });
  }

  private beat() {
    this.name = getMyName();
    this.ch?.send({ type: "broadcast", event: "here", payload: { code: this.code, name: this.name } });
  }

  isOnline(code: string): boolean {
    const t = this.online.get(code);
    return t !== undefined && Date.now() - t <= ONLINE_MS;
  }

  // Bir arkadaşı odana davet et
  invite(toCode: string, room: string) {
    this.ch?.send({
      type: "broadcast",
      event: "invite",
      payload: { to: toCode, fromCode: this.code, fromName: getMyName(), room },
    });
  }

  // Arkadaşlık isteği gönder (karşı taraf çevrimiçiyse ulaşır)
  sendRequest(toCode: string) {
    this.ch?.send({
      type: "broadcast",
      event: "freq",
      payload: { to: toCode.toUpperCase(), fromCode: this.code, fromName: getMyName() },
    });
  }

  // Gelen isteği kabul et: ben karşı tarafı eklerim + ona "kabul" yollarım (o da beni ekler)
  acceptRequest(fromCode: string, fromName: string) {
    addFriend(fromCode, fromName);
    this.ch?.send({
      type: "broadcast",
      event: "faccept",
      payload: { to: fromCode, fromCode: this.code, fromName: getMyName() },
    });
  }

  stop() {
    if (this.hbTimer) {
      window.clearInterval(this.hbTimer);
      this.hbTimer = null;
    }
    const ch = this.ch;
    this.ch = null;
    if (ch) {
      const client = getBrowserClient();
      client?.removeChannel(ch);
    }
  }
}
