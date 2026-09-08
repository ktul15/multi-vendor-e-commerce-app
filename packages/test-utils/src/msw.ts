import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import type { HttpHandler, JsonBodyType } from "msw";

export function createJsonHandler<TResponse extends JsonBodyType>(
  method: "delete" | "get" | "patch" | "post" | "put",
  url: string,
  response: TResponse,
  status = 200,
): HttpHandler {
  return http[method](url, () => HttpResponse.json(response, { status }));
}

export function createTestServer(...handlers: HttpHandler[]) {
  return setupServer(...handlers);
}
