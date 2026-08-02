import { createSearchParamsCache } from "nuqs/server";

import {
  agendaSearchParams,
  homeTaskSearchParams,
  patientListSearchParams,
} from "@/lib/search-params";

export const agendaSearchParamsCache =
  createSearchParamsCache(agendaSearchParams);

export const patientListSearchParamsCache = createSearchParamsCache(
  patientListSearchParams,
);

export const homeTaskSearchParamsCache = createSearchParamsCache(
  homeTaskSearchParams,
);
