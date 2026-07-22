import {
  createParser,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

import { isValidDateKey } from "./utils";

export const agendaViews = ["day", "week", "month"] as const;

const dateKeyParser = createParser<string>({
  parse: (value) => (isValidDateKey(value) ? value : null),
  serialize: (value) => value,
});

const boundedSearchParser = createParser<string>({
  parse: (value) => value.slice(0, 120),
  serialize: (value) => value.slice(0, 120),
});

export const agendaSearchParams = {
  view: parseAsStringLiteral(agendaViews).withDefault("day"),
  date: dateKeyParser.withDefault(""),
};

export const patientListSearchParams = {
  q: boundedSearchParser.withDefault(""),
};

export const homeTaskSearchParams = {
  tasks: dateKeyParser.withDefault(""),
};

export const patientPickerSearchParser = parseAsString.withDefault("");
