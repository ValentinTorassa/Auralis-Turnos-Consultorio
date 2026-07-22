import { PatientsClient } from "./PatientsClient";
import { patientListSearchParamsCache } from "@/lib/search-params.server";
import type { SearchParams } from "nuqs/server";

export default async function PacientesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await patientListSearchParamsCache.parse(searchParams);
  return <PatientsClient />;
}
