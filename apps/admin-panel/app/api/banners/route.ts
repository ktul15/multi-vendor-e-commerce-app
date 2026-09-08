import type { NextRequest } from "next/server";
import { forwardBannerMutation } from "../../../src/lib/banner-mutation-route";
export async function POST(request: NextRequest) {
  return forwardBannerMutation(request, "POST");
}
