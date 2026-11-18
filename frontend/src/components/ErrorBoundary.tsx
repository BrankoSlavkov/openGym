import { Component } from 'react'
import * as stylex from '@stylexjs/stylex'
import type { PropsWithChildren } from 'react'
import { useStore } from '../store/useStore.js'
import { t } from '../lib/i18n.js'
import { markDiscarded } from '../lib/watch-sync.js'
import Icon from './Icon.tsx'
import { Button } from './ui.tsx'

const styles = stylex.create({
  message: { marginTop: '18vh' },
  title: { fontWeight: 600, marginBottom: 6 },
  actionGap: { height: 8 },
})

/**
 * Last line of defence: one bad render used to blank the whole app, with no way back —
 * a workout referencing an exercise the build doesn't know would white-screen and, since
 * the running workout is persisted, do it again on every reload.
 *
 * Sits inside #app so the tab bar stays usable; the shell keys this subtree on the route,
 * so switching tabs re-mounts it and clears the error by itself.
 */
export default class ErrorBoundary extends Component<PropsWithChildren, { failed: boolean }> {
  constructor(props: PropsWithChildren) {
    super(props)
    this.state = { failed: false }
  }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  override componentDidCatch(err: Error) {
    console.error('openGym render error:', err)
  }

  override render() {
    if (!this.state.failed) return this.props.children
    const active = useStore.getState().S.active
    return (
      <div className="narrow">
        <div className={'empty ' + stylex.props(styles.message).className}>
          <div className="ico">
            <Icon name="info" />
          </div>
          <div {...stylex.props(styles.title)}>{t('Something went wrong')}</div>
          {t('This screen could not be drawn. Your data is safe on this device.')}
        </div>
        <Button variant="primary" icon="reset" onClick={() => location.reload()}>
          {t('Reload openGym')}
        </Button>
        {active && (
          <>
            <div {...stylex.props(styles.actionGap)} />
            <Button
              variant="danger"
              icon="trash"
              onClick={() => {
                // The watch hears it was discarded, not finished (#776).
                markDiscarded(useStore.getState().S.active?.id)
                useStore.getState().update((s: { active: unknown }) => {
                  s.active = null
                })
                location.reload()
              }}
            >
              {t('Discard the running workout')}
            </Button>
          </>
        )}
      </div>
    )
  }
}
