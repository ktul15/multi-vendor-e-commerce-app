import { redirect } from "next/navigation";
import { AdminBannersView } from "../../admin-banners-view";
import { getAdminBanners } from "../../../src/lib/banner-data";
import { bannerListHref, parseBannerListState } from "../../../src/lib/banner-list-state";
import type { BannerListSearchParams } from "../../../src/lib/banner-list-state";

export default async function BannersPage({
  searchParams,
}: Readonly<{ searchParams: Promise<BannerListSearchParams> }>) {
  const state = parseBannerListState(await searchParams);
  let banners;
  try {
    banners = await getAdminBanners(state);
  } catch {
    return <AdminBannersView error="Banners could not be loaded. Try again." state={state} />;
  }
  if (state.page > banners.meta.totalPages)
    redirect(bannerListHref(state, { page: banners.meta.totalPages }));
  return <AdminBannersView banners={banners} state={state} />;
}
