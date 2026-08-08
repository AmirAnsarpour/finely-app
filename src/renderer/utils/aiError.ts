export type AIErrorKind = 'auth' | 'rate_limit' | 'server' | 'network' | 'unknown'

export interface ParsedAIError {
  kind: AIErrorKind
  message: string
}

// The main process encodes the error kind as a "[kind] " prefix on the
// thrown Error's message — the only part of a thrown error guaranteed to
// survive the ipcMain.handle boundary intact. See src/main/ai.ts.
export function parseAIError(err: unknown): ParsedAIError {
  const raw = err instanceof Error ? err.message : String(err)
  const match = raw.match(/^\[(auth|rate_limit|server|network|unknown)\]\s*(.*)$/s)
  if (match) return { kind: match[1] as AIErrorKind, message: match[2] }
  return { kind: 'unknown', message: raw }
}

export function friendlyAIErrorMessage(err: unknown): string {
  const { kind, message } = parseAIError(err)
  switch (kind) {
    case 'auth':
      return "API key rejected — check it's correct and has access to this model."
    case 'rate_limit':
      return 'Rate limited by the provider — wait a moment and try again.'
    case 'server':
      return 'The AI provider is having issues right now — try again shortly.'
    case 'network':
      return 'Could not reach the API — check your internet connection.'
    default:
      return message || 'Something went wrong.'
  }
}
