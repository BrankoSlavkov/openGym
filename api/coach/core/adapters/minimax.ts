/* MiniMax Chat Completions API. */
import { httpAdapter } from './http.ts';
import { chatCompletionsSpec } from './openai.ts';

export const minimaxSpec = chatCompletionsSpec('minimax', { maxTokensField: 'max_tokens' });
export default httpAdapter(minimaxSpec);
