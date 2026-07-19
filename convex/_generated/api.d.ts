/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { ApiFromModules, FilterApi, FunctionReference } from "convex/server";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as patients from "../patients.js";
import type * as psychiatrist from "../psychiatrist.js";
import type * as psychiatristInternal from "../psychiatristInternal.js";
import type * as reminders from "../reminders.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as types from "../types.js";
import type * as users from "../users.js";

declare const fullApi: ApiFromModules<{
  appointments: typeof appointments;
  auth: typeof auth;
  crons: typeof crons;
  http: typeof http;
  lib: typeof lib;
  patients: typeof patients;
  psychiatrist: typeof psychiatrist;
  psychiatristInternal: typeof psychiatristInternal;
  reminders: typeof reminders;
  settings: typeof settings;
  tasks: typeof tasks;
  types: typeof types;
  users: typeof users;
}>;

export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
