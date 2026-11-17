import type { AppState, Workout, WorkoutEntry, SetRow } from "../../packages/shared/src/domain.ts";

/** Persisted documents may contain fields written by newer clients. */
export interface StateDocument extends AppState {
  _wid?: string;
  unit?: string;
  customEx?: CustomExercise[];
  routines?: Routine[];
  workouts?: StoredWorkout[];
  week?: Record<string, string | string[]>;
  dayPlan?: Record<string, string | { id?: string; on?: string }>;
  targetW?: number | null;
  bodyweight?: { d: string; w: number; t?: number }[];
  exWeights?: Record<string, { w?: number; d?: string }>;
}
export interface ProfileUser {
  id: string;
  name: string;
  created?: string | null;
}
export interface ApiConfig {
  base: string;
  token: string;
}
export type ScopeLevel = "off" | "view" | "apply";
export type TokenScopes = Record<string, ScopeLevel | undefined>;
export interface ProfileContext {
  state: StateDocument | null;
  user: ProfileUser;
  api?: ApiConfig;
  scopes?: TokenScopes | null;
  invalidate?: () => void;
}
export interface ApiResponse {
  user?: Partial<ProfileUser>;
  token?: { scopes?: TokenScopes };
  state?: StateDocument | null;
  rev?: number;
  wid?: string | null;
  code?: string;
  error?: string;
}
export interface FetchOptions {
  method?: string;
  body?: unknown;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

/** Exceptions are untrusted too: fetch implementations and tests can throw plain objects. */
export function errorInfo(error: unknown): {
  name: string;
  message: string;
  code?: string;
  status?: number;
  causeCode?: string;
} {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const cause =
    record.cause && typeof record.cause === "object"
      ? (record.cause as Record<string, unknown>)
      : {};
  return {
    name: typeof record.name === "string" ? record.name : "Error",
    message: typeof record.message === "string" ? record.message : String(error),
    code: typeof record.code === "string" ? record.code : undefined,
    status: typeof record.status === "number" ? record.status : undefined,
    causeCode: typeof cause.code === "string" ? cause.code : undefined,
  };
}

export interface CustomExercise {
  id: string;
  n?: string;
  [field: string]: unknown;
}
export interface LoggedSet extends StoredSet {
  w?: number | string;
  r?: number;
  done?: boolean;
  sec?: number;
  min?: number;
  speed?: number;
  km?: number;
  incline?: number;
  rpe?: number;
  rir?: number;
  phase?: string;
  failure?: boolean;
}
export interface LoggedEntry extends StoredEntry {
  id: string;
  sets: LoggedSet[];
  target?: { dbLoad?: string } | null;
  note?: string;
}
export interface LoggedWorkout {
  id: string;
  d: string;
  start: number;
  end: number;
  name?: string;
  vol?: number;
  prs?: string[];
  entries: LoggedEntry[];
  note?: string;
}
export interface ToolContext {
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
}

export interface RoutineExercise {
  id: string;
  sets?: number;
  reps?: number;
  repsMin?: number;
  repsMax?: number;
  min?: number;
  speed?: number;
  sec?: number;
  weight?: number;
  inc?: number;
  restSec?: number;
  deloadFactor?: number;
  prog?: string;
  sg?: string;
  mode?: string;
  pyramid?: (number | "max")[];
  pyramidRest?: number[];
  pyramidWeight?: number[];
}
export interface Routine {
  id: string;
  name: string;
  emoji?: string;
  excludeFromProgression?: boolean;
  ex?: RoutineExercise[];
}
export interface StoredWorkout extends Workout {
  d: string;
  id?: string;
  start?: number;
  end?: number;
  name?: string;
  routineId?: string;
  routineIds?: string[];
  prs?: string[];
  bw?: number;
  gym?: { name?: string };
  entries?: StoredEntry[];
}
export interface StoredEntry extends WorkoutEntry {
  id: string;
  sets?: StoredSet[];
}
export interface StoredSet extends SetRow {
  note?: string;
  type?: string;
  phase?: string;
  failure?: boolean;
  km?: number;
  incline?: number;
  rpe?: number;
}
export interface ProgrammeWeek {
  deload?: boolean;
  rpe?: number;
  t?: Record<string, { pct?: number; rpe?: number }>;
}
export interface Programme {
  id: string;
  name: string;
  sequence?: string[];
  days?: Record<string, string[]>;
  weeks: ProgrammeWeek[];
}
export interface Prescription {
  kind?: string;
  weight?: number;
  reps?: number;
  sets?: number;
  sec?: number;
  policy?: string;
  rowReps?: number[];
  why?: [string, ...unknown[]];
  prog?: { pct?: number; week?: number; weeks?: number; rpe?: number; deload?: boolean };
}
