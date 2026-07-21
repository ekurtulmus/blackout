"use client";

// JILTED — çeviri (i18n) çekirdeği.
//
// KULLANIM (bileşenlerde):
//   const t = useT();
//   <span>{t("menu.single")}</span>
//   <span>{t("shop.owned", { n: 3 })}</span>      // metinde {n} yerine değer geçer
//
// TASARIM KARARLARI:
// • Anahtarlar DÜZ (nokta ayraçlı) — iç içe nesne yerine düz kayıt: TypeScript eksik
//   çeviriyi anında yakalar ve arama/yeniden adlandırma kolay olur.
// • Türkçe sözlük KAYNAKTIR (dict/tr.ts). Diğer diller onun anahtarlarını KOPYALAMAK
//   ZORUNDA (dict/index.ts'teki tip kısıtı) → "bir dilde metin unutuldu" derleme hatası olur.
// • Dil localStorage'da `blackout_lang` ile saklanır ve İLERLEME SIFIRLAMASINDA KORUNUR
//   (bkz. lib/progress.ts KEEP listesi) — oyunu sıfırlayan biri diline geri dönmek zorunda kalmasın.
// • İlk açılışta tarayıcı dilinden otomatik seçilir.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { DEFAULT_LANG, LANGS, LANG_FONTS, detectLang, type Lang } from "./langs";
import { DICTS, type DictKey } from "./dict";

const LANG_KEY = "blackout_lang";

type Vars = Record<string, string | number>;
type Ctx = { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey, v?: Vars) => string };

const I18nContext = createContext<Ctx | null>(null);

function readStoredLang(): Lang | null {
  try {
    const v = localStorage.getItem(LANG_KEY);
    return (LANGS as readonly string[]).includes(v ?? "") ? (v as Lang) : null;
  } catch {
    return null;
  }
}

// Kiril/Devanagari/Çince fontlarını YALNIZ o dil seçilince yükle (Latin diller mevcut
// fontları kullanır). Aynı dil için ikinci kez <link> eklenmez.
function ensureFont(lang: Lang) {
  const f = LANG_FONTS[lang];
  const root = document.documentElement;
  if (!f) {
    root.style.removeProperty("--font-title-i18n");
    root.style.removeProperty("--font-body-i18n");
    return;
  }
  const id = `i18n-font-${lang}`;
  if (!document.getElementById(id)) {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = f.href;
    document.head.appendChild(link);
  }
  // globals.css bu değişkenleri okur; tanımlı değilse Latin fontlara düşer.
  root.style.setProperty("--font-title-i18n", f.title);
  root.style.setProperty("--font-body-i18n", f.body);
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // Sunucu ve ilk boyama DEFAULT_LANG ile eşleşsin (hydration uyuşmazlığı olmasın);
  // gerçek dil mount'tan sonra uygulanır.
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  useEffect(() => {
    const stored = readStoredLang();
    const initial = stored ?? detectLang(navigator.languages ?? [navigator.language]);
    setLangState(initial);
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    ensureFont(lang);
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* geç */
    }
  }, []);

  const t = useCallback(
    (k: DictKey, v?: Vars) => {
      // Seçili dilde metin yoksa Türkçeye düş (asla boş/anahtar gösterme).
      const s = DICTS[lang][k] ?? DICTS[DEFAULT_LANG][k] ?? k;
      if (!v) return s;
      return s.replace(/\{(\w+)\}/g, (m, name) => (name in v ? String(v[name]) : m));
    },
    [lang]
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): Ctx {
  const c = useContext(I18nContext);
  if (!c) throw new Error("useI18n: I18nProvider içinde kullanılmalı (app/layout.tsx)");
  return c;
}

/** Metin çevirici. `const t = useT(); t("menu.single")` */
export function useT() {
  return useI18n().t;
}

/** Aktif dil + değiştirici (dil seçici için). */
export function useLang() {
  const { lang, setLang } = useI18n();
  return { lang, setLang };
}
