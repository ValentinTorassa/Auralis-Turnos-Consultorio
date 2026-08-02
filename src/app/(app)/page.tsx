import { HomeClient } from "./_Components/HomeClient";
import { homeTaskSearchParamsCache } from "@/lib/search-params.server";
import type { SearchParams } from "nuqs/server";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await homeTaskSearchParamsCache.parse(searchParams);
  return <HomeClient />;
}
