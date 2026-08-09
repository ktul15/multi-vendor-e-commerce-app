import type { NextRequest } from "next/server";
import {
  removeProductMedia,
  replaceProductMedia,
} from "../../../../../../src/lib/product-media-route";

type RouteContext = Readonly<{
  params: Promise<Readonly<{ id: string; mediaId: string }>>;
}>;

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const { id, mediaId } = await params;
  return replaceProductMedia(request, id, mediaId);
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const { id, mediaId } = await params;
  return removeProductMedia(request, id, mediaId);
}
