// Formatting glue between lib helpers (which speak {0}/{1} templates) and the JSON returned
// to the LLM.
import { MUSCLE_NAME, MUSCLES } from "../../frontend/src/lib/muscles.js";
import { modeOf, fmtSec, setLabel } from "../../frontend/src/lib/history.js";
import { POLICY_NAME } from "../../frontend/src/lib/progression.js";
import { isPyramid, pyramidLabel } from "../../frontend/src/lib/pyramid.js";
import { fmtDate, fmtNum, fmtDur } from "../../frontend/src/lib/format.js";

interface ExerciseConfig {
  id?: string;
  sets?: number;
  weight?: number;
  min?: number;
  speed?: number;
  sec?: number;
  reps?: number;
  repsMin?: number;
  setsMax?: number;
  mode?: string;
  pyramid?: (number | "max")[];
}

// Apply {0},{1},… substitutions to the template strings the lib returns.
export function fmt(template: string, args?: readonly unknown[]) {
  let v = template;
  for (let i = 0; i < (args || []).length; i++) v = v.replaceAll("{" + i + "}", String(args?.[i]));
  return v;
}

export { setLabel };

export function exLine(cfg: ExerciseConfig, unit: string) {
  const mode = modeOf(cfg);
  const n = cfg.sets || 1;
  const load = cfg.weight ? " · " + fmtNum(cfg.weight) + " " + unit : "";
  if (mode === "cardio") return `${n} × ${cfg.min || 20} min @ ${fmtNum(cfg.speed || 8)} km/h`;
  if (mode === "time") return `${n} × ${fmtSec(cfg.sec || 45)}${load}`;
  // Pyramid sets read as their per-set targets, the way the app shows them ("12 · 8 · 6 · Max · 12").
  if (isPyramid(cfg)) return pyramidLabel(cfg.pyramid);
  // A double-progression range is stored as its top (`reps`) and bottom (`repsMin`); it reads
  // as the range, the way the app's routine editor shows it ("3 × 8–12").
  const reps =
    (cfg.repsMin ?? 0) > 0 && (cfg.repsMin ?? 0) < (cfg.reps ?? 0)
      ? `${cfg.repsMin}–${cfg.reps}`
      : `${cfg.reps}`;
  // Triple progression's set range reads the same way ("3–5 × 8–12").
  const sets = (cfg.setsMax ?? 0) > n ? `${n}–${cfg.setsMax}` : n;
  return `${sets} × ${reps}${load}`;
}

export function muscleName(slug: string) {
  return (MUSCLE_NAME as Record<string, string>)[slug] || slug;
}

export function policyName(policy: string) {
  return (POLICY_NAME as Record<string, string>)[policy] || policy;
}

export function friendlyDate(iso?: string | null) {
  if (!iso) return null;
  return fmtDate(iso, false);
}

export function friendlyDuration(ms?: number | null) {
  return ms ? fmtDur(ms) : null;
}

export function ratio(done: number, total: number) {
  return `${done}/${total}`;
}

export function muscleOrder() {
  return MUSCLES.slice();
}
