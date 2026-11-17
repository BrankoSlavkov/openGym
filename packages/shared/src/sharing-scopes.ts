/** Trainer permissions shared by the consent screen and server authorization. */
export const LEVELS = ['off', 'view', 'suggest', 'apply'] as const
export type ScopeLevel = (typeof LEVELS)[number]
export const rank = (level: unknown): number => Math.max(0, LEVELS.findIndex(value => value === level))

export const CATEGORIES = [
  { id: 'metrics', max: 'view' },
  { id: 'workouts', max: 'apply' },
  { id: 'plans', max: 'apply' },
  { id: 'bodyweight', max: 'apply' },
  { id: 'measurements', max: 'apply' },
  { id: 'photos', max: 'view' },
  { id: 'notes', max: 'view' },
  { id: 'nutrition', max: 'view' },
] as const
export type ScopeCategory = (typeof CATEGORIES)[number]['id']
export type Scopes = Record<ScopeCategory, ScopeLevel>
export const CATEGORY_IDS = CATEGORIES.map(category => category.id)
export const TRAINER_DEFAULTS: Scopes = {
  metrics: 'view', workouts: 'view', plans: 'suggest', bodyweight: 'view',
  measurements: 'off', photos: 'off', notes: 'off', nutrition: 'off',
}

/** Unknown keys and levels are discarded; category limits and the lead's cap always apply. */
export function cleanScopes(input: unknown, cap: unknown = 'apply'): Scopes {
  const out = { ...TRAINER_DEFAULTS }
  for (const category of CATEGORIES) {
    const want = input && typeof input === 'object' && category.id in input
      ? Reflect.get(input, category.id) : 'off'
    out[category.id] = LEVELS[Math.min(rank(want), rank(category.max), rank(cap))]!
  }
  return out
}

export const LEAD_MODES = ['row', 'mirror', 'none'] as const
export type LeadMode = (typeof LEAD_MODES)[number]
export const leadModeOf = (value: unknown): LeadMode => LEAD_MODES.find(mode => mode === value) ?? 'row'

export function leadScopes(mode: unknown, trainerScopes: unknown, picked?: unknown): Scopes {
  if (mode === 'none') return cleanScopes({}, 'view')
  if (!trainerScopes) return cleanScopes(picked || TRAINER_DEFAULTS, 'view')
  const fromTrainer = cleanScopes(trainerScopes, 'view')
  if (mode === 'mirror' || !picked) return fromTrainer
  const mine = cleanScopes(picked, 'view')
  for (const id of CATEGORY_IDS) mine[id] = LEVELS[Math.min(rank(mine[id]), rank(fromTrainer[id]))]!
  return mine
}

export const sharesNothing = (scopes: unknown): boolean => CATEGORY_IDS.every(id =>
  rank(scopes && typeof scopes === 'object' ? Reflect.get(scopes, id) : undefined) === 0)
