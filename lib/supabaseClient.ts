// Tarayıcı tarafı Supabase istemcisi (BLACKOUT online).
// Yalnızca anon anahtar kullanır. Online mod tamamen Realtime "broadcast"
// üzerinden çalışır (oyuncular arası anlık mesaj) — veritabanı tablosu gerekmez.
"use client";

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getBrowserClient(): SupabaseClient | null {
  if (!url || !anonKey) {
    console.warn(
      "[blackout] Supabase ortam değişkenleri eksik (.env.local). Online devre dışı."
    );
    return null;
  }
  if (!client) {
    client = createClient(url, anonKey, {
      auth: { persistSession: false },
      // Oyun durumunu ~20/sn yayınlayacağız; boğulmayı önlemek için üst sınırı yükselt.
      realtime: { params: { eventsPerSecond: 30 } },
    });
  }
  return client;
}

// Online'ın kullanılabilir olup olmadığını hızlı kontrol (menüde buton için).
export function isOnlineAvailable(): boolean {
  return Boolean(url && anonKey);
}
