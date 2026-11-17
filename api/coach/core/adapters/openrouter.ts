/* OpenRouter: one key (or one sign-in, core/openrouter-oauth.js) for Claude, GPT, Gemini and many
 * more, over the Chat Completions shape. Web research is OpenRouter's own web plugin, which works
 * with every model it routes to and returns url_citation annotations. */
import type { ModelPrice } from './types.ts';
import { httpAdapter } from './http.ts';
import { chatCompletionsSpec } from './openai.ts';

export const openrouterSpec = chatCompletionsSpec('openrouter', { maxTokensField: 'max_tokens' });
const chatBody = openrouterSpec.body;
openrouterSpec.body = args => ({
  ...chatBody(args),
  ...(args.web ? { plugins: [{ id: 'web', max_results: 5 }] } : {})
});
// App attribution, as OpenRouter asks apps to send it. No user data in either.
const chatHeaders = openrouterSpec.headers;
openrouterSpec.headers = key => ({ ...chatHeaders(key), 'http-referer': 'https://opengym.ch', 'x-title': 'openGym' });
// The listing carries USD prices per token, which the model picker shows as a hint.
openrouterSpec.readPrices = raw => {
  const data = raw as { data?: { id?: unknown; pricing?: { prompt?: unknown; completion?: unknown } }[] } | null;
  const out: Record<string, ModelPrice> = {};
  for (const m of (data && data.data) || []) {
    const p = m && m.pricing;
    if (m && typeof m.id === 'string' && p) out[m.id] = { prompt: Number(p.prompt), completion: Number(p.completion) };
  }
  return out;
};
export default httpAdapter(openrouterSpec);
