import { notFound } from "next/navigation";
import { BannerForm } from "../../../../banner-form";
import { BannerDataError, getAdminBanner } from "../../../../../src/lib/banner-data";

export default async function EditBannerPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  let banner;
  try {
    banner = await getAdminBanner(id);
  } catch (error) {
    if (error instanceof BannerDataError && error.status === 404) notFound();
    return <BannerForm error="Banner could not be loaded. Try again." />;
  }
  return <BannerForm banner={banner} />;
}
