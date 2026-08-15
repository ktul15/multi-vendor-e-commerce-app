import type { NextRequest } from "next/server";
import { forwardPromoMutation } from "../../../src/lib/promo-mutation-route";

export async function POST(request: NextRequest) {
  return forwardPromoMutation(request, "POST");
}
