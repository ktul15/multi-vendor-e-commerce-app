import type { NextRequest } from "next/server";
import { forwardCategoryMutation } from "../../../../src/lib/category-mutation-route";

type Context = Readonly<{ params: Promise<Readonly<{ id: string }>> }>;

export async function PUT(request: NextRequest, { params }: Context) {
  return forwardCategoryMutation(request, "PUT", (await params).id);
}

export async function DELETE(request: NextRequest, { params }: Context) {
  return forwardCategoryMutation(request, "DELETE", (await params).id);
}
