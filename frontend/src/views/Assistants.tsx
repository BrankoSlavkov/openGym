// Coach → "Use your subscription" (sub-connect-146): Claude, ChatGPT or Gemini on the plan people
// already pay for, by adding openGym to that app as a connector (lib/assistants.js says why it is
// this and not a sign-in to the subscription). One screen: the address to paste, three cards with
// three steps each, a live "Connected via Claude" once the assistant has used its token, and the
// connected assistants with a way to cut them off. Where no assistant could reach this openGym
// (a phone on its own, connectors off, an address only the home network knows) it says so plainly
// and points at what works on the phone instead.
import type { ApiToken, GetConfig200 } from '../generated/models/index.ts'
import type { NavigateFn } from '../router/hooks.tsx'
import type { ConnectorToken } from '../lib/assistants.ts'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from '../router/hooks.tsx'
import { useStore } from '../store/useStore.js'
import { useUI } from '../store/useUI.js'
import { t } from '../lib/i18n.js'
import { MOBILE } from '../lib/mobile.js'
import { copyText } from '../lib/clipboard.ts'
import { fmtAgo } from '../lib/format.js'
import { listTokens, revokeToken, mcpAddress, tokenLine } from '../lib/api-tokens.ts'
import {
  ASSISTANTS,
  assistantById,
  connectorsOf,
  connectionOf,
  reachability,
  SELF_HOSTING_DOCS,
  MCP_REMOTE_DOCS,
} from '../lib/assistants.ts'
import { confirmSheet } from '../sheets.jsx'
import Icon from '../components/Icon.tsx'
import { Section, Row, Button } from '../components/ui.tsx'
import * as stylex from '@stylexjs/stylex'
import { sx } from '../lib/sx.ts'

// Use your subscription (was in coach.css).
const motionOk = '@media (prefers-reduced-motion:no-preference)'
const reduced = '@media (prefers-reduced-motion:reduce)'
const narrow = '@media (max-width:360px)'
const detailIn = stylex.keyframes({ from: { opacity: 0, transform: 'translateY(-4px) scale(.985)' } })
const x = stylex.create({
  lead: {
    margin: '2px 4px 20px',
    color: 'var(--label-2)',
    fontSize: 'var(--fs-body)',
    lineHeight: 1.45,
    textWrap: 'pretty',
  },
  warn: { color: 'var(--orange)' },
  addr: { padding: 12, display: 'flex', flexDirection: 'column', gap: 10 },
  addrCode: {
    display: 'block',
    padding: '12px 14px',
    borderRadius: 12,
    backgroundColor: 'var(--surface-2)',
    fontSize: 'var(--fs-body)',
    fontWeight: 600,
    letterSpacing: '-.01em',
    overflowWrap: 'anywhere',
    userSelect: 'all',
  },
  addrBtns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  cards: {
    display: 'grid',
    gridTemplateColumns: { default: 'repeat(3,minmax(0,1fr))', [narrow]: '1fr' },
    gap: 8,
    padding: '10px 12px',
  },
  card: {
    display: 'flex',
    flexDirection: { default: 'column', [narrow]: 'row' },
    alignItems: { default: 'flex-start', [narrow]: 'center' },
    gap: 6,
    minHeight: { default: 104, [narrow]: 0 },
    padding: '14px 12px',
    borderRadius: 16,
    backgroundColor: 'var(--surface-2)',
    border: '1.5px solid transparent',
    color: 'var(--label)',
    font: 'inherit',
    textAlign: 'start',
    cursor: 'pointer',
    transition: {
      default: 'transform 140ms cubic-bezier(.23,1,.32,1),border-color 160ms ease,background-color 160ms ease',
      [reduced]: 'border-color 160ms ease,background-color 160ms ease',
    },
    transform: { default: null, ':active': { default: 'scale(.97)', [reduced]: 'none' } },
    outline: { default: null, ':focus-visible': '2px solid var(--acc)' },
    outlineOffset: { default: null, ':focus-visible': 2 },
  },
  cardOn: { borderColor: 'var(--acc)', backgroundColor: 'var(--acc-soft)' },
  cardIcon: { fontSize: 22, lineHeight: 1 },
  cardTitle: { fontWeight: 700, fontSize: 'var(--fs-body)', letterSpacing: '-.01em' },
  cardSub: { fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.3 },
  ok: { display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--green)', fontWeight: 600 },
  detail: {
    margin: '-6px 0 26px',
    padding: 16,
    borderRadius: 18,
    backgroundColor: 'var(--surface)',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    transformOrigin: 'top center',
    animationName: { default: null, [motionOk]: detailIn },
    animationDuration: { default: null, [motionOk]: '220ms' },
    animationTimingFunction: { default: null, [motionOk]: 'cubic-bezier(.23,1,.32,1)' },
  },
  plan: { margin: 0, fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', lineHeight: 1.45 },
  planTitle: { display: 'block', color: 'var(--label)', fontSize: 'var(--fs-body)', marginBottom: 2 },
  steps: { listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  step: { display: 'flex', gap: 12, alignItems: 'flex-start', lineHeight: 1.4 },
  stepNum: {
    flex: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: '50%',
    backgroundColor: 'var(--acc-soft)',
    color: 'var(--acc)',
    fontWeight: 700,
    fontSize: 'var(--fs-footnote)',
    fontVariantNumeric: 'tabular-nums',
  },
  btns: { display: 'flex', gap: 8, flexWrap: 'wrap' },
  status: {
    display: 'flex',
    gap: 10,
    alignItems: 'flex-start',
    padding: '12px 14px',
    borderRadius: 12,
    backgroundColor: 'var(--surface-2)',
    color: 'var(--label-2)',
    fontSize: 'var(--fs-footnote)',
    lineHeight: 1.4,
    transition: 'background-color 200ms ease',
  },
  statusOk: {
    backgroundColor: stylex.firstThatWorks('color-mix(in srgb,var(--green) 14%,transparent)', 'var(--surface-2)'),
  },
  statusTitle: { display: 'block', color: 'var(--label)', fontSize: 'var(--fs-body)' },
  statusIcon: { flex: 'none', marginTop: 2 },
  statusIconOk: { color: 'var(--green)' },
  try: { margin: 0, fontSize: 'var(--fs-footnote)', color: 'var(--label-2)', fontStyle: 'italic' },
  none: {
    display: 'flex',
    gap: 12,
    alignItems: 'flex-start',
    margin: '0 0 22px',
    padding: '14px 16px',
    borderRadius: 16,
    backgroundColor: 'var(--surface)',
    lineHeight: 1.45,
  },
  noneIcon: { flex: 'none', color: 'var(--blue)', marginTop: 2 },
  noneText: { margin: 0 },
})

const open = (url: string) => window.open(url, '_blank', 'noopener')
const POLL_MS = 5000

export default function Assistants() {
  const nav = useNavigate()
  const user = useStore((s) => s.user)
  const config = useStore((s) => s.config)
  const refreshConfig = useStore((s) => s.refreshConfig)
  const toast = useUI((s) => s.toast)
  const [tokens, setTokens] = useState<ApiToken[] | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const mcp = !!(user && config?.mcp)
  const address = mcpAddress()
  const reach = reachability(address)

  useEffect(() => {
    if (user) refreshConfig?.()
  }, [user])
  const load = useCallback(
    () =>
      listTokens()
        .then((d) => {
          setTokens(d.tokens || [])
          return d.tokens || []
        })
        .catch(() => null),
    [],
  )
  useEffect(() => {
    if (mcp) load()
  }, [mcp, load])

  // While a card is open and that assistant has not called yet, look again every few seconds: the
  // consent screen opens in another tab or app, and coming back should already say "Connected".
  const picked = assistantById(pick)
  const conn = picked && tokens ? connectionOf(tokens, picked.id) : null
  const waiting = !!(mcp && picked && !conn?.used)
  useEffect(() => {
    if (!waiting) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') load()
    }, POLL_MS)
    const back = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', back)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', back)
    }
  }, [waiting, load])

  const copy = async () => {
    if (await copyText(address)) toast(t('Copied'))
  }
  const check = async () => {
    setChecking(true)
    const list = await load()
    setChecking(false)
    const c = list && picked ? connectionOf(list, picked.id) : null
    if (!c || !picked) toast(t('Not connected yet. Finish the steps above, then try again.'))
    else if (!c.used)
      toast(t('Signed in, but {0} hasn’t called yet. Ask it something about your training.', picked.name))
  }
  const revoke = (tok: ConnectorToken) =>
    confirmSheet({
      title: t(
        'Disconnect {0}?',
        assistantById(tok.connector.assistant)?.name || tok.connector.client || t('this assistant'),
      ),
      message: t('It loses access right away. You can connect it again any time.'),
      confirmText: t('Disconnect'),
      danger: true,
      onConfirm: () =>
        revokeToken(tok.id)
          .then((d) => {
            setTokens(d.tokens || [])
            toast(t('Disconnected'))
          })
          .catch((e) => toast(e?.message || t('Something went wrong'))),
    })

  const connected = connectorsOf(tokens)

  return (
    <div className="narrow as-page">
      <div className="hdr">
        <button className="iconbtn" data-back="/settings" onClick={() => nav(-1)} aria-label={t('Back')}>
          <Icon name="chevronLeft" />
        </button>
        <div style={{ flex: 1, marginInlineStart: 12 }}>
          <h1>{t('Use your subscription')}</h1>
        </div>
      </div>
      <p {...stylex.props(x.lead)}>
        {t(
          'Already paying for Claude, ChatGPT or Gemini? Add openGym to that app as a connector. It reads your training and writes routines, on the plan you already have. No API key, no second bill.',
        )}
      </p>

      {!mcp ? (
        <Unavailable user={user} config={config} nav={nav} />
      ) : (
        <>
          <Section
            title={t('Your server address')}
            footer={
              reach === 'public' ? (
                t('Paste it where the app asks for a connector or MCP server URL.')
              ) : (
                <span {...stylex.props(x.warn)}>
                  {reach === 'http'
                    ? t(
                        'This address is plain http. The assistants only connect over https, so put openGym behind https first.',
                      )
                    : t(
                        'This address only works on your home network. The assistant calls from the internet, so it needs a public https address, like a Cloudflare tunnel or a reverse proxy.',
                      )}
                </span>
              )
            }
          >
            <div {...sx('as-addr', x.addr)}>
              <code {...stylex.props(x.addrCode)} translate="no">
                {address}
              </code>
              <div {...stylex.props(x.addrBtns)}>
                <Button size="sm" variant="tinted" icon="copy" onClick={copy}>
                  {t('Copy server address')}
                </Button>
              </div>
            </div>
          </Section>

          <Section title={t('Pick your assistant')}>
            <div {...stylex.props(x.cards)} role="list">
              {ASSISTANTS.map((a) => {
                const c = tokens ? connectionOf(tokens, a.id) : null
                return (
                  <button
                    key={a.id}
                    type="button"
                    role="listitem"
                    {...sx('as-card', x.card, pick === a.id && x.cardOn)}
                    aria-pressed={pick === a.id}
                    onClick={() => setPick((p) => (p === a.id ? null : a.id))}
                  >
                    <span {...stylex.props(x.cardIcon)} style={{ color: a.tint }} aria-hidden="true">
                      <Icon name="chat" />
                    </span>
                    <span {...sx('as-card-t', x.cardTitle)}>{a.name}</span>
                    <span {...stylex.props(x.cardSub)}>
                      {c?.used ? (
                        <span {...sx('as-ok', x.ok)}>
                          <Icon name="checkCircle" /> {t('Connected')}
                        </span>
                      ) : a.limited ? (
                        t('Where available')
                      ) : (
                        t('Connector')
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>

          {picked && (
            <div {...stylex.props(x.detail)} key={picked.id}>
              <p {...stylex.props(x.plan)}>
                <b {...stylex.props(x.planTitle)}>{t('What you need')}</b> {picked.plan()}
              </p>
              <ol {...sx('as-steps', x.steps)}>
                {picked.steps().map((s, i) => (
                  <li key={i} {...stylex.props(x.step)}>
                    <span {...stylex.props(x.stepNum)} aria-hidden="true">
                      {i + 1}
                    </span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <div {...stylex.props(x.btns)}>
                <Button variant="primary" icon="link" onClick={() => open(picked.settingsUrl)}>
                  {t('Open {0}', picked.name)}
                </Button>
                <Button variant="tinted" icon="copy" onClick={copy}>
                  {t('Copy server address')}
                </Button>
              </div>
              <div
                {...sx(['as-status', !!conn?.used && 'ok'], x.status, !!conn?.used && x.statusOk)}
                role="status"
                aria-live="polite"
              >
                {conn?.used ? (
                  <>
                    <Icon name="checkCircle" {...stylex.props(x.statusIcon, x.statusIconOk)} />
                    <span>
                      <b {...stylex.props(x.statusTitle)}>{t('Connected via {0}', picked.name)}</b>
                      {t('Last used {0}', fmtAgo(conn.used))}
                    </span>
                  </>
                ) : conn ? (
                  <>
                    <Icon name="hourglass" {...stylex.props(x.statusIcon)} />
                    <span>
                      <b {...stylex.props(x.statusTitle)}>{t('Signed in')}</b>
                      {t('Waiting for {0} to call. Ask it something about your training.', picked.name)}
                    </span>
                  </>
                ) : (
                  <>
                    <Icon name="hourglass" {...stylex.props(x.statusIcon)} />
                    <span>
                      <b {...stylex.props(x.statusTitle)}>{t('Not connected yet')}</b>
                      {t('This turns green by itself once {0} has signed in and used openGym.', picked.name)}
                    </span>
                  </>
                )}
              </div>
              {conn?.used ? (
                <p {...stylex.props(x.try)}>{picked.tryIt()}</p>
              ) : (
                <Button size="sm" icon="reset" disabled={checking} onClick={check}>
                  {checking ? t('Checking…') : t('Test the connection')}
                </Button>
              )}
            </div>
          )}

          <Section
            title={t('Connected assistants')}
            footer={
              connected.length
                ? t('Each one sees and changes only what you allowed when it signed in.')
                : t('None yet. The steps above take about a minute.')
            }
          >
            {connected.map((tok) => {
              const a = assistantById(tok.connector.assistant)
              return (
                <Row
                  key={tok.id}
                  icon="chat"
                  iconTint={a?.tint || 'var(--grey)'}
                  title={a?.name || tok.connector.client || tok.name}
                  subtitle={[tokenLine(tok.scopes), tok.used ? t('Used {0}', fmtAgo(tok.used)) : t('Never used')].join(
                    ' · ',
                  )}
                  value={t('Disconnect')}
                  accessory="none"
                  onClick={() => revoke(tok)}
                />
              )
            })}
          </Section>
          <p className="sect-f">
            {t('How it works and what each app needs:')}{' '}
            <a href={MCP_REMOTE_DOCS} target="_blank" rel="noopener noreferrer">
              docs/MCP_REMOTE.md
            </a>
          </p>
        </>
      )}
    </div>
  )
}

// Honest about why nothing here can work yet, and what does work right now instead.
function Unavailable({
  user,
  config,
  nav,
}: {
  user: unknown
  config: GetConfig200 | null | undefined
  nav: NavigateFn
}) {
  const why = !user
    ? MOBILE
      ? t(
          'Claude, ChatGPT and Gemini reach openGym over the internet, so they need an openGym server to talk to. This phone keeps your data to itself, so there is nothing for them to connect to yet.',
        )
      : t('Sign in first: the assistant connects to your profile on this server.')
    : config == null
      ? t('Loading…')
      : t(
          'Connectors are switched off on this server. Its admin adds COMPOSE_PROFILES=mcp and MCP=on to the .env and restarts it.',
        )
  const setup = () => nav(MOBILE ? '/coach/setup' : '/coach')
  return (
    <>
      <div {...stylex.props(x.none)} role="note">
        <Icon name="info" {...stylex.props(x.noneIcon)} />
        <p {...stylex.props(x.noneText)}>{why}</p>
      </div>
      <Section
        title={t('What works right now')}
        footer={t('These run the openGym Coach with an AI of your choice. Nothing goes through a server of ours.')}
      >
        <Row
          icon="sparkles"
          iconTint="var(--indigo)"
          title={t('Sign in with OpenRouter')}
          subtitle={t('One sign-in for Claude, GPT, Gemini and more')}
          accessory="chevron"
          onClick={setup}
        />
        <Row
          icon="key"
          iconTint="var(--orange)"
          title={t('Use an API key')}
          subtitle={t('Got Claude Max? Your plan includes monthly API credits for a key.')}
          accessory="chevron"
          onClick={setup}
        />
        <Row
          icon="house"
          iconTint="var(--teal)"
          title={t('A model on your network')}
          subtitle={t('Ollama or LM Studio at home, nothing leaves your Wi-Fi')}
          accessory="chevron"
          onClick={setup}
        />
        <Row
          icon="rocket"
          iconTint="var(--purple)"
          title={t('Run your own openGym server')}
          subtitle={t('Then the connectors work too. About ten minutes with Docker.')}
          accessory="chevron"
          onClick={() => open(SELF_HOSTING_DOCS)}
        />
      </Section>
    </>
  )
}
