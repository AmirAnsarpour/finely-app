import { app, safeStorage } from 'electron'
import { join } from 'path'
import fs from 'fs'

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom'
export type AIErrorKind = 'auth' | 'rate_limit' | 'server' | 'network' | 'unknown'

export interface AIUsage {
  inputTokens?: number
  outputTokens?: number
}

export interface AICallResult {
  text: string
  usage?: AIUsage
}

export interface RunAnalysisParams {
  provider: AIProvider
  model: string
  baseUrl?: string
  systemPrompt: string
  userPrompt: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatParams {
  provider: AIProvider
  model: string
  baseUrl?: string
  systemPrompt: string
  messages: ChatMessage[]   // full history, new user message last
}

// The key never touches settings.json (plain JSON in the syncable data
// folder) — it's OS-encrypted (Keychain / DPAPI / libsecret) and kept in
// userData, which stays on this machine only.
const KEY_PATH = join(app.getPath('userData'), 'finely-ai-key.enc')

export function hasApiKey(): boolean {
  return fs.existsSync(KEY_PATH)
}

export function saveApiKey(key: string): void {
  const trimmed = key.trim()
  if (!trimmed) throw new Error('API key cannot be empty')
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Secure storage is not available on this system — cannot save the key safely')
  }
  fs.writeFileSync(KEY_PATH, safeStorage.encryptString(trimmed))
}

export function loadApiKey(): string | null {
  if (!fs.existsSync(KEY_PATH)) return null
  try {
    return safeStorage.decryptString(fs.readFileSync(KEY_PATH))
  } catch {
    return null
  }
}

export function clearApiKey(): void {
  if (fs.existsSync(KEY_PATH)) fs.unlinkSync(KEY_PATH)
}

// ── Error classification ────────────────────────────────────────────────
// The renderer needs to tell "bad key" from "rate limited" from "provider is
// down" apart, but a thrown Error only reliably carries its `message` across
// the ipcMain.handle boundary — custom fields don't survive in every
// Electron version. Encoding the kind as a `[kind]` prefix in the message
// itself is the one form guaranteed to arrive intact; the renderer parses it
// back out (see src/renderer/utils/aiError.ts).
function classifyStatus(status: number): AIErrorKind {
  if (status === 401 || status === 403) return 'auth'
  if (status === 429) return 'rate_limit'
  if (status >= 500) return 'server'
  return 'unknown'
}

async function httpError(res: Response): Promise<Error> {
  let body = ''
  try {
    body = (await res.text()).slice(0, 300)
  } catch {
    body = res.statusText
  }
  return new Error(`[${classifyStatus(res.status)}] HTTP ${res.status}: ${body}`)
}

function networkError(cause: unknown): Error {
  const detail = cause instanceof Error ? cause.message : String(cause)
  return new Error(`[network] Could not reach the API — ${detail}`)
}

async function withNetworkErrors<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    // Already classified (has a "[kind]" prefix) — let it through unchanged.
    if (err instanceof Error && /^\[\w+\]/.test(err.message)) throw err
    throw networkError(err)
  }
}

// ── Non-streaming calls (single system+user prompt in, text out) ────────

async function callOpenAICompatible(apiKey: string, { model, baseUrl, systemPrompt, userPrompt }: RunAnalysisParams): Promise<AICallResult> {
  const base = (baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) throw await httpError(res)
  const data = await res.json()
  const text = data?.choices?.[0]?.message?.content
  if (typeof text !== 'string') throw new Error('[unknown] Unexpected response shape from the API')
  return {
    text,
    usage: { inputTokens: data?.usage?.prompt_tokens, outputTokens: data?.usage?.completion_tokens },
  }
}

async function callAnthropic(apiKey: string, { model, systemPrompt, userPrompt }: RunAnalysisParams): Promise<AICallResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw await httpError(res)
  const data = await res.json()
  const block = Array.isArray(data?.content) ? data.content.find((b: { type: string }) => b.type === 'text') : null
  if (typeof block?.text !== 'string') throw new Error('[unknown] Unexpected response shape from the API')
  return {
    text: block.text,
    usage: { inputTokens: data?.usage?.input_tokens, outputTokens: data?.usage?.output_tokens },
  }
}

async function callGoogle(apiKey: string, { model, systemPrompt, userPrompt }: RunAnalysisParams): Promise<AICallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
    }),
  })
  if (!res.ok) throw await httpError(res)
  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text
  if (typeof text !== 'string') throw new Error('[unknown] Unexpected response shape from the API')
  return {
    text,
    usage: { inputTokens: data?.usageMetadata?.promptTokenCount, outputTokens: data?.usageMetadata?.candidatesTokenCount },
  }
}

export async function runAIAnalysis(params: RunAnalysisParams): Promise<AICallResult> {
  const apiKey = loadApiKey()
  if (!apiKey) throw new Error('[auth] No API key configured')

  return withNetworkErrors(() => {
    switch (params.provider) {
      case 'anthropic':
        return callAnthropic(apiKey, params)
      case 'google':
        return callGoogle(apiKey, params)
      case 'openai':
      case 'custom':
        return callOpenAICompatible(apiKey, params)
    }
  })
}

// ── Streaming chat calls (full message history in, incremental text out) ─

// Reads a fetch Response body as Server-Sent Events, invoking `onEvent` with
// each event's raw text (everything between blank-line separators).
async function streamSSE(res: Response, onEvent: (raw: string) => void): Promise<void> {
  if (!res.body) throw new Error('[unknown] No response body to stream')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      onEvent(buffer.slice(0, idx))
      buffer = buffer.slice(idx + 2)
    }
  }
}

function sseDataLines(rawEvent: string): string[] {
  return rawEvent
    .split('\n')
    .filter(line => line.startsWith('data:'))
    .map(line => line.slice(5).trim())
}

async function streamOpenAICompatible(
  apiKey: string,
  { model, baseUrl, systemPrompt, messages }: ChatParams,
  onChunk: (text: string) => void
): Promise<AICallResult> {
  const base = (baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
    }),
  })
  if (!res.ok) throw await httpError(res)

  let text = ''
  let usage: AIUsage | undefined
  await streamSSE(res, raw => {
    for (const data of sseDataLines(raw)) {
      if (data === '[DONE]') continue
      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.choices?.[0]?.delta?.content
        if (typeof delta === 'string') {
          text += delta
          onChunk(delta)
        }
        if (parsed?.usage) {
          usage = { inputTokens: parsed.usage.prompt_tokens, outputTokens: parsed.usage.completion_tokens }
        }
      } catch {
        // Ignore malformed/partial SSE chunks — the stream self-corrects.
      }
    }
  })
  return { text, usage }
}

async function streamAnthropic(
  apiKey: string,
  { model, systemPrompt, messages }: ChatParams,
  onChunk: (text: string) => void
): Promise<AICallResult> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      stream: true,
      system: systemPrompt,
      messages,
    }),
  })
  if (!res.ok) throw await httpError(res)

  let text = ''
  let inputTokens: number | undefined
  let outputTokens: number | undefined
  await streamSSE(res, raw => {
    for (const data of sseDataLines(raw)) {
      try {
        const parsed = JSON.parse(data)
        if (parsed?.type === 'content_block_delta' && parsed?.delta?.type === 'text_delta') {
          const delta = parsed.delta.text as string
          text += delta
          onChunk(delta)
        } else if (parsed?.type === 'message_start') {
          inputTokens = parsed?.message?.usage?.input_tokens ?? inputTokens
        } else if (parsed?.type === 'message_delta') {
          outputTokens = parsed?.usage?.output_tokens ?? outputTokens
        }
      } catch {
        // Ignore malformed/partial SSE chunks.
      }
    }
  })
  return { text, usage: { inputTokens, outputTokens } }
}

async function streamGoogle(
  apiKey: string,
  { model, systemPrompt, messages }: ChatParams,
  onChunk: (text: string) => void
): Promise<AICallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: messages.map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
      systemInstruction: { parts: [{ text: systemPrompt }] },
    }),
  })
  if (!res.ok) throw await httpError(res)

  let text = ''
  let usage: AIUsage | undefined
  await streamSSE(res, raw => {
    for (const data of sseDataLines(raw)) {
      try {
        const parsed = JSON.parse(data)
        const delta = parsed?.candidates?.[0]?.content?.parts?.[0]?.text
        if (typeof delta === 'string') {
          text += delta
          onChunk(delta)
        }
        if (parsed?.usageMetadata) {
          usage = { inputTokens: parsed.usageMetadata.promptTokenCount, outputTokens: parsed.usageMetadata.candidatesTokenCount }
        }
      } catch {
        // Ignore malformed/partial SSE chunks.
      }
    }
  })
  return { text, usage }
}

export async function streamAIChat(params: ChatParams, onChunk: (text: string) => void): Promise<AICallResult> {
  const apiKey = loadApiKey()
  if (!apiKey) throw new Error('[auth] No API key configured')

  return withNetworkErrors(() => {
    switch (params.provider) {
      case 'anthropic':
        return streamAnthropic(apiKey, params, onChunk)
      case 'google':
        return streamGoogle(apiKey, params, onChunk)
      case 'openai':
      case 'custom':
        return streamOpenAICompatible(apiKey, params, onChunk)
    }
  })
}

// ── Model listing ─────────────────────────────────────────────────────

export interface ListModelsParams {
  provider: AIProvider
  baseUrl?: string
  apiKey?: string   // omit to use the already-saved key
}

// Excludes OpenAI's well-known non-chat model families — the /v1/models
// endpoint doesn't flag capability, unlike Anthropic's and Google's, so this
// is the closest we can get without hardcoding (and going stale on) a list
// of actual chat model IDs.
const OPENAI_NON_CHAT_PATTERN = /embedding|whisper|tts|dall-e|moderation|davinci-002|babbage-002/i

async function listOpenAICompatible(apiKey: string, baseUrl?: string): Promise<string[]> {
  const base = (baseUrl?.trim() || 'https://api.openai.com/v1').replace(/\/+$/, '')
  const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${apiKey}` } })
  if (!res.ok) throw await httpError(res)
  const data = await res.json()
  const list = Array.isArray(data?.data) ? data.data : []
  const ids: string[] = list.map((m: { id?: unknown }) => m.id).filter((id: unknown): id is string => typeof id === 'string')
  return ids.sort()
}

async function listOpenAI(apiKey: string): Promise<string[]> {
  return (await listOpenAICompatible(apiKey)).filter(id => !OPENAI_NON_CHAT_PATTERN.test(id))
}

async function listAnthropic(apiKey: string): Promise<string[]> {
  const res = await fetch('https://api.anthropic.com/v1/models', {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
  })
  if (!res.ok) throw await httpError(res)
  const data = await res.json()
  const list = Array.isArray(data?.data) ? data.data : []
  return list.map((m: { id?: unknown }) => m.id).filter((id: unknown): id is string => typeof id === 'string')
}

async function listGoogle(apiKey: string): Promise<string[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`)
  if (!res.ok) throw await httpError(res)
  const data = await res.json()
  const list: Array<{ name?: string; supportedGenerationMethods?: string[] }> = Array.isArray(data?.models) ? data.models : []
  return list
    .filter(m => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
    .map(m => (m.name ?? '').replace(/^models\//, ''))
    .filter(Boolean)
}

export async function listAvailableModels({ provider, baseUrl, apiKey }: ListModelsParams): Promise<string[]> {
  const key = apiKey ?? loadApiKey()
  if (!key) throw new Error('[auth] No API key configured')

  return withNetworkErrors(() => {
    switch (provider) {
      case 'anthropic':
        return listAnthropic(key)
      case 'google':
        return listGoogle(key)
      case 'openai':
        return listOpenAI(key)
      case 'custom':
        return listOpenAICompatible(key, baseUrl)
    }
  })
}
