import { AgendaClient } from "./AgendaClient";
import { agendaSearchParamsCache } from "@/lib/search-params.server";
import type { SearchParams } from "nuqs/server";

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await agendaSearchParamsCache.parse(searchParams);
  return <AgendaClient />;
}
