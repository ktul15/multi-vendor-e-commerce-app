import type { NextRequest } from "next/server";
import { forwardPromoMutation } from "../../../../src/lib/promo-mutation-route";

type Context = Readonly<{ params: Promise<Readonly<{ id: string }>> }>;

export async function PUT(request: NextRequest, { params }: Context) {
  return forwardPromoMutation(request, "PUT", (await params).id);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  return forwardPromoMutation(request, "DELETE", (await params).id);
}
