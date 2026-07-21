// Sözlük kaydı. TÜRKÇE KAYNAKTIR; diğer diller onun anahtarlarının TAMAMINI içermelidir.
//
// `Translation` tipi sayesinde bir dilde anahtar eksik/fazla olursa `npx tsc --noEmit`
// DERLEME HATASI verir. Yani "şu dilde şu yazı çevrilmemiş" durumu sessizce kaçamaz.
import type { Lang } from "../langs";
import { tr } from "./tr";
import { en } from "./en";
import { ru } from "./ru";
import { es } from "./es";
import { hi } from "./hi";
import { zh } from "./zh";

export type DictKey = keyof typeof tr;
/** Her dil, Türkçedeki her anahtarı içermek ZORUNDA. */
export type Translation = Record<DictKey, string>;

export const DICTS: Record<Lang, Translation> = { tr, en, ru, es, hi, zh };
