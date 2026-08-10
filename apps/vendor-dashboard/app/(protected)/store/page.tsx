import { StoreProfileForm, StoreProfileUnavailable } from "../../store-profile-form";
import { getVendorProfile } from "../../../src/lib/vendor-profile";

export default async function StoreProfilePage() {
  let profile;
  try {
    profile = await getVendorProfile();
  } catch {
    return <StoreProfileUnavailable />;
  }
  return <StoreProfileForm initialProfile={profile} />;
}
