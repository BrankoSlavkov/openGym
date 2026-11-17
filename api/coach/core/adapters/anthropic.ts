/* Anthropic Messages API. */
import { httpAdapter } from './http.ts';
import { SYSTEM_PROMPT } from '../system-prompt.ts';
import { addSource } from './openai.ts';

import type { HttpSpec, SourceLink, StreamEvent } from './types.ts'
interface Citation { url?: unknown; title?: unknown }
interface MessageBlock {
  type?: string; text?: string; citations?: Citation[]; content?: Citation[]
}
interface MessageWire {
  error?: { message?: string }
  stop_reason?: string
  stop_details?: { explanation?: string }
  content?: MessageBlock[]
  data?: { id: string }[]
}
interface MessageEvent {
  type?: string; message?: MessageWire; index?: number; content_block?: MessageBlock
  delta?: { type?: string; text?: string; citation?: Citation; stop_reason?: string; stop_details?: { explanation?: string } }
}

export const ANTHROPIC_VERSION = '2023-06-01';

/* The web search tool version a model takes: the dynamic-filtering one on the 4.6 generation and
 * newer, the basic one before it. */
export function webSearchToolFor(model: unknown): string {
  const m = /claude-(?:opus|sonnet|haiku|fable|mythos)-(\d+)(?:-(\d+))?/.exec(String(model || ''));
  const v = m ? Number(m[1]) + (m[2] && m[2].length <= 2 ? Number(m[2]) / 10 : 0) : 0;
  return v >= 4.6 && !/haiku-4/.test(String(model)) ? 'web_search_20260209' : 'web_search_20250305';
}

export const anthropicSpec: HttpSpec = {
  id: 'anthropic',
  path: () => '/v1/messages',
  modelsPath: '/v1/models',
  headers: key => ({
    'x-api-key': key ?? '',
    'anthropic-version': ANTHROPIC_VERSION,
    // Required for a call made from a browser context. Harmless from a server, and the phone's
    // native HTTP path does not need it either — it is here so a plain-browser dev run works.
    'anthropic-dangerous-direct-browser-access': 'true'
  }),
  // The rules block is marked cacheable: identical for every job of a task, so subsequent
  // jobs read it from Anthropic's prompt cache at a tenth of the input price.
  body: ({ model, prompt, system, maxTokens, web }) => ({
    model,
    max_tokens: maxTokens,
    system: system
      ? [{ type: 'text', text: SYSTEM_PROMPT + '\n\n' + system, cache_control: { type: 'ephemeral' } }]
      : SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    // Web research: Anthropic's web search server tool, a few searches at most per answer.
    ...(web ? { tools: [{ type: webSearchToolFor(model), name: 'web_search', max_uses: 3 }] } : {})
  }),
  errorMessage: data => (data as MessageWire | null)?.error?.message,
  readText: raw => {
    const data = raw as MessageWire;
    if (data.stop_reason === 'pause_turn') return { error: 'the web search took too long to finish; ask again' };
    if (data.stop_reason === 'refusal') return { error: 'the model declined this request' + (data.stop_details && data.stop_details.explanation ? ': ' + data.stop_details.explanation : '') };
    const blocks = data.content || [];
    const text = blocks.filter(b => b && b.type === 'text').map(b => b.text).join('');
    // Web research (the web_search server tool): the pages the text cites, then the results it read.
    const sources: SourceLink[] = [];
    blocks.forEach(b => (b && Array.isArray(b.citations) ? b.citations : []).forEach(c => addSource(sources, c && c.url, c && c.title)));
    blocks.filter(b => b && b.type === 'web_search_tool_result' && Array.isArray(b.content))
      .forEach(b => b.content!.forEach(r => addSource(sources, r && r.url, r && r.title)));
    return { text, truncated: data.stop_reason === 'max_tokens', ...(sources.length ? { sources } : {}) };
  },
  // Streamed (#1035): Messages API events folded back into one message.
  stream: {
    body: b => ({ ...b, stream: true }),
    fold: events => foldMessageStream(events)
  },
  readModels: data => ((data as MessageWire).data || []).map(m => m.id)
};

export default httpAdapter(anthropicSpec);

/** Messages API stream events (message_start, content_block_start/delta, message_delta) as the
 *  message a non-streamed call returns: text blocks with their citations, tool result blocks whole. */
export function foldMessageStream(events: readonly StreamEvent[]): MessageWire | null {
  let msg: MessageWire | null = null;
  const blocks: MessageBlock[] = [];
  for (const { data: raw } of events) {
    if (!raw || typeof raw !== 'object') continue;
    const ev = raw as MessageEvent;
    if (ev.type === 'message_start') msg = { ...(ev.message || {}), content: [] };
    else if (ev.type === 'content_block_start' && typeof ev.index === 'number' && Number.isInteger(ev.index)) blocks[ev.index] = { ...(ev.content_block || {}) };
    else if (ev.type === 'content_block_delta' && typeof ev.index === 'number' && Number.isInteger(ev.index)) {
      const b = blocks[ev.index] || (blocks[ev.index] = { type: 'text', text: '' });
      const d = ev.delta || {};
      if (d.type === 'text_delta' && typeof d.text === 'string') b.text = (b.text || '') + d.text;
      else if (d.type === 'citations_delta' && d.citation) (b.citations = b.citations || []).push(d.citation);
    } else if (ev.type === 'message_delta') {
      msg = msg || { content: [] };
      if (ev.delta && ev.delta.stop_reason) msg.stop_reason = ev.delta.stop_reason;
      if (ev.delta && ev.delta.stop_details) msg.stop_details = ev.delta.stop_details;
    }
  }
  if (!msg && !blocks.length) return null;
  return { ...(msg || {}), content: blocks.filter(Boolean) };
}
