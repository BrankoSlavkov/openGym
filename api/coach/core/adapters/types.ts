import type { ProviderConfig } from '../providers.ts'
import type { JsonSchema } from '../schemas.ts'

export interface RequestBody extends Record<string, unknown> {
  response_format?: { type: string; json_schema?: { name?: string; schema?: JsonSchema } }
}
export interface ModelPrice { prompt: number; completion: number }
export interface SourceLink { url: string; title?: string }
export interface AnswerText { text?: string; error?: string; truncated?: boolean; sources?: SourceLink[] }
export interface StreamEvent { event: string | null; data: unknown }
export interface BodyArguments {
  model: string; prompt?: string; system?: string | null; schema?: JsonSchema | null
  maxTokens: number; base?: string; web?: boolean
}
export interface HttpSpec {
  id: string
  modelsPath: string
  path: (model: string) => string
  headers: (key: string | null) => Record<string, string>
  body: (args: BodyArguments) => RequestBody
  readModels: (data: unknown) => string[] | null
  readText: (data: unknown) => AnswerText
  errorMessage: (data: unknown) => string | null | undefined
  readPrices?: (data: unknown) => Record<string, ModelPrice> | null
  preferModel?: (models: string[]) => string | null | undefined
  versionlessFallback?: boolean
  compatLadder?: boolean
  compat?: Record<string, (body: RequestBody) => RequestBody> | null
  stream?: {
    body: (body: RequestBody) => RequestBody
    path?: (model: string) => string
    fold: (events: StreamEvent[]) => unknown
  }
}
// Native mobile transport and tests can supply a minimal response without DOM Response metadata.
export interface HttpResponse {
  ok: boolean
  status: number
  text: () => Promise<string>
  body?: { getReader: () => { read: () => Promise<{ done: boolean; value?: Uint8Array }> } } | null
}
export type FetchTransport = (url: string, init: RequestInit) => Promise<HttpResponse>
export type ProviderEnvironment = Record<string, string | undefined>
export interface FetchOptions { fetch?: FetchTransport; timeoutMs?: number; signal?: AbortSignal }
export interface InvokeOptions extends FetchOptions {
  cfg?: ProviderConfig | null
  prompt?: string
  system?: string | null
  schema?: JsonSchema | null
  env?: ProviderEnvironment | null
  model?: string | null
  maxTokens?: number
  stream?: boolean
  web?: boolean
  retryDelayMs?: number
}
export interface AdapterResult {
  code: number; text: string; stderr: string
  timedOut?: boolean; spawnError?: boolean; model?: string; sources?: SourceLink[]
}
export interface ModelListing { ok: boolean; models: string[]; error?: string; prices?: Record<string, ModelPrice> }
export interface AdapterCheck { ok: boolean; version?: string; error?: string; needsKey?: boolean; models?: string[] }
export interface HttpAdapter {
  id: string; runtime: string; spawns: false; needsRuntime: false
  baseUrl: (cfg?: ProviderConfig | null) => string
  check: (cfg?: ProviderConfig | null, env?: ProviderEnvironment | null, opts?: FetchOptions) => Promise<AdapterCheck>
  models: (cfg?: ProviderConfig | null, env?: ProviderEnvironment | null, opts?: FetchOptions) => Promise<ModelListing>
  invoke: (opts?: InvokeOptions) => Promise<AdapterResult>
}
