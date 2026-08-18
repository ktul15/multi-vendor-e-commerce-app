import type { Metadata } from "next";
import { PromoForm } from "../../../promo-form";

export const metadata: Metadata = { title: "Create promo code" };

export default function NewPromoPage() {
  return <PromoForm />;
}
