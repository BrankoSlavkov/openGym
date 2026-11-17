/* OpenAI — and, through compatible.js, everything that speaks its Chat Completions shape.
 *
 * Chat Completions rather than the newer Responses API on purpose: it is the one request shape
 * Ollama, LM Studio, vLLM, OpenRouter and OpenAI itself all serve, so one implementation covers
 * two providers. `compatible` reuses this spec with a different base URL and an optional key.
 */
import { httpAdapter } from './http.ts';
import { SYSTEM_PROMPT } from '../system-prompt.ts';

import type { BodyArguments, HttpSpec, InvokeOptions, RequestBody, SourceLink, StreamEvent } from './types.ts'
import type { JsonSchema } from '../schemas.ts'

interface Citation { type?: string; url?: unknown; title?: unknown; url_citation?: Citation }
interface ChatMessage { content?: string | { text?: unknown }[]; annotations?: Citation[] }
interface ChatChoice { message?: ChatMessage; delta?: ChatMessage; finish_reason?: string | null }
interface WireError { message?: string; code?: unknown; metadata?: { raw?: unknown } }
interface OpenAIResponse {
  choices?: ChatChoice[]
  error?: string | WireError
  data?: (string | { id?: string; name?: string })[]
  models?: (string | { id?: string; name?: string })[]
  status?: string
  output?: { type?: string; content?: { type?: string; text?: unknown; annotations?: Citation[] }[] }[]
  incomplete_details?: { reason?: string }
  type?: string
  delta?: string
  response?: OpenAIResponse
  message?: string
  code?: unknown
}
interface ResponseFormat { type: string; json_schema?: { name?: string; schema?: JsonSchema } }
interface ChatOptions {
  maxTokensField?: string | ((args: Pick<BodyArguments, 'model' | 'base'>) => string)
  temperature?: number | null | ((args: Pick<BodyArguments, 'model' | 'base'>) => number | null)
  versionlessFallback?: boolean
  compatLadder?: boolean
}
interface ChatSpec extends HttpSpec {
  withStrictSchema: (body: RequestBody) => RequestBody
  withoutJsonMode: (body: RequestBody) => RequestBody
}
const formatOf = (body: RequestBody): ResponseFormat | undefined => body.response_format as ResponseFormat | undefined

// `maxTokensField` and `temperature` may be functions of { model, base }: a compatible endpoint
// learns from the model and host which request shape it is likely to want (#869).
export function chatCompletionsSpec(id: string, { maxTokensField = 'max_completion_tokens', temperature = null, versionlessFallback = false, compatLadder = false }: ChatOptions = {}): ChatSpec {
  const spec: ChatSpec = {
    id,
    versionlessFallback,
    compatLadder,
    path: () => '/v1/chat/completions',
    modelsPath: '/v1/models',
    headers: (key): Record<string, string> => (key ? { authorization: 'Bearer ' + key } : {}),
    // The rules ride in the system message, byte-identical for every job of a task, so a
    // llama.cpp/Ollama endpoint can reuse its KV prefix cache and only ever re-processes the
    // payload. A schema, when given, turns JSON mode into grammar-constrained decoding —
    // the answer cannot leave the shape, which is most of what the repair round used to fix.
    body: ({ model, prompt, system, schema, maxTokens, base }) => ({
      model,
      messages: [
        { role: 'system', content: system ? SYSTEM_PROMPT + '\n\n' + system : SYSTEM_PROMPT },
        { role: 'user', content: prompt }
      ],
      ...withTemperature(typeof temperature === 'function' ? temperature({ model, base }) : temperature),
      response_format: schema
        ? { type: 'json_schema', json_schema: { name: 'coach_answer', schema } }
        : { type: 'json_object' },
      [typeof maxTokensField === 'function' ? maxTokensField({ model, base }) : maxTokensField]: maxTokens
    }),
    // The 400 that says the schema is not strict enough gets a strict-schema copy of the same
    // request once (see strictSchema below); a server that rejects even that, or rejects
    // schema/JSON mode outright, still gets the plain-JSON fallbacks below.
    withStrictSchema: body => (formatOf(body) && formatOf(body)!.type === 'json_schema'
      ? { ...body, response_format: { ...formatOf(body)!, json_schema: { ...formatOf(body)!.json_schema, schema: strictSchema(formatOf(body)!.json_schema?.schema) } } }
      : body),
    // A server that rejects schema/JSON mode gets the same request once more with plain JSON
    // mode, then without any; the parser copes with a fenced answer and the validator is the
    // gate either way.
    withoutJsonMode: body => (formatOf(body) && formatOf(body)!.type === 'json_schema'
      ? { ...body, response_format: { type: 'json_object' } }
      : (() => { const { response_format: _rf, ...rest } = body; return rest; })()),
    // The rungs of the compatibility ladder in http.js (#804), each one change to the request.
    // Every one is a no-op on a request that does not carry what it changes; http.js skips those.
    compat: {
      strict: body => spec.withStrictSchema(body),
      json_object: body => (formatOf(body) && formatOf(body)!.type === 'json_schema' ? { ...body, response_format: { type: 'json_object' } } : body),
      tokens: body => {
        const from = 'max_tokens' in body ? 'max_tokens' : 'max_completion_tokens' in body ? 'max_completion_tokens' : null;
        if (!from) return body;
        const { [from]: n, ...rest } = body;
        return { ...rest, [from === 'max_tokens' ? 'max_completion_tokens' : 'max_tokens']: n };
      },
      temperature: body => { const { temperature: _t, ...rest } = body; return rest; },
      plain: body => { const { response_format: _rf, ...rest } = body; return rest; }
    },
    errorMessage: rawData => {
      const data = rawData as OpenAIResponse | null;
      const e = data && data.error;
      if (!e) return null;
      if (typeof e === 'string') return e;
      // OpenRouter wraps the upstream provider's own error: its message is a generic "Provider
      // returned error" and the provider's words are in metadata.raw, usually as JSON. Those words
      // are what an owner needs to see, and what the JSON-mode fallback in http.js matches on.
      const raw = e.metadata && e.metadata.raw;
      let inner = null;
      if (typeof raw === 'string' && raw) {
        try {
          const j = JSON.parse(raw);
          inner = (j && j.error && (typeof j.error === 'string' ? j.error : j.error.message)) || null;
        } catch { inner = raw; }
      }
      return inner && inner !== e.message ? `${e.message}: ${inner}` : e.message;
    },
    readText: rawData => {
      const data = rawData as OpenAIResponse;
      const choice = (data.choices || [])[0];
      if (!choice) return { error: 'the answer had no choices' };
      const content = choice.message && choice.message.content;
      const text = typeof content === 'string' ? content : Array.isArray(content) ? content.map(p => p.text || '').join('') : '';
      const sources = citationsOf(choice.message && choice.message.annotations);
      return { text, truncated: choice.finish_reason === 'length', ...(sources.length ? { sources } : {}) };
    },
    // Streamed (#1035): the deltas folded back into one Chat Completions answer. Citations a
    // search-enabled model attaches (url_citation annotations) come along for the sources line.
    stream: {
      body: b => ({ ...b, stream: true }),
      fold: events => foldChatStream(events)
    },
    readModels: rawData => {
      const data = rawData as OpenAIResponse;
      const ids = (data.data || data.models || []).map(m => (typeof m === 'string' ? m : m.id || m.name)).filter((value): value is string => typeof value === 'string' && !!value);
      // OpenAI's own list is everything the account can call — speech, embeddings, image
      // models, realtime and Responses-only variants — and a person picking "the first one that
      // looks right" out of eighty names lands on one Chat Completions refuses with a 400 or
      // 404 the app can only show as "couldn't run". Keep what this request shape can use.
      // A compatible endpoint (Ollama, LM Studio, OpenRouter) serves what it serves, unfiltered.
      if (id !== 'openai') return ids;
      // A proxy or stand-in that answers under OpenAI's own base URL may serve names the
      // filter does not know; an empty picker would be worse than a long one.
      const chat = ids.filter(isChatModel);
      return chat.length ? chat : ids;
    }
  };
  return spec;
}

/** Chat Completions stream events (`data: {choices:[{delta}]}`) as one non-streamed answer. */
export function foldChatStream(events: readonly StreamEvent[]): OpenAIResponse | null {
  let content = '', finish: string | null = null, any = false;
  const annotations: Citation[] = [];
  for (const { data: raw } of events) {
    const ev = raw as OpenAIResponse | null;
    const choice = ev && Array.isArray(ev.choices) ? ev.choices[0] : null;
    if (!choice) continue;
    any = true;
    const d = choice.delta || choice.message || {};
    if (typeof d.content === 'string') content += d.content;
    if (Array.isArray(d.annotations)) annotations.push(...d.annotations);
    if (choice.finish_reason) finish = choice.finish_reason;
  }
  return any ? { choices: [{ message: { content, ...(annotations.length ? { annotations } : {}) }, finish_reason: finish }] } : null;
}

/** The web pages an answer cites, from url_citation annotations (OpenAI, OpenRouter): at most 8,
 *  http(s) only, deduplicated. */
export function citationsOf(list: unknown): SourceLink[] {
  const out: SourceLink[] = [];
  for (const a of (Array.isArray(list) ? list : []) as Citation[]) {
    const c = a && (a.url_citation || (a.type === 'url_citation' ? a : null));
    addSource(out, c && c.url, c && c.title);
  }
  return out;
}
export function addSource(out: SourceLink[], url: unknown, title: unknown): void {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url) || out.length >= 8 || out.some(s => s.url === url)) return;
  out.push({ url: url.slice(0, 500), title: typeof title === 'string' && title.trim() ? title.trim().slice(0, 120) : '' });
}

const withTemperature = (t: number | null) => (t != null ? { temperature: t } : {});
const NOT_CHAT = /realtime|audio|tts|transcri|whisper|embedding|image|dall-e|moderation|search|instruct|codex|computer-use|deep-research|-pro(?:-|$)|davinci|babbage|curie|ada/i;
/* A strict-schema copy of the flat schemas: every node that can be an object gains
 * `additionalProperties: false`. That is exactly what a hosted validator that enforces strict
 * JSON Schema asks for — OpenRouter maps chat-completions response_format to its internal
 * output_config.format.schema and answers the flat shape with
 *   400 "output_config.format.schema: For 'object' type, 'additionalProperties' must be
 *   explicitly set to false"
 * — and exactly what schemas.ts leaves out on purpose, because llama.cpp's grammar converter
 * has a history of choking on additionalProperties (ollama#8444, #8063). So the strict copy is
 * made only for the wire, only when an endpoint has already proven it wants one; nothing else
 * moves. `required` stays per-schema and the shape stays flat: a validator that demands more
 * (every property required, single types) still says no, and the request falls through to
 * plain JSON mode, where validate.js judges the answer either way.
 */
export function strictSchema<T>(node: T): T {
  if (Array.isArray(node)) return node.map(item => strictSchema(item)) as T;
  if (node == null || typeof node !== 'object') return node;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) out[key] = strictSchema(value);
  const type = out.type;
  // Only added when the node has none: a schema that already says `additionalProperties` (schemas.ts
  // states it on `week`, where the keys are the data) keeps exactly what it says, and a second
  // pass over an already-strict copy is the same object again — strictSchema(strictSchema(x)) is
  // strictSchema(x), so the retry cannot nest two different answers.
  if ((type === 'object' || (Array.isArray(type) && type.includes('object'))) && !('additionalProperties' in out)) {
    out.additionalProperties = false;
  }
  return out as T;
}

/* OpenAI's reasoning models (o1, o3, o4-mini, the gpt-5 family) refuse `max_tokens` with
 *   400 "Unsupported parameter: 'max_tokens' is not supported with this model. Use
 *   'max_completion_tokens' instead." (#869)
 * and take no temperature but their default. OpenAI's own API and Azure OpenAI serve them under
 * any name (an Azure deployment is named by its owner), so those hosts get the newer field for
 * every model; anywhere else a bare OpenAI reasoning model name does. A name with a vendor prefix
 * (OpenRouter's openai/gpt-5) is a gateway's, which takes max_tokens and translates it. A guess
 * that is wrong either way is a 400 naming the field, which the compatibility ladder in http.js
 * answers with the other one, once, and remembers. */
const OPENAI_HOST = /(^|\.)(api\.openai\.com|openai\.azure\.com|cognitiveservices\.azure\.com|services\.ai\.azure\.com)$/i;
export const isReasoningModel = (model: unknown): boolean => /^(o\d|gpt-5)/i.test(String(model || ''));
const hostname = (base: string): string => { try { return new URL(base).hostname; } catch { return ''; } };
export const wantsCompletionTokens = ({ model, base = '' }: { model?: unknown; base?: string } = {}): boolean => OPENAI_HOST.test(hostname(base)) || isReasoningModel(model);

export const isChatModel = (id: string): boolean => /^(gpt-|o\d|chatgpt-)/.test(id) && !NOT_CHAT.test(id);

export const openaiSpec = chatCompletionsSpec('openai');

/* Web research on OpenAI goes through the Responses API: Chat Completions only searches with the
 * dedicated search models, the Responses API gives any model its web_search tool. Asked for JSON in
 * the prompt rather than through text.format, so no model refuses the combination; the parser and
 * validator judge the answer as always. */
export const openaiWebSpec: HttpSpec = {
  ...openaiSpec,
  compat: null,
  path: () => '/v1/responses',
  body: ({ model, prompt, system, maxTokens }) => ({
    model,
    instructions: system ? SYSTEM_PROMPT + '\n\n' + system : SYSTEM_PROMPT,
    input: prompt,
    tools: [{ type: 'web_search' }],
    max_output_tokens: maxTokens
  }),
  readText: rawData => {
    const data = rawData as OpenAIResponse;
    if (data.status === 'failed') return { error: (data.error && (typeof data.error === 'string' ? data.error : data.error.message)) || 'the answer failed' };
    const parts = (data.output || []).filter(o => o && o.type === 'message').flatMap(o => o.content || []).filter(c => c && c.type === 'output_text');
    const sources = citationsOf(parts.flatMap(p => p.annotations || []));
    const truncated = data.status === 'incomplete' && data.incomplete_details && data.incomplete_details.reason === 'max_output_tokens';
    return { text: parts.map(p => p.text || '').join(''), truncated, ...(sources.length ? { sources } : {}) };
  },
  stream: {
    body: b => ({ ...b, stream: true }),
    fold: events => foldResponsesStream(events)
  }
};

/** Responses API stream events as the final response object: the response.completed (or
 *  .incomplete / .failed) event carries it whole; text deltas are the fallback. */
export function foldResponsesStream(events: readonly StreamEvent[]): OpenAIResponse | null {
  let text = '', last: OpenAIResponse | null = null;
  for (const { data: raw } of events) {
    if (!raw || typeof raw !== 'object') continue;
    const ev = raw as OpenAIResponse;
    if (ev.type === 'response.output_text.delta' && typeof ev.delta === 'string') text += ev.delta;
    else if (/^response\.(completed|incomplete|failed)$/.test(ev.type || '') && ev.response) last = ev.response;
    else if (ev.type === 'error') return { error: { message: ev.message || 'stream error', code: ev.code } };
  }
  if (last) return last;
  return text ? { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text }] }] } : null;
}

const chatAdapter = httpAdapter(openaiSpec);
const webAdapter = httpAdapter(openaiWebSpec);
export default { ...chatAdapter, invoke: (opts?: InvokeOptions) => (opts && opts.web ? webAdapter.invoke(opts) : chatAdapter.invoke(opts)) };
