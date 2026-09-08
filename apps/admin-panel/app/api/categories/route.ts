import type { NextRequest } from "next/server";
import { forwardCategoryMutation } from "../../../src/lib/category-mutation-route";

export async function POST(request: NextRequest) {
  return forwardCategoryMutation(request, "POST");
}
