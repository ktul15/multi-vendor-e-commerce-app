import { notFound } from "next/navigation";
import { AdminUserDetailView } from "../../../admin-user-detail-view";
import { getAdminUser, UserDataError } from "../../../../src/lib/user-data";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function UserDetailPage({
  params,
}: Readonly<{ params: Promise<Readonly<{ id: string }>> }>) {
  const { id } = await params;
  if (!uuidPattern.test(id)) notFound();

  let user;
  try {
    user = await getAdminUser(id);
  } catch (error) {
    if (error instanceof UserDataError && error.status === 404) notFound();
    return <AdminUserDetailView error="User details could not be loaded. Try again." />;
  }
  return <AdminUserDetailView user={user} />;
}
