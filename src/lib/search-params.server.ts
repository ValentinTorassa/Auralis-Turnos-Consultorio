import { createSearchParamsCache } from "nuqs/server";

import {
  agendaSearchParams,
  patientListSearchParams,
} from "@/lib/search-params";

export const agendaSearchParamsCache =
  createSearchParamsCache(agendaSearchParams);

export const patientListSearchParamsCache = createSearchParamsCache(
  patientListSearchParams,
);
