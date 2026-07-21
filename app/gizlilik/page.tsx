import type { Metadata } from "next";
import PrivacyContent from "./PrivacyContent";

// GİZLİLİK POLİTİKASI — Google Play ZORUNLU tutuyor (mağaza kaydına bu adres girilir:
// https://jilted.vercel.app/gizlilik).
//
// Bu dosya SUNUCU bileşeni olarak kalır çünkü `metadata` yalnız burada tanımlanabilir.
// İçerik (TR + EN) istemci bileşeninde: aktif dili okuyup ilgili gövdeyi basar.
export const metadata: Metadata = {
  title: "Gizlilik Politikası / Privacy Policy — JILTED",
  description:
    "JILTED oyununun hangi verileri işlediği, nerede sakladığı ve nasıl sileceğin. " +
    "What data JILTED processes, where it is stored and how to delete it.",
};

export default function GizlilikPage() {
  return <PrivacyContent />;
}
