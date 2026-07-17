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

// Görünen ad: kullanıcı isim yazdıysa o, yazmadıysa arkadaş kodu.
// Yedek OKUMA anında uygulanır — kod localStorage'a İSİM olarak YAZILMAZ; yazılırsa
// seçilmiş isimden ayırt edilemez ve kullanıcının ismini kalıcı olarak ezer.
export function getMyName(): string {
  try {
    return (localStorage.getItem(NAME_KEY) || "").trim() || getMyCode();
  } catch {
    return getMyCode();
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

// --- GELEN ARKADAŞLIK İSTEKLERİ (kalıcı) ---
// Popup yalnız 5 sn görünür; kaçırılan istek KAYBOLMASIN diye burada saklanır ve
// Arkadaşlar ekranında beklemeye devam eder.
export type IncomingReq = { code: string; name: string; at: number };
const REQ_IN_KEY = "blackout_freq_in";

export function getIncomingRequests(): IncomingReq[] {
  try {
    const v = localStorage.getItem(REQ_IN_KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return [];
}
function saveIncoming(list: IncomingReq[]) {
  try {
    localStorage.setItem(REQ_IN_KEY, JSON.stringify(list));
  } catch {
    /* geç */
  }
}
// İsteği kaydet (zaten arkadaşsa ya da tekrar geldiyse yoksay)
export function addIncomingRequest(code: string, name: string, at: number) {
  const c = code.trim().toUpperCase();
  if (!c || c === getMyCode()) return;
  if (getFriends().some((f) => f.code === c)) return;
  const list = getIncomingRequests();
  if (list.some((r) => r.code === c)) return;
  list.push({ code: c, name: (name || "").trim() || c, at });
  saveIncoming(list);
}
export function removeIncomingRequest(code: string) {
  saveIncoming(getIncomingRequests().filter((r) => r.code !== code.trim().toUpperCase()));
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

// --- Gönderilen arkadaşlık istekleri (KALICI): kabul/silinene kadar durur ---
const SENT_KEY = "blackout_sent";
export function getSentRequests(): string[] {
  try {
    const v = localStorage.getItem(SENT_KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return [];
}
export function isSent(code: string): boolean {
  return getSentRequests().includes(code.toUpperCase());
}
function saveSent(list: string[]) {
  try {
    localStorage.setItem(SENT_KEY, JSON.stringify(list));
  } catch {
    /* geç */
  }
}
export function markSent(code: string) {
  const c = code.toUpperCase();
  const list = getSentRequests();
  if (!list.includes(c)) saveSent([...list, c]);
}
export function clearSent(code: string) {
  saveSent(getSentRequests().filter((c) => c !== code.toUpperCase()));
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
  private players = new Map<string, { name: string; t: number }>(); // TÜM çevrimiçi oyuncular (code -> ad)
  private rooms = new Map<string, { hostName: string; hostCode: string; count: number; t: number }>(); // açık odalar
  private myRoom: { code: string; count: number } | null = null; // duyurduğum oda (host isem)
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

    // "here": çevrimiçi kalp atışı (kim online + adı)
    ch.on("broadcast", { event: "here" }, (p) => {
      const d = p.payload as { code: string; name: string };
      if (!d || d.code === this.code) return;
      const known = this.online.has(d.code);
      this.online.set(d.code, Date.now());
      this.players.set(d.code, { name: d.name || d.code, t: Date.now() });
      if (!known) this.onPresence();
    });

    // "room": açık bir oyun odası duyurusu (host yayınlar)
    ch.on("broadcast", { event: "room" }, (p) => {
      const d = p.payload as { code: string; hostName: string; hostCode: string; count: number };
      if (!d || !d.code || d.hostCode === this.code) return;
      this.rooms.set(d.code, { hostName: d.hostName || "Oyuncu", hostCode: d.hostCode, count: d.count ?? 1, t: Date.now() });
      this.onPresence();
    });
    // "roomclose": oda kapandı
    ch.on("broadcast", { event: "roomclose" }, (p) => {
      const d = p.payload as { code: string };
      if (d?.code && this.rooms.delete(d.code)) this.onPresence();
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
      clearSent(d.fromCode); // istek tamamlandı → "gönderildi" işaretini kaldır
      addFriend(d.fromCode, d.fromName);
      this.onRequestAccepted(d.fromName);
      this.onPresence();
    });

    // "unfriend": karşı taraf beni arkadaşlıktan çıkardı → ben de onu silerim
    ch.on("broadcast", { event: "unfriend" }, (p) => {
      const d = p.payload as { to: string; fromCode: string };
      if (!d || d.to !== this.code) return;
      removeFriend(d.fromCode);
      this.onPresence();
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        this.beat();
        this.hbTimer = window.setInterval(() => {
          this.beat();
          // eskiyenleri düş (online / oyuncular / odalar)
          const now = Date.now();
          let changed = false;
          for (const [c, t] of this.online) if (now - t > ONLINE_MS) { this.online.delete(c); changed = true; }
          for (const [c, v] of this.players) if (now - v.t > ONLINE_MS) { this.players.delete(c); changed = true; }
          for (const [c, v] of this.rooms) if (now - v.t > ONLINE_MS) { this.rooms.delete(c); changed = true; }
          if (changed) this.onPresence();
        }, 3000);
      }
    });
  }

  private beat() {
    this.name = getMyName();
    this.ch?.send({ type: "broadcast", event: "here", payload: { code: this.code, name: this.name } });
    if (this.myRoom) {
      this.ch?.send({
        type: "broadcast",
        event: "room",
        payload: { code: this.myRoom.code, hostName: getMyName(), hostCode: this.code, count: this.myRoom.count },
      });
    }
  }

  isOnline(code: string): boolean {
    const t = this.online.get(code);
    return t !== undefined && Date.now() - t <= ONLINE_MS;
  }

  // Online ekranı: tüm çevrimiçi oyuncular (kendisi hariç) — {code, name}
  getOnlinePlayers(): { code: string; name: string }[] {
    const now = Date.now();
    return Array.from(this.players.entries())
      .filter(([, v]) => now - v.t <= ONLINE_MS)
      .map(([code, v]) => ({ code, name: v.name }));
  }

  // Online ekranı: açık oyun odaları
  getRooms(): { code: string; hostName: string; hostCode: string; count: number }[] {
    const now = Date.now();
    return Array.from(this.rooms.entries())
      .filter(([, v]) => now - v.t <= ONLINE_MS)
      .map(([code, v]) => ({ code, hostName: v.hostName, hostCode: v.hostCode, count: v.count }));
  }

  // Host: odamı herkese duyur (heartbeat'te yayınlanır). count değişince güncelle.
  announceRoom(code: string, count: number) {
    this.myRoom = { code, count };
    this.beat();
  }
  stopAnnounceRoom() {
    if (this.myRoom) {
      this.ch?.send({ type: "broadcast", event: "roomclose", payload: { code: this.myRoom.code } });
      this.myRoom = null;
    }
  }

  // Bir arkadaşı odana davet et
  invite(toCode: string, room: string) {
    this.ch?.send({
      type: "broadcast",
      event: "invite",
      payload: { to: toCode, fromCode: this.code, fromName: getMyName(), room },
    });
  }

  // Arkadaşlık isteği gönder (karşı taraf çevrimiçiyse ulaşır). Kalıcı olarak "gönderildi" işaretle.
  sendRequest(toCode: string) {
    markSent(toCode);
    this.ch?.send({
      type: "broadcast",
      event: "freq",
      payload: { to: toCode.toUpperCase(), fromCode: this.code, fromName: getMyName() },
    });
  }

  // Arkadaşlıktan çıkar: yerelde sil + karşı tarafa bildir (o da beni silsin)
  unfriend(code: string) {
    removeFriend(code);
    clearSent(code);
    this.ch?.send({ type: "broadcast", event: "unfriend", payload: { to: code, fromCode: this.code } });
  }

  // Gelen isteği kabul et: ben karşı tarafı eklerim + ona "kabul" yollarım (o da beni ekler)
  acceptRequest(fromCode: string, fromName: string) {
    addFriend(fromCode, fromName);
    clearSent(fromCode);
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
