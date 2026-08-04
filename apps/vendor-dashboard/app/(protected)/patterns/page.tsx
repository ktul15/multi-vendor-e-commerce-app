import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createServerQueryClient } from "@repo/query/server";
import { redirect } from "next/navigation";
import { canonicalizePatternSearchParams, exampleProductsQuery } from "./patterns-data";
import type { PatternSearchParams } from "./patterns-data";
import { PatternsExample } from "./patterns-example";

export default async function PatternsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<PatternSearchParams> }>) {
  const canonical = canonicalizePatternSearchParams(await searchParams);
  if (canonical.shouldRedirect) redirect(`/patterns?${canonical.canonicalQuery}`);

  const queryClient = createServerQueryClient();
  await queryClient.prefetchQuery(exampleProductsQuery(canonical.state));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PatternsExample />
    </HydrationBoundary>
  );
}
