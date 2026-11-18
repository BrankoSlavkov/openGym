// Favourite routines (#327, 1.4.5): a star on the routine, `fav: true`, written only when on.
// Plan lists the starred ones first under Favourites, the Start sheet puts them first, and an
// older app keeps the key as it keeps any other it does not know. It syncs with the routine,
// field by field (lib/sync-merge.js stampEntry), like its name or folder.

interface RoutineFavourite {
  id: string
  fav?: unknown
}
export const isFavRoutine = (r: Pick<RoutineFavourite, 'fav'> | null | undefined) => r?.fav === true

/** Flip the star on routine `id` in a state draft. Returns whether it is a favourite after. */
export function toggleFavRoutine(s: { routines?: RoutineFavourite[] | null } | null | undefined, id: string) {
  const r = (s?.routines || []).find(x => x.id === id)
  if (!r) return false
  if (r.fav === true) { delete r.fav; return false }
  r.fav = true
  return true
}

/** The list with the favourites first, each half in its own order. */
export function favRoutinesFirst<T extends RoutineFavourite>(list: readonly T[] | null | undefined): T[] {
  const all: readonly T[] = Array.isArray(list) ? list : []
  return [...all.filter(isFavRoutine), ...all.filter(r => !isFavRoutine(r))]
}
