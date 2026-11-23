// ANDROID UYGULAMASI (Capacitor) — Play Store'a çıkan kabuk.
//
// Neden TWA değil: AdMob yerel Android SDK'sı ister, TWA (Chrome sekmesi) içinde çalışmaz.
// Uygulama oyunu CANLI SİTEDEN yükler (server.url) → Vercel'e her deploy, Play'e yeni sürüm
// yüklemeden herkese ulaşır. Play'e yeni sürüm yalnız yerel tarafta (eklenti, izin, ikon)
// değişiklik olunca gerekir. İnternet yoksa webDir'deki yedek sayfa açılır.
//
// Derleme: GitHub Actions (.github/workflows/android.yml) — bu makinede Java/Android SDK yok.
// ⚠️ appId yayınlandıktan sonra DEĞİŞTİRİLEMEZ.
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.darkmaze.jilted",
  appName: "Jilted",
  webDir: "cap-www",
  server: {
    url: "https://jilted.vercel.app",
    androidScheme: "https",
    // Oyun yalnız kendi sitesinde gezinir; dış bağlantılar (gizlilik vb. dışında) tarayıcıda açılır.
    allowNavigation: ["jilted.vercel.app"],
  },
  android: {
    backgroundColor: "#050304",
  },
};

export default config;
