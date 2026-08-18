import type { Metadata } from "next";
import { BannerForm } from "../../../banner-form";

export const metadata: Metadata = { title: "Create banner" };

export default function NewBannerPage() {
  return <BannerForm />;
}
