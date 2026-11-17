/* Fork: the shared schemas of the api (#/components/schemas).
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import { z } from '@hono/zod-openapi';
import { representative } from './validate.ts';

export const LiveSession = z.object({
  active: z.record(z.string(), z.unknown()).nullable().openapi({ description: 'The session as the app holds it (`entries` and the rest), or null.' }).optional(),
  unit: z.enum(['kg', 'lb']).openapi({ description: 'The unit the session\'s numbers are in.' }).optional(),
  at: z.number().openapi({ description: 'The writer\'s stamp (milliseconds); the newest wins.' })
}).openapi('LiveSession');

export const IntegrationEvent = z.enum(['workout.finished', 'workout.pr', 'weighin.logged']).openapi({
  description: '`workout.finished`: a workout reached the server (from any device). `workout.pr`: that workout set personal records. `weighin.logged`: a new or changed weigh-in. Only events from the last seven days that happened after the connection was made are sent.'
}).openapi('IntegrationEvent');

export const IntegrationConnection = z.object({
  id: z.string().openapi({ example: 'c_3uK8m2Qx9pLa' }).optional(),
  provider: z.string().openapi({ example: 'webhook' }).optional(),
  label: z.string().max(60).openapi({ example: 'Home Assistant' }).optional(),
  events: z.array(IntegrationEvent).optional(),
  paused: z.boolean().optional(),
  status: z.enum(['connected', 'paused', 'attention']).optional(),
  info: z.object({
    url: z.string().openapi({ description: 'Masked.', example: 'https://ha.example.com/api/webhook/…7f3a' }).optional()
  }).optional(),
  createdAt: z.number().int().openapi({ description: 'Epoch ms.' }).optional(),
  lastOk: z.number().int().nullable().openapi({ description: 'Epoch ms of the last delivery that landed.' }).optional(),
  lastError: z.object({
    at: z.number().int().optional(),
    msg: z.string().max(160).optional(),
    code: z.string().openapi({ example: 'busy' }).optional()
  }).nullable().optional(),
  failures: z.number().int().openapi({ description: 'Failed attempts since the last success.' }).optional(),
  queued: z.number().int().optional(),
  failed: z.number().int().openapi({ description: 'Deliveries given up on; Retry sends them again.' }).optional()
}).openapi('IntegrationConnection');

export const SharedItem = z.object({
  id: z.string().openapi({ example: 's_abcdefghijklmnop' }).optional(),
  type: z.string().optional(),
  gymId: z.string().nullable().optional(),
  title: z.string().optional(),
  desc: z.string().optional(),
  lang: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
  summary: z.record(z.string(), z.unknown()).openapi({ description: 'A plan\'s routines and exercise ids' }).optional(),
  media: z.array(z.string()).optional(),
  version: z.number().int().optional(),
  rev: z.number().int().optional(),
  status: z.enum(['live', 'pending', 'hidden', 'withdrawn', 'removed']).optional(),
  createdAt: z.number().int().optional(),
  updatedAt: z.number().int().optional(),
  stats: z.object({
    imports: z.number().int().optional()
  }).optional(),
  by: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    avatar: z.string().nullable().optional()
  }).openapi({ description: 'The uploader, read fresh on every answer. Always there.' }).optional(),
  at: z.number().int().openapi({ description: 'When it was shared (ms).' }).optional(),
  mine: z.boolean().optional(),
  src: z.string().openapi({ description: 'Only on your own items.' }).optional(),
  consentId: z.string().nullable().openapi({ description: 'The consent text the uploader agreed to when sharing it.' }).optional(),
  mod: z.object({
    by: z.string().optional(),
    at: z.number().int().optional(),
    action: z.string().optional(),
    reason: z.string().nullable().optional()
  }).nullable().openapi({ description: 'The last moderation step: on your own hidden, removed or pending items (action and when), and in the admin list (also who and why).' }).optional(),
  owner: z.object({ id: z.string(), name: z.string(), banned: z.boolean() }).openapi({ description: 'Admin list only.' }).optional(),
  reports: z.array(z.object({ by: z.string(), reason: z.string(), note: z.string().nullable().optional(), at: z.number().int() })).openapi({ description: 'Admin list only.' }).optional(),
  importers: z.number().int().openapi({ description: 'Admin list only: how many people imported it.' }).optional(),
  consent: z.object({ v: z.number().int(), at: z.number().int() }).nullable().openapi({ description: 'Admin list only: the consent version agreed to, and when.' }).optional()
}).openapi({
  description: 'One item of the community library, as a client sees it (docs/dev/SHARED-LIBRARY-API.md).'
}).openapi('SharedItem');

export const TokenScopes = z.object({
  workouts: z.enum(['off', 'view', 'apply']).optional(),
  plans: z.enum(['off', 'view', 'apply']).optional(),
  bodyweight: z.enum(['off', 'view', 'apply']).optional(),
  measurements: z.enum(['off', 'view', 'apply']).optional(),
  notes: z.enum(['off', 'view']).optional()
}).openapi({ description: 'Per category `off`, `view` or `apply` (notes at most `view`). Missing is `off`.' }).openapi('TokenScopes');

export const CalendarFeed = z.object({
  on: z.boolean().optional(),
  id: z.string().optional(),
  url: z.string().openapi({ description: 'The address to subscribe to.' }).optional(),
  done: z.boolean().openapi({ description: 'Finished workouts are in it too.' }).optional(),
  created: z.number().int().optional(),
  used: z.number().int().nullable().optional()
}).openapi('CalendarFeed');

export const ApiToken = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  hint: z.string().openapi({ description: 'The six characters after `ogt_`.' }).optional(),
  scopes: TokenScopes.optional(),
  created: z.number().int().optional(),
  exp: z.number().int().nullable().optional(),
  used: z.number().int().nullable().openapi({ description: 'Last use' }).optional(),
  kind: z.enum(['calendar']).openapi({ description: 'Set on a calendar feed\'s token' }).optional(),
  connector: z.object({ assistant: z.enum(['claude', 'chatgpt', 'gemini', 'other']), client: z.string() }).openapi({ description: 'Made by an assistant\'s connector sign-in: which assistant, and the client name it registered.' }).optional()
}).openapi('ApiToken');

export const ErrorBody = z.object({
  error: z.string().openapi({ description: 'Human-readable message. This is the only error shape the API has.' }),
  code: z.string().openapi({
    description: 'A stable reason on the password, throttle and media routes, for a client to word in its own language (`bad-credentials`, `locked`, `too-short`, `media-quota`, …). Media refusals add the numbers to word it with (`maxMB`, `maxSec`, `usedMB`, `quotaMB`).'
  }).optional(),
  retryAfter: z.number().int().openapi({ description: '429 only. The same number of seconds as the Retry-After header.' }).optional(),
  expected: z.string().openapi({ description: 'A refused cross-origin request (`origin-mismatch`): the ORIGIN this server expects.' }).optional(),
  issues: z.array(z.object({ in: z.enum(['body', 'query']), path: z.string(), message: z.string() })).openapi({
    description: 'A request whose shape the spec does not allow (`invalid-request`): what is wrong, at most 20.'
  }).optional(),
  maxMB: z.number().optional(),
  maxSec: z.number().optional(),
  usedMB: z.number().optional(),
  quotaMB: z.number().optional(),
  missing: z.array(z.string()).openapi({ description: 'Files a shared item names that are not uploaded yet (409).' }).optional(),
  consent: z.record(z.string(), z.unknown()).openapi({ description: 'The consent text to agree to first (409 `consent`).' }).optional(),
  rev: z.number().int().openapi({ description: 'The current version of a shared item (412).' }).optional(),
  status: z.string().openapi({ description: 'An inbox item that is no longer open (410 `not-open`): what it is now.' }).optional()
}).openapi('Error');

export const Ok = z.object({
  ok: z.literal(true).optional()
}).openapi('Ok');

export const PasskeyList = z.object({
  passkeys: z.array(z.object({
    id: z.string().openapi({ description: 'WebAuthn credential id (base64url).' }).optional(),
    name: z.string().nullable().optional(),
    created: z.string().nullable().openapi({ description: 'ISO timestamp.' }).optional(),
    lastUsed: z.string().nullable().openapi({ description: 'ISO timestamp of the last sign-in or confirmation with it.' }).optional(),
    transports: z.array(z.string()).optional()
  })).optional(),
  password: z.boolean().openapi({
    description: 'The profile has a password and `PASSWORD_LOGIN` is on, so `current` can prove an addition or a removal.'
  }).optional(),
  lastWayIn: z.boolean().openapi({ description: 'Removing any one passkey would be refused (409 `last-way-in`).' }).optional(),
  deleteBlocked: z.enum(['last-admin']).openapi({
    description: 'Present when deleting this profile (`POST /api/account/delete`) would be refused before any proof is checked: `last-admin`, the only admin while other profiles remain. The delete sheet says so before asking for a passkey or the password; the delete itself still checks.'
  }).optional()
}).openapi({
  example: {
    passkeys: [
      {
        id: 'g3Xq…',
        name: 'Laptop',
        created: '2026-09-23T10:00:00.000Z',
        lastUsed: '2026-09-23T10:00:00.000Z',
        transports: ['internal']
      }
    ],
    password: false,
    lastWayIn: true
  }
}).openapi('PasskeyList');

export const WebAuthnAuthenticationCredential = z.object({
  id: z.string().openapi({ description: 'base64url credential id' }).optional(),
  rawId: z.string().optional(),
  type: z.literal('public-key').optional(),
  response: z.object({
    clientDataJSON: z.string().optional(),
    authenticatorData: z.string().optional(),
    signature: z.string().optional(),
    // Browsers send null when the authenticator returns no user handle.
    userHandle: z.string().nullable().optional()
  }).catchall(z.unknown()).optional()
}).catchall(z.unknown()).openapi({
  description: 'AuthenticationResponseJSON: the value `startAuthentication()` resolves with, sent back verbatim.'
}).openapi('WebAuthnAuthenticationCredential');

export const OwnerProof = z.object({
  cid: z.string().openapi({ description: 'From POST /api/login/options.' }).optional(),
  credential: WebAuthnAuthenticationCredential.optional(),
  current: z.string().optional()
}).openapi({
  description: 'Either a passkey assertion made for this request (`cid` + `credential`), or the profile\'s current password (`current`), which counts only while `PASSWORD_LOGIN` is on. Each assertion is good for one request: its challenge is spent by it.'
}).openapi('OwnerProof');

export const OidcStatus = z.object({
  enabled: z.boolean().optional(),
  issuer: z.string().optional(),
  clientId: z.string().optional(),
  confidential: z.boolean().openapi({ description: 'Whether a client secret is set (never the secret).' }).optional(),
  scopes: z.array(z.string()).optional(),
  label: z.string().optional(),
  only: z.boolean().optional(),
  redirectUri: z.string().optional(),
  groupsClaim: z.string().optional(),
  allowedGroups: z.array(z.string()).optional(),
  roleRules: z.number().int().optional(),
  linkByEmail: z.boolean().optional(),
  logout: z.boolean().openapi({ description: 'OIDC_LOGOUT is on and the provider has an end_session_endpoint.' }).optional(),
  logoutAsked: z.boolean().optional(),
  reachable: z.boolean().optional(),
  keys: z.number().int().optional(),
  algs: z.array(z.string()).optional(),
  lastOk: z.number().int().nullable().optional(),
  lastError: z.string().nullable().optional(),
  lastErrorAt: z.number().int().nullable().optional(),
  linked: z.number().int().openapi({ description: 'Profiles linked to the provider.' }).optional(),
  plainHttp: z.boolean().optional()
}).openapi('OidcStatus');

export const SessionUser = z.object({
  id: z.string().openapi({ description: 'Stable user id (16 base64url chars).' }).optional(),
  name: z.string().optional(),
  owner: z.boolean().openapi({ description: 'Present (true) only for the instance owner.' }).optional(),
  admin: z.boolean().optional(),
  oidc: z.boolean().openapi({ description: 'Present (true) when the profile is linked to the configured identity provider.' }).optional()
}).openapi({
  description: 'The caller\'s identity, as returned by /api/me and the sign-in routes.',
  example: { id: 'Zk3q9XyPbA2LmN0v', name: 'Ada', admin: false }
}).openapi('SessionUser');

export const WebAuthnRegistrationOptions = z.object({
  challenge: z.string().openapi({ description: 'base64url' }).optional(),
  rp: z.object({
    name: z.string().optional(),
    id: z.string().openapi({ description: 'The RP_ID the instance is configured with.' }).optional()
  }).optional(),
  user: z.object({
    id: z.string().openapi({ description: 'base64url user handle' }).optional(),
    name: z.string().optional(),
    displayName: z.string().optional()
  }).optional(),
  pubKeyCredParams: z.array(z.record(z.string(), z.unknown())).optional(),
  authenticatorSelection: z.object({
    residentKey: z.literal('required').optional(),
    requireResidentKey: z.boolean().optional(),
    userVerification: z.literal('preferred').optional()
  }).optional(),
  attestation: z.literal('none').optional()
}).catchall(z.unknown()).openapi({
  description: 'PublicKeyCredentialCreationOptionsJSON. Pass to `startRegistration()` (@simplewebauthn/browser) or decode for `navigator.credentials.create()`. Resident keys are required; attestation is `none`.'
}).openapi('WebAuthnRegistrationOptions');

export const WebAuthnRegistrationCredential = z.object({
  id: z.string().openapi({ description: 'base64url credential id' }).optional(),
  rawId: z.string().optional(),
  type: z.literal('public-key').optional(),
  response: z.object({
    clientDataJSON: z.string().openapi({ description: 'base64url' }).optional(),
    attestationObject: z.string().openapi({ description: 'base64url' }).optional(),
    transports: z.array(z.string()).openapi({ description: 'e.g. ["internal", "hybrid"], stored for later logins.' }).optional()
  }).catchall(z.unknown()).optional()
}).catchall(z.unknown()).openapi({
  description: 'RegistrationResponseJSON: the value `startRegistration()` resolves with (the created credential plus the authenticator\'s attestation response), sent back verbatim.'
}).openapi('WebAuthnRegistrationCredential');

export const WebAuthnAuthenticationOptions = z.object({
  challenge: z.string().openapi({ description: 'base64url' }).optional(),
  rpId: z.string().optional(),
  userVerification: z.literal('preferred').optional(),
  allowCredentials: z.array(z.record(z.string(), z.unknown())).openapi({ description: 'Always empty.' }).optional()
}).catchall(z.unknown()).openapi({
  description: 'PublicKeyCredentialRequestOptionsJSON. Pass to `startAuthentication()`. `allowCredentials` is empty: the browser offers the user\'s discoverable passkeys itself.'
}).openapi('WebAuthnAuthenticationOptions');

export const MediaRef = z.object({
  kind: z.enum(['image', 'gif', 'video', 'audio']).openapi({
    description: '`gif` means animated; a one-frame GIF is an `image`. `audio` is a sound of the user\'s own (`sounds`); its width and height are 1.'
  }),
  hash: z.string().regex(new RegExp('^[0-9a-f]{64}$')).openapi({ description: 'SHA-256 of the stored file.' }),
  mime: z.enum([
  'image/webp',
  'image/jpeg',
  'image/png',
  'image/gif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'audio/wav'
]),
  size: z.number().int().min(1),
  width: z.number().int().min(1).max(16384),
  height: z.number().int().min(1).max(16384),
  dur: z.number().min(0).max(3600).openapi({ description: 'Seconds, one decimal; videos and animated GIFs, absent when unknown.' }).optional(),
  codec: z.enum(['avc1', 'hvc1', 'av01', 'vp09', 'vp8', 'vp9', 'other']).openapi({ description: 'Videos only.' }).optional(),
  poster: z.object({
    hash: z.string().regex(new RegExp('^[0-9a-f]{64}$')).optional(),
    mime: z.enum(['image/webp', 'image/jpeg']).optional(),
    size: z.number().int().optional(),
    width: z.number().int().optional(),
    height: z.number().int().optional()
  }).openapi({ description: 'A still of at most 480 px, always for images and GIFs, when possible for videos.' }).optional(),
  at: z.number().openapi({ description: 'When it was attached' })
}).openapi({
  description: 'What the state knows of an uploaded file. The bytes are behind `GET /api/media/{hash}`; the server keeps a file as long as some `customEx[].media.hash`, `workouts[].media[].hash` or `.poster.hash` of either in the profile\'s state names it, and for `MEDIA_GC_GRACE_DAYS` after.'
}).openapi('MediaRef');

export const Workout = z.object({
  id: z.string().optional(),
  d: z.string().openapi({ description: 'ISO day, e.g. "2026-08-30".', format: 'date' }).optional(),
  start: z.number().openapi({ description: 'ms since epoch' }).optional(),
  end: z.number().optional(),
  routineId: z.string().optional(),
  name: z.string().optional(),
  bw: z.number().openapi({ description: 'Body weight that day, in `unit`.' }).optional(),
  vol: z.number().openapi({ description: 'Total volume (Σ weight × reps).' }).optional(),
  prs: z.array(z.string()).openapi({ description: 'Exercise ids that hit a personal record.' }).optional(),
  entries: z.array(z.object({
    id: z.string().openapi({ description: 'Exercise id.' }).optional(),
    topW: z.number().nullable().optional(),
    sets: z.array(z.object({
      w: z.number().openapi({ description: 'Weight.' }).optional(),
      r: z.number().openapi({ description: 'Reps.' }).optional(),
      done: z.boolean().optional(),
      rir: z.number().optional(),
      rpe: z.number().optional()
    }).catchall(z.unknown())).optional()
  }).catchall(z.unknown())).optional(),
  media: z.array(MediaRef).max(6).openapi({
    description: 'Photos and videos attached to this workout (a progress photo, a form-check clip), at most six in the app. Refs only; the bytes are behind `/api/media/{hash}`, and the server keeps every file any entry here names (the GC walks this list as it walks each custom exercise\'s `media`).'
  }).optional(),
  _ts: z.number().openapi({
    description: 'When this workout was last edited after it was logged, ms, for merging two devices\' copies.'
  }).optional()
}).catchall(z.unknown()).openapi({ description: 'One completed workout (representative shape).' }).openapi('Workout');

export const Routine = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  emoji: z.string().optional(),
  ex: z.array(z.record(z.string(), z.unknown())).openapi({ description: 'Exercises with set/rep targets.' }).optional()
}).catchall(z.unknown()).openapi({ description: 'A workout template (representative shape).' }).openapi('Routine');

export const BodyweightEntry = z.object({
  d: z.string().openapi({ format: 'date' }).optional(),
  w: z.number().openapi({ description: 'The day\'s weight in `unit` (see the description).' }).optional(),
  t: z.number().openapi({ description: 'When the day was last edited (ms)' }).optional(),
  src: z.string().openapi({ description: 'Set when every weigh-in of the day was read from a health app or a file.' }).optional(),
  ins: z.array(z.object({
    id: z.string().openapi({ description: 'Unique within the day. \'0\' is the weigh-in a day from before held.' }).optional(),
    at: z.string().nullable().openapi({ description: 'Local time of day, HH:MM; null when not known.' }).optional(),
    w: z.number().openapi({ description: 'Weight in `unit`.' }).optional(),
    t: z.number().openapi({ description: 'When this weigh-in was last edited (ms).' }).optional(),
    src: z.string().openapi({ description: 'Read from a health app or a file.' }).optional(),
    sid: z.string().openapi({ description: 'The health app\'s own id of the sample.' }).optional()
  }).catchall(z.unknown())).openapi({ description: 'The day\'s weigh-ins, by time (#859).' }).optional(),
  gone: z.record(z.string(), z.number()).openapi({ description: 'Weigh-ins removed from a day that keeps others, id → when (ms).' }).optional()
}).catchall(z.unknown()).openapi({
  description: 'One day of weigh-ins. `w` is the day\'s one value, the one the profile\'s `bwDaily` setting picks from `ins` (first, the default; avg; last), so a reader that knows nothing of `ins` gets the same number the app charts. A day from before v1.4.4 has no `ins`: one weigh-in without a time. A client that writes `w` and `t` of a day with `ins` (an older app correcting the day) has that taken as a correction of the weigh-in `w` came from.'
}).openapi('BodyweightEntry');

export const CustomExercise = z.object({
  id: z.string().optional(),
  n: z.string().openapi({ description: 'Name.' }).optional(),
  bp: z.string().openapi({ description: 'Body part.' }).optional(),
  custom: z.literal(true).optional(),
  media: MediaRef.optional(),
  url: z.string().max(2048).openapi({
    description: 'One link: a video or a guide. http(s) only, no credentials. Neither the app nor the server ever fetches it: the app opens it in a new browsing context on a tap.',
    format: 'uri'
  }).optional(),
  _ts: z.number().openapi({ description: 'When this entry was last edited, ms, for merging two devices\' copies.' }).optional()
}).catchall(z.unknown()).openapi({
  description: 'One exercise the user made (representative shape). The server stores it as sent and reads only `media` from it, to know which uploaded files are still referenced.'
}).openapi('CustomExercise');

// Representative, not enforced (its own description says so): see openapi/validate.ts.
export const State = representative(z.object({
  _ts: z.number().openapi({ description: 'Client-set last-write timestamp (ms since epoch); drives sync.' }).optional(),
  _rev: z.number().int().openapi({
    description: 'Server-set revision, incremented on every accepted PUT. Ignored when sent by a client.',
    readOnly: true
  }).optional(),
  _wid: z.string().openapi({
    description: 'Server-set id of this write (16 hex characters), new on every accepted PUT.',
    readOnly: true
  }).optional(),
  _wids: z.array(z.string()).openapi({
    description: 'The write ids of the documents this one descends from, oldest first (up to 50).',
    readOnly: true
  }).optional(),
  deleted: z.record(z.string(), z.record(z.string(), z.number())).openapi({
    description: 'When entries were removed, per list and entry key ({ workouts: { <id>: ms } }, weigh-ins by day, favourites by exercise id). A negative stamp is an add-back after a removal. Never shrinks on the server; stamped for writers that do not stamp (see PUT /api/data).'
  }).optional(),
  edited: z.record(z.string(), z.number()).openapi({
    description: 'When each setting and plan day was last changed, ms ({ queue: ms, \'week.3\': ms, … }). Never shrinks on the server; stamped for writers that do not stamp (see PUT /api/data).'
  }).optional(),
  unit: z.enum(['kg', 'lb']).optional(),
  lang: z.string().openapi({ description: 'UI language code ("en", "de", "pt", …); also localizes pushes.' }).optional(),
  theme: z.string().optional(),
  accent: z.string().optional(),
  workouts: z.array(Workout).openapi({ description: 'Completed workouts, chronological.' }).optional(),
  routines: z.array(Routine).optional(),
  queue: z.record(z.string(), z.unknown()).nullable().openapi({
    description: 'A planner\'s floating week {ids, since, startsOn, label}. The week\'s sessions as an ordered queue, the first undone one is today\'s. Written by an API client or by the app\'s own rotation feature, read by the reminder tick.'
  }).optional(),
  week: z.record(z.string(), z.union([z.string(), z.array(z.string())])).openapi({ description: 'Weekly plan: weekday (0=Sunday … 6) → routine id, or several (a list).' }).optional(),
  dayPlan: z.record(z.string(), z.string()).openapi({ description: 'Per-date overrides: ISO date → routine id, or "rest". Wins over `week`.' }).optional(),
  bodyweight: z.array(BodyweightEntry).optional(),
  customEx: z.array(CustomExercise).openapi({ description: 'User-created exercises (id, name, muscles…).' }).optional(),
  exWeights: z.record(z.string(), z.record(z.string(), z.unknown())).openapi({ description: 'Per-exercise last/best weight memory: exercise id → {w, d}.' }).optional(),
  reminder: z.object({
    on: z.boolean().optional(),
    time: z.string().openapi({ example: '08:00' }).optional(),
    tz: z.string().nullable().openapi({ description: 'IANA zone ("Europe/Zurich"); the user\'s own clock.' }).optional()
  }).openapi({
    description: 'Daily "workout planned today" push. The server reads this: at `time` (HH:MM, in `tz`) it sends one push if a routine is planned and nothing was logged yet.'
  }).optional(),
  restSec: z.number().openapi({ description: 'Default rest-timer seconds.' }).optional(),
  effort: z.enum(['none', 'rir', 'rpe']).nullable().optional(),
  equipProfiles: z.array(z.record(z.string(), z.unknown())).optional(),
  settings: z.record(z.string(), z.unknown()).openapi({
    description: 'Catch-all note: the remaining top-level keys (sound, keepAwake, gifSize, targetW, autoBackup, …) are flat settings values like the ones above.'
  }).optional()
}).catchall(z.unknown()).openapi({
  description: `The whole app state as one blob. The server treats it as opaque (it only
strips \`active\` on save and reads a few fields for reminders and the admin
dashboard). The schema below is **representative, not enforced** (except
\`workouts\` and \`routines\`, which must be arrays (or null) when present), and grows
with the app. Concurrent writes are caught by the server's revision (\`_rev\`,
see PUT /api/data); the client merges the two documents and decides by \`_ts\`
which side's settings win.`
}).openapi('State'));

export const MediaConfig = z.object({
  builtin: z.literal(true).openapi({ description: 'This instance keeps a photo or video of your own on a built-in exercise too (`exMedia`). Absent on an instance from before.' }).optional(),
  imageMB: z.number().openapi({ description: 'A photo after the app re-encoded it, or a poster.' }).optional(),
  gifMB: z.number().optional(),
  videoMB: z.number().optional(),
  videoSec: z.number().optional(),
  audioMB: z.number().openapi({ description: 'A sound of the user\'s own (a WAV of at most 30 s).' }).optional(),
  quotaMB: z.number().openapi({ description: 'Per profile; 0 = no cap.' }).optional(),
  sounds: z.literal(true).openapi({
    description: 'This instance keeps the sounds of the user\'s own for the rest timer (`sounds`, v1.4.5). Absent on an instance from before; the app then keeps them on the device.'
  }).optional(),
  avatar: z.literal(true).openapi({
    description: 'This instance keeps the user\'s profile picture (`avatar.m`, a 256 px square, v1.4.5). It is served like every other file, from the caller\'s own folder only. Absent on an instance from before; the app then keeps the picture on the device that set it.'
  }).optional(),
  workouts: z.literal(true).openapi({
    description: 'This instance keeps the files a logged workout\'s `media` list names too, not only a custom exercise\'s. Absent on an instance from before; the app then offers photos and videos on custom exercises only.'
  }).optional(),
  days: z.literal(true).openapi({
    description: 'This instance also keeps the files of progress photos filed under a day (`dayPhotos`, a photo for a day without a workout). Absent on an instance from before; the app then only adds photos to logged workouts there.'
  }).optional(),
  sets: z.literal(true).openapi({
    description: 'This instance also keeps the files of a form video filmed for one set (`workouts[].entries[].sets[].media`, v1.4.4). Absent on an instance from before; the app then keeps a set\'s video on the phone that filmed it and never uploads it.'
  }).optional()
}).openapi({
  description: 'The instance\'s media caps (`MEDIA_*`), in MB of 2^20 bytes. Absent when the instance runs with `MEDIA_UPLOADS=0`.',
  example: {
    imageMB: 2,
    gifMB: 8,
    videoMB: 100,
    videoSec: 60,
    quotaMB: 200,
    workouts: true,
    days: true,
    sets: true
  }
}).openapi('MediaConfig');

export const MediaUsage = z.object({
  bytes: z.number().int().openapi({ description: 'What the profile\'s stored files take.' }).optional(),
  count: z.number().int().optional(),
  quotaBytes: z.number().int().openapi({ description: 'The cap; 0 = no cap.' }).optional()
}).openapi('MediaUsage');

export const MediaStored = z.object({
  ok: z.literal(true).optional(),
  hash: z.string().optional(),
  mime: z.string().openapi({ description: 'What the bytes are, not necessarily what was declared.' }).optional(),
  size: z.number().int().optional(),
  existed: z.boolean().openapi({ description: 'The server already had this file.' }).optional()
}).openapi('MediaStored');

export const PushSubscription = z.object({
  endpoint: z.string().openapi({ description: 'Public https:// push-service URL.', format: 'uri' }),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string()
  })
}).openapi({ description: 'The browser\'s PushSubscription.toJSON(); only these fields are stored.' }).openapi('PushSubscription');

export const Presence = z.object({
  name: z.string().optional(),
  exIdx: z.number().int().optional(),
  exTotal: z.number().int().optional(),
  setsDone: z.number().int().optional(),
  setsTotal: z.number().int().optional(),
  startedAt: z.number().optional(),
  updatedAt: z.number().optional()
}).openapi({ description: 'Live-workout snapshot (from /api/activity heartbeats).' }).openapi('Presence');

export const AdminUserRow = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  created: z.string().nullable().openapi({ description: 'ISO timestamp.' }).optional(),
  disabled: z.boolean().optional(),
  owner: z.boolean().openapi({ description: 'The one admin who manages the others.' }).optional(),
  admin: z.boolean().optional(),
  invitedBy: z.string().nullable().openapi({ description: 'The invite code this account was created with.' }).optional(),
  workouts: z.number().int().openapi({ description: 'Total logged workouts.' }).optional(),
  lastWorkout: z.string().nullable().openapi({ description: 'ISO day of the newest workout.' }).optional(),
  lastSync: z.number().nullable().openapi({ description: 'The state\'s `_ts` (ms).' }).optional(),
  hasPush: z.boolean().openapi({ description: 'Has at least one push subscription.' }).optional(),
  live: Presence.nullable().openapi({ description: 'Currently training, or null.' }).optional(),
  password: z.boolean().openapi({ description: 'PASSWORD_LOGIN instances only. The profile has a password.' }).optional(),
  email: z.string().nullable().openapi({ description: 'PASSWORD_LOGIN instances only. The e-mail the profile signs in with, if any.' }).optional()
}).openapi('AdminUserRow');

export const AdminUserDetail = z.object({
  user: z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    created: z.string().nullable().optional(),
    disabled: z.boolean().optional(),
    owner: z.boolean().openapi({ description: 'The one admin who manages the others.' }).optional(),
    admin: z.boolean().optional(),
    invitedBy: z.string().nullable().optional(),
    password: z.boolean().openapi({ description: 'PASSWORD_LOGIN instances only.' }).optional(),
    email: z.string().nullable().openapi({ description: 'PASSWORD_LOGIN instances only. The sign-in e-mail, if any.' }).optional(),
    resetUntil: z.number().nullable().openapi({ description: 'PASSWORD_LOGIN instances only. Expiry (ms) of an unused reset code.' }).optional(),
    recoveryUntil: z.number().nullable().openapi({
      description: 'Expiry (ms) of an unused recovery code (POST /api/admin/user/recovery, recover.js).'
    }).optional()
  }).optional(),
  unit: z.enum(['kg', 'lb']).optional(),
  lastSync: z.number().nullable().optional(),
  data_view: z.boolean().openapi({
    description: 'true only with ADMIN_DATA_VIEW on: then routines, bodyweight and workouts are present.'
  }).optional(),
  hasPush: z.boolean().optional(),
  bytes: z.number().int().openapi({ description: 'Size of the state file on disk.' }).optional(),
  counts: z.object({
    workouts: z.number().int().optional(),
    bodyweight: z.number().int().optional(),
    measurements: z.number().int().optional(),
    routines: z.number().int().optional()
  }).optional(),
  roles: z.record(z.string(), z.unknown()).openapi({ description: 'TRAINERS on only. Studio roles, free-trainer status, gyms joined.' }).optional(),
  grants: z.number().int().openapi({ description: 'TRAINERS on only. Active sharing grants of this member.' }).optional(),
  routines: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    emoji: z.string().optional(),
    count: z.number().int().openapi({ description: 'Number of exercises.' }).optional()
  })).optional(),
  bodyweight: z.array(BodyweightEntry).optional(),
  workouts: z.array(Workout).openapi({ description: 'Full history, newest first.' }).optional()
}).openapi('AdminUserDetail');

export const Invite = z.object({
  code: z.string().openapi({ description: '16 hex chars.' }).optional(),
  note: z.string().optional(),
  createdBy: z.string().openapi({ description: 'Admin user id.' }).optional(),
  created: z.string().openapi({ description: 'ISO timestamp.' }).optional(),
  usedBy: z.string().nullable().openapi({ description: 'User id that redeemed the code (absent/null while unused).' }).optional(),
  usedAt: z.string().optional(),
  usedByName: z.string().nullable().openapi({ description: 'Resolved display name (only in GET /api/admin/invites).' }).optional()
}).catchall(z.unknown()).openapi('Invite');

export const AuditEvent = z.object({
  id: z.number().int().openapi({ description: 'Monotonic, never reset; a cleared log leaves a visible id gap.' }),
  ts: z.number().openapi({ description: 'ms since epoch.' }),
  ev: z.string().openapi({
    description: `Event name. Currently one of:
\`auth.register.ok|fail|denied\`, \`auth.login.ok|fail\`, \`auth.logout\`,
\`auth.logout.all\`, \`auth.account.delete\`, \`auth.pair.create|ok|fail\`,
\`admin.denied\`, \`admin.user.disable|enable\`,
\`admin.invite.create|revoke\`, \`admin.audit.clear\`.`
  }),
  ok: z.boolean().openapi({ description: 'false for failed/denied attempts.' }),
  uid: z.string().openapi({ description: 'Acting (or affected) user id.' }).optional(),
  name: z.string().openapi({ description: 'Acting user\'s name (max 40 chars).' }).optional(),
  tgt: z.string().openapi({ description: 'Target user id (admin actions).' }).optional(),
  tname: z.string().openapi({ description: 'Target user\'s name.' }).optional(),
  msg: z.string().openapi({
    description: 'Short detail: a failure reason code, or the invite code involved. Rejected invite guesses and unknown credential ids are deliberately never recorded.'
  }).optional(),
  ip: z.string().openapi({
    description: 'Only when AUDIT_IP is on: the full address (`full`) or just the network, /24 or /48 (`net`).'
  }).optional()
}).openapi({
  description: 'One line of the audit log.',
  example: { id: 421, ts: 1756500000000, ev: 'auth.login.ok', ok: true, uid: 'Zk3q9XyPbA2LmN0v', name: 'Ada' }
}).openapi('AuditEvent');

export const CoachCap = z.object({
  used: z.number().int().optional(),
  limit: z.number().int().openapi({ description: '0 means no per-profile cap.' }).optional()
}).openapi({ description: 'What this profile has spent of its daily allowance.' }).openapi('CoachCap');

export const CoachProposal = z.object({
  id: z.string().openapi({ description: 'The job\'s id.' }).optional(),
  kind: z.enum(['create', 'review', 'debrief']).optional(),
  createdAt: z.number().int().openapi({ description: 'Epoch ms.' }).optional(),
  expiresAt: z.number().int().openapi({ description: 'Epoch ms.' }).optional(),
  planHash: z.string().openapi({ description: 'The plan this was written against. A later edit makes it stale.' }).optional(),
  iteration: z.number().int().openapi({ description: '1, or higher after a refine.' }).optional(),
  trigger: z.enum(['scheduled']).openapi({ description: 'Present when an automatic review made it, which nobody was watching for.' }).optional(),
  summary: z.string().max(4000).optional(),
  changes: z.array(z.object({
    id: z.string().optional(),
    type: z.enum([
  'add-exercise',
  'remove-exercise',
  'swap-exercise',
  'sets',
  'reps',
  'repsMin',
  'repsMax',
  'sec',
  'cardio',
  'reorder',
  'superset',
  'routine-prog',
  'exercise-prog',
  'inc',
  'add-routine',
  'remove-routine',
  'rename-routine',
  'week'
]).optional(),
    why: z.string().optional(),
    before: z.unknown().openapi({ description: 'What the plan says now. The client checks it before applying.' }).optional(),
    after: z.unknown().openapi({ description: 'What it would say.' }).optional()
  }).catchall(z.unknown())).openapi({ description: 'A review\'s change-set, each one applied or rejected on its own.' }).optional(),
  evidence: z.object({
    from: z.string().nullable().optional(),
    to: z.string().nullable().optional(),
    sessions: z.number().int().nullable().optional()
  }).openapi({ description: 'The window the review read.' }).optional(),
  notes: z.array(z.string()).optional(),
  bundle: z.object({
    opengym_plan: z.literal(1).optional(),
    name: z.string().max(40).optional(),
    summary: z.string().optional(),
    basedOn: z.string().optional(),
    week: z.record(z.string(), z.unknown()).optional(),
    routines: z.array(z.record(z.string(), z.unknown())).optional(),
    customEx: z.array(z.record(z.string(), z.unknown())).optional()
  }).catchall(z.unknown()).openapi({ description: 'A whole plan, from a `create` job (routines, week and any custom exercises).' }).optional(),
  score: z.number().int().min(1).max(10).openapi({ description: 'A debrief\'s score for the session.' }).optional(),
  highlights: z.array(z.string()).optional(),
  watch: z.array(z.string()).optional(),
  nextTime: z.array(z.string()).optional(),
  workout: z.record(z.string(), z.unknown()).openapi({ description: 'Which session a debrief read.' }).optional()
}).catchall(z.unknown()).openapi({
  description: `The answer waiting for a decision, from whichever kind of job produced it. It
expires 14 days after it was made; the first status poll after that retires it.
\`changes\` comes from a review, \`bundle\` from a plan, \`score\`/\`highlights\` from a
debrief. One of the three, never more.`
}).openapi('CoachProposal');

export const CoachStatus = z.object({
  job: z.object({
    id: z.string().optional(),
    kind: z.enum(['create', 'review', 'debrief']).optional(),
    state: z.enum(['queued', 'running']).optional(),
    startedAt: z.number().int().openapi({ description: 'Epoch ms.' }).optional()
  }).nullable().openapi({ description: 'The job running now, or null. One at a time per profile.' }).optional(),
  pending: CoachProposal.nullable().optional(),
  cap: CoachCap.optional(),
  maxMessageLen: z.number().int().min(200).max(4000).openapi({
    description: `The longest note or refinement this instance keeps, in characters. It rides on the
poll so a chat that is already open follows an admin's change.`
  }).optional(),
  last: z.object({
    id: z.string().optional(),
    kind: z.enum(['create', 'review', 'debrief']).optional(),
    outcome: z.enum(['ready', 'nochange', 'applied', 'dismissed', 'expired', 'failed']).optional(),
    errorClass: z.string().nullable().openapi({
      description: `Why a failed job failed. Provider failures are sorted by cause:
\`auth\` (the credential was refused), \`quota\` (out of quota or rate limited),
\`schema\` (the endpoint will not serve the request shape), \`outage\` (5xx past
the retries), \`unreachable\` (nothing answered), \`timeout\` (no answer in the
job budget), \`missing\` (no key or runtime), \`provider\` (anything else it
refused), \`unusable\` (it answered outside the contract). Job-level classes:
\`restart\`, \`forgotten\`, \`consent\`, \`noworkout\`, \`toolarge\`, \`nostate\`, \`off\`.`
    }).optional(),
    message: z.string().openapi({
      description: `The short user-facing line for that failure, when the class has one. Present
only on failures a provider caused; a client that has its own translated
line for \`errorClass\` may prefer it. Never contains provider detail.`
    }).optional(),
    at: z.number().int().openapi({ description: 'Epoch ms.' }).optional(),
    trigger: z.enum(['scheduled']).openapi({ description: 'Present when it was an automatic review.' }).optional(),
    reading: z.string().openapi({ description: 'Present on `nochange`: why there was nothing to change.' }).optional()
  }).openapi({ description: 'How the most recent job ended, so the chat can say so in the Coach\'s own voice.' }).nullable().optional()
}).openapi('CoachStatus');

export const CoachIntake = z.object({
  goal: z.string().openapi({ description: 'e.g. `muscle`, `strength`, `fat-loss`.' }).optional(),
  experience: z.string().optional(),
  daysPerWeek: z.number().int().optional(),
  preferredDays: z.array(z.number().int()).openapi({ description: '0 = Sunday.' }).optional(),
  sessionMin: z.number().int().openapi({ description: 'Minutes per session.' }).optional(),
  equipment: z.array(z.string()).optional(),
  limitations: z.string().openapi({ description: 'Injuries and anything to work around.' }).optional()
}).catchall(z.unknown()).openapi({
  description: 'The intake answers, as the plan screen collects them. Stored in the profile\'s own state as well; sent here so a plan can be asked for with answers that have not been synced yet.'
}).openapi('CoachIntake');

export const CoachCohort = z.object({
  ok: z.boolean().optional(),
  enabled: z.boolean().optional(),
  sharing: z.boolean().optional(),
  people: z.number().int().optional(),
  minPeople: z.number().int().openapi({ description: 'Three. Below it nothing is computed at all.' }).optional(),
  unit: z.enum(['kg', 'lb']).openapi({ description: 'The reader\'s own unit. Every number below is in it.' }).optional(),
  sessionsPerWeek: z.object({
    median: z.number().optional(),
    you: z.number().optional()
  }).optional(),
  exercises: z.array(z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    people: z.number().int().optional(),
    median: z.number().nullable().optional(),
    you: z.number().nullable().optional()
  })).optional(),
  rankPct: z.number().int().nullable().openapi({
    description: 'Share of the others at or below this profile, averaged over the listed exercises.'
  }).optional()
}).openapi({
  description: `Medians across the profiles that opted in, and where this one stands among them.
\`ok\` is false whenever there is nothing to show, and the other flags say why:
the admin has the comparison switched off (\`enabled: false\`), this profile does
not share (\`sharing: false\`), or there are not yet three who do.`
}).openapi('CoachCohort');

export const AdminCoach = z.object({
  disabledByEnv: z.boolean().openapi({ description: 'COACH_DISABLED is set, so nothing the admin toggles matters.' }).optional(),
  enabled: z.boolean().optional(),
  provider: z.string().optional(),
  providers: z.array(z.object({
    id: z.string().optional(),
    label: z.string().optional(),
    runtime: z.string().openapi({ description: 'The runtime it spawns, when it spawns one.' }).optional(),
    setupToken: z.boolean().optional(),
    deviceLogin: z.boolean().optional(),
    apiKey: z.boolean().optional(),
    http: z.boolean().optional(),
    baseUrl: z.boolean().openapi({ description: 'Whether its endpoint is configurable.' }).optional(),
    keyOptional: z.boolean().optional(),
    keyPlaceholder: z.string().nullable().optional(),
    defaultModel: z.string().nullable().optional(),
    connected: z.boolean().openapi({ description: 'Whether a credential is already filed for it.' }).optional()
  })).openapi({ description: 'Every provider this build knows, and what each one needs.' }).optional(),
  model: z.string().openapi({ description: 'The model in force for the active provider.' }).optional(),
  models: z.record(z.string(), z.unknown()).openapi({ description: 'Model per provider. Switching provider keeps them all.' }).optional(),
  baseUrl: z.string().nullable().optional(),
  knownModels: z.array(z.string()).nullable().openapi({ description: 'From the live check, when the provider could be asked.' }).optional(),
  caps: z.object({
    perProfileDaily: z.number().int().optional(),
    instanceDaily: z.number().int().optional()
  }).optional(),
  maxMessageLen: z.number().int().openapi({
    description: 'How long a chat message, refinement or review note can be (200–4000, default 1000).'
  }).optional(),
  community: z.boolean().optional(),
  runtime: z.object({
    ok: z.boolean().optional(),
    version: z.string().nullable().optional(),
    error: z.string().nullable().optional(),
    needsKey: z.boolean().optional()
  }).openapi({ description: 'The live check performed while answering this request.' }).optional(),
  authMode: z.enum(['instance', 'profile']).optional(),
  boundUid: z.string().nullable().openapi({ description: 'The profile an instance credential bound itself to, once one has spent it.' }).optional(),
  auth: z.object({
    state: z.enum(['not-required', 'none', 'optional', 'connected', 'unreadable']).optional(),
    type: z.string().nullable().optional(),
    account: z.string().nullable().optional(),
    connectedAt: z.string().openapi({ format: 'date-time' }).nullable().optional()
  }).openapi({
    description: 'Whether a credential is filed, and whose. `unreadable` is its own state because it has a specific cause and a specific fix: ./data restored without its `secret`.'
  }).optional(),
  unprivileged: z.object({
    ok: z.boolean().optional(),
    dropped: z.boolean().optional(),
    why: z.string().optional()
  }).openapi({
    description: 'Whether the privilege drop can be performed. It fails closed: if `ok` is false no job runs at all, and the admin needs to hear that here rather than from a user.'
  }).optional(),
  jobsToday: z.number().int().optional(),
  lastSuccess: z.string().openapi({ format: 'date-time' }).nullable().optional(),
  lastError: z.unknown().openapi({ description: 'The last failure the instance log recorded, or null.' }).optional(),
  recent: z.array(z.object({
    at: z.string().openapi({ format: 'date-time' }).optional(),
    kind: z.string().optional(),
    trigger: z.enum(['manual', 'scheduled']).optional(),
    outcome: z.string().optional(),
    errorClass: z.string().nullable().optional(),
    ms: z.number().int().optional()
  })).openapi({ description: 'The last 20 jobs, newest first. Counts and outcomes only, never contents.' }).optional()
}).openapi({
  description: 'The whole admin card in one answer. Never a credential, only whether one is filed.'
}).openapi('AdminCoach');

