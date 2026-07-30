// JILTED — Play Store puan/yorum isteği.
//
// ⚠️ ÖDÜL VERİLMEZ. Google Play politikası, puan/yorum karşılığı oyun içi eşya, altın
// veya herhangi bir karşılık teklif etmeyi YASAKLIYOR ("5 yıldız ver, şunu al" tipi
// kampanyalar teşvikli puanlama sayılır ve uygulama askıya alınabilir). Bu yüzden
// burada yalnızca NAZİK BİR SORU var; kabul de red de oyuna hiçbir şey katmaz/eksiltmez.
//
// ZAMANLAMA: 3. bölümü bitirdiğinde sorulur. Daha erken sorulsa oyuncunun henüz fikri
// olmuyor; 10. bölümü bekleseydik çok az kişi görürdü. 3. bölüm "oyunu anladım ve
// devam ediyorum" noktası — memnuniyetin en yüksek, terk riskinin düşük olduğu an.
//
// SIKLIK: ÖMÜR BOYU BİR KEZ. Hangi düğmeye basarsa bassın (hatta kapatsa bile) bir daha
// sorulmaz. Bayrak lib/progress.ts KEEP listesinde → ilerleme sıfırlansa bile geri gelmez;
// oyuncuya ikinci kez sormak rahatsız edicidir ve puanı düşürür.

const ASKED_KEY = "blackout_rated";
const MIN_LEVEL = 3; // bu bölüm BİTİNCE sorulur

export const STORE_URL = "https://play.google.com/store/apps/details?id=app.jilted.game";

// Bu bölüm bitişinde sorulsun mu?
export function shouldAskReview(clearedLevel: number): boolean {
  // ">=" olmalı, "===" DEĞİL: oyunu zaten 3. bölümün ötesinde oynayan mevcut oyunculara
  // (bütün testçiler öyle) asla sorulmazdı. Zaten bayrak sayesinde bir kez soruluyor.
  if (clearedLevel < MIN_LEVEL) return false;
  try {
    return !localStorage.getItem(ASKED_KEY);
  } catch {
    return false; // localStorage yoksa hiç sorma (bayrak yazılamaz → her seferinde sorardı)
  }
}

// Soruldu olarak işaretle — "Puan ver" de "Şimdi değil" de aynı sonucu doğurur.
export function markReviewAsked() {
  try {
    localStorage.setItem(ASKED_KEY, "1");
  } catch {
    /* geç */
  }
}

// Mağaza sayfasını yeni sekmede aç. TWA'da Android bu bağlantıyı Play uygulamasına
// yönlendirir; oyun arkada açık kalır (location.href kullanılsaydı oyundan çıkardı).
export function openStorePage() {
  markReviewAsked();
  try {
    window.open(STORE_URL, "_blank", "noopener,noreferrer");
  } catch {
    /* geç */
  }
}
