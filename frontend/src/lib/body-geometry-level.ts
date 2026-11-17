// The shade step of one body-map region (lib/body-geometry.ts), apart from the geometry so the
// screens that import it statically do not pull ~90 KB of paths into the main bundle.

/** Its own level, or the strongest of it and what the view blends into it (the side delts). */
export function regionLevel(levels: Record<string, number> | null | undefined, slug: string, view?: { blend?: Record<string, string[]> }) {
  const own = levels?.[slug] || 0
  const more = view?.blend?.[slug]
  return more ? Math.max(own, ...more.map(m => levels?.[m] || 0)) : own
}
