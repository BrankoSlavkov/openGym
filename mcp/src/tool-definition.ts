import type { z } from "zod";
import type { ToolContext } from "./types.ts";

/** Keep each tool's parsed input tied to its Zod schema while preserving its result type. */
export function defineTool<S extends z.ZodRawShape, R>(definition: {
  name: string;
  description: string;
  schema: S;
  handler: (params: z.infer<z.ZodObject<S>>, context?: ToolContext) => R;
}) {
  return definition;
}
