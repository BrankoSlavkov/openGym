import type { AppState, Workout } from '../lib/domain-types.ts'

type SourceWorkout = Workout & { id?: string; name?: string }
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { fmtDate, exCount } from '../lib/format.js'
import { routineSources, saveSessionAsRoutine } from '../lib/session-routines.js'
import Icon from './Icon.tsx'

/* Plan → "Routine from a past workout" (idea by @alexgrandasoto, #1010). The same copy as a
   workout's own Save as routine, offered where routines are made, so a history someone imported
   (or trained without routines) turns into a plan in two taps. The newest workout of each name;
   the routine opens right away to be tidied up. Your workouts stay as they are. */
function RoutineFromWorkout({ close, onSaved }: { close: () => void; onSaved?: (id: string) => void }) {
  const workouts = useStore((s) => s.S.workouts)
  const update = useStore((s) => s.update)
  const list: { w: SourceWorkout; exercises: number }[] = routineSources(workouts)
  const pick = (w: SourceWorkout) => {
    let id: string | null = null
    try {
      update((s: AppState) => {
        id = saveSessionAsRoutine(s, w, w.name)
      })
    } catch {
      useUI.getState().toast(t('That workout has no exercises to copy.'))
      return
    }
    close()
    useUI.getState().toast(t('Saved as a routine. Your workout stays as it was.'))
    if (id && onSaved) onSaved(id)
  }
  return (
    <>
      <h3>{t('Routine from a past workout')}</h3>
      <div className="muted small" style={{ marginBottom: 12 }}>
        {t('Pick one you did, imported ones too. Its exercises and sets become a routine you can tweak.')}
      </div>
      {list.length ? (
        <div className="list rfw-list">
          {list.map(({ w, exercises }) => (
            <button type="button" key={w.id || String(w.d) + String(w.name)} className="item" onClick={() => pick(w)}>
              <span className="grow">
                <span className="tt">{String(w.name || '').trim() || t('Workout')}</span>
                <span className="ss">
                  {w.d ? fmtDate(w.d, false, true) + ' · ' : ''}
                  {exCount(exercises)}
                </span>
              </span>
              <Icon name="plus" className="chev" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty">
          {t('Nothing logged yet. Train once, or import your history, and it shows up here.')}
        </div>
      )}
    </>
  )
}

export const routineFromWorkoutSheet = (onSaved?: (id: string) => void) =>
  useUI.getState().openSheet((close: () => void) => <RoutineFromWorkout close={close} onSaved={onSaved} />)
