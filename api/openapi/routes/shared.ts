/* Fork: the "shared" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, SharedItem } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const listShared = {
  method: 'get',
  path: '/api/shared',
  operationId: 'listShared',
  tags: ['shared'],
  summary: 'Browse the community library of this server',
  description: `Items people shared with everyone on this server (\`LIBRARY=on\`), newest or most
imported first, 50 a page. Live items the caller may see, plus the caller's own in any
status. Every item carries \`by\` (the uploader's current name and, when they shared one,
their profile picture's hash) and \`at\` (when it was shared). A plan comes with a
\`summary\` instead of its payload; \`GET /api/shared/{id}\` has the whole thing.
Budget \`library.list\` (600 an hour).`,
  request: {
      query: z.object({
        type: z.enum([
  'sound',
  'exercise',
  'plan',
  'equipment',
  'tip',
  'look',
  'measures',
  'avatar',
  'photo',
  'formvideo',
  'progress'
]).optional(),
        q: z.string().openapi({ description: 'Words that must all appear (title, description, names).' }).optional(),
        lang: z.string().openapi({ description: 'Comma-separated languages, e.g. `de,en`.' }).optional(),
        sort: z.enum(['new', 'popular']).optional(),
        ex: z.string().openapi({ description: 'Tips about this exercise id only.' }).optional(),
        mine: z.string().openapi({ description: '`1`: only the caller\'s own items, in every status.' }).optional(),
        gym: z.string().openapi({ description: 'A gym id, or `server` for items open to the whole server.' }).optional(),
        cursor: z.string().optional()
      })
    },
  responses: {
      '200': {
        description: 'One page.',
        content: {
          'application/json': { schema: z.object({
              items: z.array(SharedItem).optional(),
              next: z.string().nullable().optional(),
              total: z.number().int().optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '404': R.SharingOff,
      '429': R.RateLimited
    }
} satisfies RouteConfig;

export const publishShared = {
  method: 'post',
  path: '/api/shared',
  operationId: 'publishShared',
  tags: ['shared'],
  summary: 'Share one of your own items with everyone on this server',
  description: `Needs the current library consent with \`own: true\` ("It's mine to share"): without the
tick \`400 consent-own\`, with an older text \`409 consent-outdated\` and the current one.
Files named in the payload must be in the caller's own uploads (\`PUT /api/media/{hash}\`)
first, else \`409 media-missing\` with the list. Each file is checked again before it is
copied into the shared folder: its type, the sharing caps (\`SHARE_VIDEO_MAX_MB\` 25,
sounds 30 s, a profile picture 32 KB), no Exif, XMP, text chunks or MP4 metadata boxes
(\`422 media-metadata\`), no WebM (\`422 media-webm\`), and never a file of the built-in
exercise library or one an admin removed (\`422 media-blocked\`, by SHA-256). Starts
\`pending\` with \`SHARE_REVIEW=on\`, and always for personal photos and videos.
Budget \`library.publish\` (20 an hour). Logged as \`shared.publish\`.`,
  request: {
      body: {
        content: {
          'application/json': { schema: z.object({
              type: z.string(),
              src: z.string().openapi({ description: 'Which of your own things this is (`sound:<id>`); only ever sent back to you.' }).optional(),
              title: z.string().max(60).optional(),
              desc: z.string().max(500).optional(),
              lang: z.string().optional(),
              gymId: z.string().nullable().optional(),
              payload: z.record(z.string(), z.unknown()).openapi({
                description: 'Per type: sound `{name, m}`, exercise `{ex, media?}`, plan `{bundle}`, equipment `{name, profile}`, tip `{exId, exName, text}`, look `{flame?, freeze?, accent?}`, measures `{fields}`, avatar `{m}`, photo/progress/formvideo `{media, caption, exId?}`. Files are MediaRefs.'
              }),
              consent: z.object({
                v: z.number().int().optional(),
                hash: z.string().optional(),
                own: z.boolean().optional()
              })
            }) }
        }
      }
    },
  responses: {
      '404': R.err('The community library is off on this server (`sharing-off`).'),
      '201': {
        description: 'Shared (or waiting for an admin).',
        content: {
          'application/json': { schema: z.object({
              id: z.string().optional(),
              status: z.enum(['live', 'pending']).optional(),
              item: SharedItem.optional()
            }) }
        }
      },
      '400': {
        description: '`consent-own`, `type-off`, `bad-payload`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: '`banned` or `not-in-gym`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '409': {
        description: '`consent-outdated` (with `consent`), `media-missing` (with `missing`), `too-many`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '413': {
        description: '`quota` or `media-too-large`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '422': {
        description: '`media-metadata`, `media-webm`, `media-blocked`, `media-type`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': R.RateLimited
    }
} satisfies RouteConfig;

export const getShared = {
  method: 'get',
  path: '/api/shared/{id}',
  operationId: 'getShared',
  tags: ['shared'],
  summary: 'One shared item with its whole payload',
  description: 'An item the caller may not see answers exactly like one that does not exist (404 `not-found`).',
  request: {
      params: z.object({
        id: z.string().regex(new RegExp('^s_[a-z2-7]{16}$'))
      })
    },
  responses: {
      '200': {
        description: 'The item.',
        content: {
          'application/json': { schema: z.object({
              item: SharedItem.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '404': R.SharingOff
    }
} satisfies RouteConfig;

export const editShared = {
  method: 'patch',
  path: '/api/shared/{id}',
  operationId: 'editShared',
  tags: ['shared'],
  summary: 'A new title, description or version of your item',
  description: `\`If-Match: <rev>\` (or \`rev\` in the body) is the revision the editor saw; another one is
\`412 rev-mismatch\`. A new \`payload\` is a new version (\`version\` + 1) and goes through
every check a first share does; on a reviewed server it waits for an admin again.
People who imported an older version keep it and are told a new one exists.
Budget \`library.edit\` (60 an hour).`,
  request: {
      params: z.object({
        id: z.string().regex(new RegExp('^s_[a-z2-7]{16}$'))
      }),
      body: {
        content: {
          'application/json': { schema: z.object({
              rev: z.number().int().optional(),
              title: z.string().optional(),
              desc: z.string().optional(),
              lang: z.string().optional(),
              payload: z.record(z.string(), z.unknown()).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'The new rev and version.',
        content: {
          'application/json': { schema: z.object({
              rev: z.number().int().optional(),
              version: z.number().int().optional(),
              status: z.string().optional(),
              item: SharedItem.optional()
            }) }
        }
      },
      '403': {
        description: '`not-owner` or `banned`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': R.SharingOff,
      '412': {
        description: '`rev-mismatch`, with the current `rev`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const withdrawShared = {
  method: 'delete',
  path: '/api/shared/{id}',
  operationId: 'withdrawShared',
  tags: ['shared'],
  summary: 'Stop sharing your item',
  description: 'The item leaves the library for new imports (`withdrawn`); copies people already took stay theirs. Logged as `shared.withdraw`.',
  request: {
      params: z.object({
        id: z.string().regex(new RegExp('^s_[a-z2-7]{16}$'))
      })
    },
  responses: {
      '200': {
        description: 'Withdrawn.',
        content: {
          'application/json': { schema: z.object({
              status: z.enum(['withdrawn']).optional()
            }) }
        }
      },
      '403': {
        description: '`not-owner`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '404': R.SharingOff
    }
} satisfies RouteConfig;

export const importShared = {
  method: 'post',
  path: '/api/shared/{id}/import',
  operationId: 'importShared',
  tags: ['shared'],
  summary: 'Copy a shared item into your own profile',
  description: `Only a live item. Its files are copied into the caller's own upload folder, against the
caller's media quota (\`413 media-quota\`), so the copy keeps working when the original is
withdrawn. Answers the payload and an \`origin\` (\`kind: library\`, the item id, its
version, \`by\` and \`at\` frozen now, this server's ORIGIN) for the app to merge into its
state. Counted once per person. Budget \`library.import\` (120 an hour).`,
  request: {
      params: z.object({
        id: z.string().regex(new RegExp('^s_[a-z2-7]{16}$'))
      }),
      body: {
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()) }
        }
      }
    },
  responses: {
      '200': {
        description: 'What to merge.',
        content: {
          'application/json': { schema: z.object({
              type: z.string().optional(),
              title: z.string().optional(),
              payload: z.record(z.string(), z.unknown()).optional(),
              media: z.array(z.string()).optional(),
              origin: z.record(z.string(), z.unknown()).optional(),
              item: SharedItem.optional()
            }) }
        }
      },
      '404': R.SharingOff,
      '413': {
        description: '`media-quota`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const reportShared = {
  method: 'post',
  path: '/api/shared/{id}/report',
  operationId: 'reportShared',
  tags: ['shared'],
  summary: 'Report a shared item to the admins',
  description: `Once per person and item, never your own (\`403 own-item\`, \`409 already-reported\`).
Reasons: \`spam\`, \`offensive\`, \`not-theirs\`, \`licensed\`, \`personal\`, \`other\`, plus an
optional note of 300 characters. Reports from \`SHARE_AUTOHIDE_REPORTS\` (3) different
people take the item out of sight until an admin decides, and a single \`licensed\` report
does it at once. Budget \`library.report\` (10 an hour). Logged as \`shared.report\`.`,
  request: {
      params: z.object({
        id: z.string().regex(new RegExp('^s_[a-z2-7]{16}$'))
      }),
      body: {
        content: {
          'application/json': { schema: z.object({
              reason: z.enum(['spam', 'offensive', 'not-theirs', 'licensed', 'personal', 'other']),
              note: z.string().max(300).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Reported; `status` says whether it is out of sight now.',
        content: {
          'application/json': { schema: z.object({
              ok: z.boolean().optional(),
              status: z.string().optional()
            }) }
        }
      },
      '400': {
        description: '`bad-reason`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '403': {
        description: '`own-item`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '409': {
        description: '`already-reported`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '429': R.RateLimited
    }
} satisfies RouteConfig;

export const getSharedMedia = {
  method: 'get',
  path: '/api/shared/media/{hash}',
  operationId: 'getSharedMedia',
  tags: ['shared'],
  summary: 'A file of a shared item, for the preview',
  description: `Only a file a live item names that the caller may see (or one of the caller's own, or
any for an admin), never a blocked hash. The same headers as \`GET /api/media/{hash}\`
(\`nosniff\`, a sandbox CSP, \`private, no-store\`).`,
  request: {
      params: z.object({
        hash: z.string().regex(new RegExp('^[0-9a-f]{64}$'))
      })
    },
  responses: {
      '200': {
        description: 'The file.',
        content: {
          'image/webp': { schema: z.string().openapi({ format: 'binary' }) },
          'audio/wav': { schema: z.string().openapi({ format: 'binary' }) },
          'video/mp4': { schema: z.string().openapi({ format: 'binary' }) }
        }
      },
      '404': {
        description: '`media-missing` or `sharing-off`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const adminListShared = {
  method: 'get',
  path: '/api/admin/shared',
  operationId: 'adminListShared',
  tags: ['shared'],
  summary: 'Admin: the moderation list',
  description: `Every item the caller may moderate (admins; a gym's leads for that gym's items), most
reported first, with the owner, the reports (who, why, when), the number of importers,
the last moderation and the consent version. \`counts\` feeds the badge.`,
  request: {
      query: z.object({
        status: z.enum(['live', 'pending', 'hidden', 'withdrawn', 'removed']).optional(),
        reported: z.enum(['1']).optional(),
        type: z.string().optional(),
        owner: z.string().optional()
      })
    },
  responses: {
      '200': {
        description: 'The list.',
        content: {
          'application/json': { schema: z.object({
              items: z.array(SharedItem).optional(),
              counts: z.object({
                reported: z.number().int().optional(),
                pending: z.number().int().optional(),
                all: z.number().int().optional()
              }).optional(),
              review: z.boolean().optional()
            }) }
        }
      },
      '403': R.Forbidden
    }
} satisfies RouteConfig;

export const adminModerateShared = {
  method: 'post',
  path: '/api/admin/shared/{id}',
  operationId: 'adminModerateShared',
  tags: ['shared'],
  summary: 'Admin: approve, hide, restore or remove an item',
  description: `Every action needs a short \`reason\` and is logged (\`shared.approve\`, \`shared.hide\`,
\`shared.restore\`, \`shared.remove\`). Remove is final: the files leave the shared folder
and the folder of every person who imported them, and their hashes are blocked from then
on. Text copies (a routine, a tip) stay with the people who took them.`,
  request: {
      params: z.object({
        id: z.string().regex(new RegExp('^s_[a-z2-7]{16}$'))
      }),
      body: {
        content: {
          'application/json': { schema: z.object({
              action: z.enum(['approve', 'hide', 'restore', 'remove']),
              reason: z.string().max(200)
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.object({
              status: z.string().optional(),
              copiesRemoved: z.number().int().optional(),
              item: SharedItem.openapi({ description: 'The item after the step, as the admin list shows it.' }).optional()
            }) }
        }
      },
      '400': {
        description: '`bad-action` or `reason-needed`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '403': R.Forbidden,
      '409': {
        description: '`removed` or `withdrawn`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;

export const adminBanSharing = {
  method: 'post',
  path: '/api/admin/users/{uid}/sharing',
  operationId: 'adminBanSharing',
  tags: ['shared'],
  summary: 'Admin: pause or resume sharing for one person',
  description: `\`banned: true\` (with a reason) stops the person sharing or editing, and takes their live
and waiting items out of sight; \`false\` brings back exactly the ones the ban hid.
Logged as \`shared.ban\` / \`shared.unban\`.`,
  request: {
      params: z.object({
        uid: z.string()
      }),
      body: {
        content: {
          'application/json': { schema: z.object({
              banned: z.boolean(),
              reason: z.string().max(200).optional()
            }) }
        }
      }
    },
  responses: {
      '200': {
        description: 'Done.',
        content: {
          'application/json': { schema: z.object({
              banned: z.boolean().optional(),
              items: z.number().int().optional()
            }) }
        }
      },
      '403': R.Forbidden,
      '404': {
        description: '`not-found`.',
        content: {
          'application/json': { schema: ErrorBody }
        }
      }
    }
} satisfies RouteConfig;
