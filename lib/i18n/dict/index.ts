// Sözlük — PARÇALARDAN birleşir (lib/i18n/dict/parts/*).
//
// NEDEN PARÇA: tek dev dosya olsaydı aynı anda birden çok konu üzerinde çalışılamazdı.
// Her parça KENDİ dosyasında ve o dosya TÜM dilleri içerir → dosyalar çakışmaz.
//
// YENİ PARÇA EKLEME: parts/<ad>.ts oluştur (definePart ile), buraya import et ve
// PARTS dizisine ekle. Anahtarlar OTOMATİK olarak DictKey'e katılır.
//
// GARANTİ: her parça içinde `tr` kaynaktır, diğer diller aynı anahtarları içermek
// ZORUNDADIR (parts/_part.ts tip kısıtı) → eksik çeviri derleme hatasıdır.
import { LANGS, type Lang } from "../langs";
import { core } from "./parts/core";
import { menu } from "./parts/menu";
import { screens } from "./parts/screens";
import { game } from "./parts/game";
import { online } from "./parts/online";
import { lore } from "./parts/lore";
import { missions } from "./parts/missions";
import { shop } from "./parts/shop";
import { chrome } from "./parts/chrome";

const PARTS = [core, menu, screens, game, online, lore, missions, shop, chrome] as const;

// Tüm parçaların Türkçe anahtarlarının BİRLEŞİMİ = geçerli anahtar kümesi.
export type DictKey = keyof (typeof core.tr &
  typeof menu.tr &
  typeof screens.tr &
  typeof game.tr &
  typeof online.tr &
  typeof lore.tr &
  typeof missions.tr &
  typeof shop.tr &
  typeof chrome.tr);

export type Translation = Record<DictKey, string>;

function merge(lang: Lang): Translation {
  const out: Record<string, string> = {};
  for (const p of PARTS) Object.assign(out, (p as Record<Lang, Record<string, string>>)[lang]);
  return out as Translation;
}

export const DICTS: Record<Lang, Translation> = Object.fromEntries(
  LANGS.map((l) => [l, merge(l)])
) as Record<Lang, Translation>;
