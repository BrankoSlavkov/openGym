// Types for sw-stamp.mjs (plain JS, also run by Node outside the build).

/** The part of a Rolldown output chunk or asset that lazyAssets reads. */
interface BundleItem {
  type: string
  fileName: string
  isEntry?: boolean
  isDynamicEntry?: boolean
  facadeModuleId?: string | null
}

/** The build's on-demand chunks, as './assets/…' URLs, sorted. */
export function lazyAssets(bundle: Record<string, BundleItem>): string[]
/** public/sw.js with its `__BUILD__` and `__LAZY__` placeholders filled in. */
export function stampSw(source: string, opts: { stamp: string; lazy?: string[] }): string
