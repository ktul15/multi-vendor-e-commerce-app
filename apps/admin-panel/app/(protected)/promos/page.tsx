import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminPromosView } from "../../admin-promos-view";
import { getAdminPromos } from "../../../src/lib/promo-data";
import { parsePromoListState, promoListHref } from "../../../src/lib/promo-list-state";
import type { PromoListSearchParams } from "../../../src/lib/promo-list-state";

export const metadata: Metadata = { title: "Promo codes" };

export default async function PromosPage({
  searchParams,
}: Readonly<{ searchParams: Promise<PromoListSearchParams> }>) {
  const state = parsePromoListState(await searchParams);
  let promos;
  try {
    promos = await getAdminPromos(state);
  } catch {
    return <AdminPromosView error="Promo codes could not be loaded. Try again." state={state} />;
  }
  if (state.page > promos.meta.totalPages) {
    redirect(promoListHref(state, { page: promos.meta.totalPages }));
  }
  return <AdminPromosView promos={promos} state={state} />;
}
