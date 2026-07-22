/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as appointmentTypeDefaults from "../appointmentTypeDefaults.js";
import type * as appointments from "../appointments.js";
import type * as auth from "../auth.js";
import type * as backup from "../backup.js";
import type * as backupModel from "../backupModel.js";
import type * as crons from "../crons.js";
import type * as http from "../http.js";
import type * as lib from "../lib.js";
import type * as migrations from "../migrations.js";
import type * as patients from "../patients.js";
import type * as psychiatrist from "../psychiatrist.js";
import type * as psychiatristInternal from "../psychiatristInternal.js";
import type * as psychiatristModel from "../psychiatristModel.js";
import type * as reminders from "../reminders.js";
import type * as seedDemo from "../seedDemo.js";
import type * as settings from "../settings.js";
import type * as tasks from "../tasks.js";
import type * as types from "../types.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  appointmentTypeDefaults: typeof appointmentTypeDefaults;
  appointments: typeof appointments;
  auth: typeof auth;
  backup: typeof backup;
  backupModel: typeof backupModel;
  crons: typeof crons;
  http: typeof http;
  lib: typeof lib;
  migrations: typeof migrations;
  patients: typeof patients;
  psychiatrist: typeof psychiatrist;
  psychiatristInternal: typeof psychiatristInternal;
  psychiatristModel: typeof psychiatristModel;
  reminders: typeof reminders;
  seedDemo: typeof seedDemo;
  settings: typeof settings;
  tasks: typeof tasks;
  types: typeof types;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
