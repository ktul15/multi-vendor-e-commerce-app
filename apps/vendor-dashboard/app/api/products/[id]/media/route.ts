import type { NextRequest } from "next/server";
import { uploadProductMedia } from "../../../../../src/lib/product-media-route";

export async function POST(
  request: NextRequest,
  { params }: Readonly<{ params: Promise<Readonly<{ id: string }>> }>,
) {
  return uploadProductMedia(request, (await params).id);
}
