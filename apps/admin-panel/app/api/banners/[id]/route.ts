import type { NextRequest } from "next/server";
import { forwardBannerMutation } from "../../../../src/lib/banner-mutation-route";
type Context = Readonly<{ params: Promise<{ id: string }> }>;
export async function PUT(request: NextRequest, { params }: Context) {
  return forwardBannerMutation(request, "PUT", (await params).id);
}
export async function DELETE(request: NextRequest, { params }: Context) {
  return forwardBannerMutation(request, "DELETE", (await params).id);
}
