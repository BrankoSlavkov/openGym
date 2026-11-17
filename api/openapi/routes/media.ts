/* Fork: the "media" routes.
 * Generated once from upstream's api/openapi.yaml (OpenAPI 3.1, hand-written) when the spec moved
 * into code, and maintained by hand since: this is the source of truth for the OpenAPI 3.2
 * document (openapi/document.ts) that /api/openapi.json serves and the frontend's Orval client is
 * generated from. Request bodies are validated against these schemas (http-app.ts). */
import type { RouteConfig } from '@asteasolutions/zod-to-openapi';
import { z } from '@hono/zod-openapi';
import { ErrorBody, MediaStored, MediaUsage } from '../schemas.ts';
import * as R from '../responses.ts';

void z;

export const getMedia = {
  method: 'get',
  path: '/api/media/{hash}',
  operationId: 'getMedia',
  tags: ['media'],
  summary: 'Download one of your photos or videos',
  description: `The stored file, whole, from the caller's own folder only: another profile's file
answers exactly like one that was never uploaded (404). The body is the file, not
JSON, with headers that keep a browser from ever treating it as a page:
\`Content-Type\` from the sniffed type (never \`text/*\` or SVG),
\`X-Content-Type-Options: nosniff\`, \`Content-Security-Policy: default-src 'none'; sandbox\`,
\`Cross-Origin-Resource-Policy: same-origin\`, \`Content-Disposition: inline\`,
\`X-Robots-Tag: noindex\` and \`Cache-Control: private, no-store\`. The app keeps its own
verified copy, and an HTTP-cache copy would outlive signing out.

No \`Range\` and no \`ETag\`: the app downloads a file once, checks it against its hash and
keeps it. A paired phone fetches with its bearer token; \`<img src>\` cannot carry one.
Not throttled.`,
  request: {
      params: z.object({
        hash: z.string().regex(new RegExp('^[0-9a-f]{64}$')).openapi({ description: 'The SHA-256 of the file\'s bytes, 64 lowercase hex characters.' })
      })
    },
  responses: {
      '200': {
        description: 'The file.',
        headers: {
          "Content-Length": { schema: { type: 'integer' } },
          "Content-Disposition": { schema: { type: 'string' }, example: 'inline; filename="<hash>.webp"' }
        },
        content: {
          'image/jpeg': { schema: z.string().openapi({ format: 'binary' }) },
          'image/png': { schema: z.string().openapi({ format: 'binary' }) },
          'image/webp': { schema: z.string().openapi({ format: 'binary' }) },
          'image/gif': { schema: z.string().openapi({ format: 'binary' }) },
          'video/mp4': { schema: z.string().openapi({ format: 'binary' }) },
          'video/quicktime': { schema: z.string().openapi({ format: 'binary' }) },
          'video/webm': { schema: z.string().openapi({ format: 'binary' }) },
          'audio/wav': { schema: z.string().openapi({ format: 'binary' }) }
        }
      },
      '401': R.Unauthorized,
      '404': {
        description: 'Not in the caller\'s folder. Never uploaded, removed by the sweep, or someone else\'s.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'no such file', code: 'media-missing' } }
        }
      }
    }
} satisfies RouteConfig;

export const putMedia = {
  method: 'put',
  path: '/api/media/{hash}',
  operationId: 'putMedia',
  tags: ['media'],
  summary: 'Upload one photo, GIF or video',
  description: `The body is the raw file; \`Content-Type\` must be one of the eight types below and
\`Content-Length\` is optional (chunked uploads are capped while they stream). The path
names the SHA-256 of the bytes, and the file is stored only if they hash to it.
Idempotent: uploading a file the server already has answers 200 with \`existed: true\`.

Optional header \`X-OpenGym-Account\`: the account id the upload is meant for. When it is
not the session's account (the browser signed in as someone else meanwhile) the upload
is refused with 409 \`account-mismatch\` and nothing is stored.

What is stored is decided by the file's first bytes, not by the declared type. The
declared type only has to be in the same category, a still (JPEG, PNG, WebP, GIF) or a
video (MP4, MOV, WebM), or a sound (a 16-bit PCM WAV, \`audio/wav\`): a JPEG declared as a GIF is stored as the JPEG it is, a video
declared as an image is refused. The cap of the kind the bytes turned out to be applies
(\`MEDIA_IMAGE_MAX_MB\`, \`MEDIA_GIF_MAX_MB\`, \`MEDIA_VIDEO_MAX_MB\`, \`MEDIA_AUDIO_MAX_MB\`), and an MP4 or MOV must
be a well-formed file no longer than \`MEDIA_VIDEO_MAX_SEC\` (+1 s), read from its
headers. HEIC/AVIF, SVG, HTML and every other type are refused; the app converts HEIC
photos before uploading. The server never decodes or alters a file: the app has already
re-encoded photos and removed video metadata on the device.

Checked in this order: session (401), the hourly budget and at most two uploads at once
per profile (429), the declared type (415), a declared length over the cap (413 before
a byte is read), already stored (200), the quota (413 \`media-quota\`; files the profile
already dropped get one hour instead of the grace to make room), free disk (507), then
while and after streaming: size (413), hash (400), sniffed type (415), sniffed cap
(413), video checks (415/413). No bytes for 60 s ends the upload with 408. A refused
upload is read and discarded up to twice its cap, so the answer reaches the client.

A new file that the profile's state does not reference yet starts its grace period
at once, so a state push that never comes does not keep it forever.`,
  request: {
      params: z.object({
        hash: z.string().regex(new RegExp('^[0-9a-f]{64}$')).openapi({ description: 'The SHA-256 of the file\'s bytes, 64 lowercase hex characters.' })
      }),
      body: {
        required: true,
        content: {
          'image/jpeg': { schema: z.string().openapi({ format: 'binary' }) },
          'image/png': { schema: z.string().openapi({ format: 'binary' }) },
          'image/webp': { schema: z.string().openapi({ format: 'binary' }) },
          'image/gif': { schema: z.string().openapi({ format: 'binary' }) },
          'video/mp4': { schema: z.string().openapi({ format: 'binary' }) },
          'video/quicktime': { schema: z.string().openapi({ format: 'binary' }) },
          'video/webm': { schema: z.string().openapi({ format: 'binary' }) },
          'audio/wav': { schema: z.string().openapi({ format: 'binary' }) }
        }
      }
    },
  responses: {
      '409': R.err('The file conflicts with what is stored under that hash.'),
      '200': {
        description: 'The server already had these bytes (from this or another of your devices).',
        content: {
          'application/json': { schema: MediaStored, example: {
              ok: true,
              hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
              mime: 'image/webp',
              size: 183204,
              existed: true
            } }
        }
      },
      '201': {
        description: 'Stored.',
        content: {
          'application/json': { schema: MediaStored, example: {
              ok: true,
              hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
              mime: 'image/webp',
              size: 183204,
              existed: false
            } }
        }
      },
      '400': {
        description: 'The bytes do not hash to the name in the path (`hash-mismatch`).',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'the file does not match its name', code: 'hash-mismatch' } }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'A browser request from another origin (see *CSRF*).',
        content: {
          'application/json': { schema: ErrorBody, example: {
              error: 'cross-origin request refused',
              code: 'origin-mismatch',
              expected: 'https://gym.example.com'
            } }
        }
      },
      '408': {
        description: 'No bytes arrived for 60 seconds (`timeout`). The connection is closed.',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'the upload stalled', code: 'timeout' } }
        }
      },
      '413': {
        description: `- \`media-too-large\`: over the cap of its kind; \`maxMB\` says the cap.
- \`media-quota\`: the profile's space is full; \`usedMB\` and \`quotaMB\` say how full.
- \`media-too-long\`: a video longer than \`maxSec\` seconds.`,
        content: {
          'application/json': { schema: ErrorBody, examples: {
              tooLarge: { value: { error: 'that file is too large', code: 'media-too-large', maxMB: 2 } },
              quota: {
                value: {
                  error: 'your space for photos and videos is full',
                  code: 'media-quota',
                  usedMB: 199.4,
                  quotaMB: 200
                }
              },
              tooLong: { value: { error: 'that video is too long', code: 'media-too-long', maxSec: 60 } }
            } }
        }
      },
      '415': {
        description: '`media-type`: the declared type is not one of the seven, the bytes are none of them, or they are a video declared as an image (or the reverse). `media-invalid`: an MP4 or MOV whose boxes do not add up.',
        content: {
          'application/json': { schema: ErrorBody, examples: {
              type: { value: { error: 'that file type is not accepted', code: 'media-type' } },
              invalid: { value: { error: 'that video could not be read', code: 'media-invalid' } }
            } }
        }
      },
      '429': {
        description: '`locked`: more than `MEDIA_UPLOADS_PER_HOUR` uploads this hour; `busy`: two uploads of this profile are already in flight (`retryAfter` 5).',
        headers: { "Retry-After": { schema: { type: 'integer' } } },
        content: {
          'application/json': { schema: ErrorBody, examples: {
              locked: { value: { error: 'too many uploads, try again later', code: 'locked', retryAfter: 1740 } },
              busy: {
                value: { error: 'too many uploads at once, try again in a moment', code: 'busy', retryAfter: 5 }
              }
            } }
        }
      },
      '507': {
        description: 'The server\'s disk has less than `MEDIA_MIN_FREE_MB` free (`storage-full`).',
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'the server is running out of disk space', code: 'storage-full' } }
        }
      }
    }
} satisfies RouteConfig;

export const mediaMissing = {
  method: 'post',
  path: '/api/media/missing',
  operationId: 'mediaMissing',
  tags: ['media'],
  summary: 'Which of these files the server does not have',
  description: `The app sends every hash its state references and uploads only what comes back, so the
same call moves a guest's files into a new account, a phone's into its pairing, a
backup's into the server, and re-sends a file the sweep removed while a device still
had it. Answered from the caller's own folder only.

Takes the same optional \`X-OpenGym-Account\` header as the upload: another account than
the session's answers 409 \`account-mismatch\`.`,
  request: {
      body: {
        required: true,
        content: {
          'application/json': { schema: z.object({
              hashes: z.array(z.string().regex(new RegExp('^[0-9a-f]{64}$'))).max(1000)
            }) }
        }
      }
    },
  responses: {
      '409': R.err('The caller\'s media folder is not in a state to answer (a code says why).'),
      '200': {
        description: 'The subset the server does not have, in the order sent, and the profile\'s usage.',
        content: {
          'application/json': { schema: z.object({
              missing: z.array(z.string()).optional(),
              usage: MediaUsage.optional()
            }), example: {
              missing: ['b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'],
              usage: { bytes: 52428800, count: 14, quotaBytes: 209715200 }
            } }
        }
      },
      '400': {
        description: '`hashes` is missing, not a list, longer than 1000, or holds something that is not a lowercase SHA-256 (`bad-request`).',
        content: {
          'application/json': { schema: ErrorBody }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'A browser request from another origin (see *CSRF*).',
        content: {
          'application/json': { schema: ErrorBody, example: {
              error: 'cross-origin request refused',
              code: 'origin-mismatch',
              expected: 'https://gym.example.com'
            } }
        }
      }
    }
} satisfies RouteConfig;

export const mediaSweep = {
  method: 'post',
  path: '/api/media/sweep',
  operationId: 'mediaSweep',
  tags: ['media'],
  summary: 'Delete every file your current state does not reference',
  description: `What "Reset everything" does after pushing the empty state: every stored file of the
caller that the stored state does not reference goes now, without the grace period.
A state that cannot be read removes nothing. At most 10 an hour per profile (429
\`locked\`). Recorded in the activity log as \`media.sweep\`.

Without this call nothing is lost either: the hourly sweep removes a file once the
state has not referenced it for \`MEDIA_GC_GRACE_DAYS\` days (14), and only for profiles
whose state reads. A missing or unreadable state, or a profile missing from \`db.json\`,
never deletes anything.`,
  request: {
      body: {
        content: {
          'application/json': { schema: z.record(z.string(), z.unknown()), example: {} }
        }
      }
    },
  responses: {
      '200': {
        description: 'What was removed, and what is left.',
        content: {
          'application/json': { schema: z.object({
              removed: z.number().int().optional(),
              freedBytes: z.number().int().optional(),
              usage: MediaUsage.optional()
            }) }
        }
      },
      '401': R.Unauthorized,
      '403': {
        description: 'A browser request from another origin (see *CSRF*).',
        content: {
          'application/json': { schema: ErrorBody, example: {
              error: 'cross-origin request refused',
              code: 'origin-mismatch',
              expected: 'https://gym.example.com'
            } }
        }
      },
      '429': {
        description: 'More than 10 sweeps this hour (`locked`).',
        headers: { "Retry-After": { schema: { type: 'integer' } } },
        content: {
          'application/json': { schema: ErrorBody, example: { error: 'too many uploads, try again later', code: 'locked', retryAfter: 1200 } }
        }
      }
    }
} satisfies RouteConfig;
