import { notFound } from "next/navigation";
import { PromoForm } from "../../../../promo-form";
import { getAdminPromo, PromoDataError } from "../../../../../src/lib/promo-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function EditPromoPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ id: string }>> }>) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();
  let promo;
  try {
    promo = await getAdminPromo(id);
  } catch (error) {
    if (error instanceof PromoDataError && error.status === 404) notFound();
    return <PromoForm error="Promo code could not be loaded. Try again." />;
  }
  return <PromoForm promo={promo} />;
}
