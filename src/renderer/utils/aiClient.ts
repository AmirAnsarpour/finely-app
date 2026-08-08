import type { AppSettings, AICallResult, AIUsageEntry } from '../types'
import { fileManager } from './fileManager'
import { generateId } from './formatters'
import { friendlyAIErrorMessage } from './aiError'

// Best-effort — a logging failure should never break the actual AI call.
export async function logAIUsage(settings: AppSettings, purpose: string, usage: AICallResult['usage']): Promise<void> {
  if (!usage || (usage.inputTokens == null && usage.outputTokens == null)) return
  try {
    const entry: AIUsageEntry = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      provider: settings.aiProvider!,
      model: settings.aiModel!,
      purpose,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
    }
    const existing = await fileManager.readAIUsage()
    // Capped so the log file doesn't grow without bound over months of use.
    await fileManager.writeAIUsage([entry, ...existing].slice(0, 500))
  } catch {
    // Non-critical — usage stats are informational only.
  }
}

// The single entry point every one-off AI feature (drill-downs, budget
// suggestions, category suggestions, quick-add parsing, ...) calls through —
// centralizes the "is AI configured", usage logging, and friendly-error
// concerns so individual features only worry about their own prompt.
export async function askAI(settings: AppSettings, purpose: string, systemPrompt: string, userPrompt: string): Promise<string> {
  if (!settings.aiProvider || !settings.aiModel) {
    throw new Error('Set up an AI provider and model in Settings first.')
  }
  try {
    const result = await fileManager.runAIAnalysis(settings.aiProvider, settings.aiModel, settings.aiBaseUrl, systemPrompt, userPrompt)
    void logAIUsage(settings, purpose, result.usage)
    return result.text
  } catch (err) {
    throw new Error(friendlyAIErrorMessage(err))
  }
}

// Appends the language instruction every AI prompt in the app shares, so
// switching it in Settings affects every feature consistently.
export function languageInstruction(settings: AppSettings): string {
  switch (settings.aiResponseLanguage) {
    case 'fa':
      return 'Respond in Persian (Farsi), regardless of what language the data is in.'
    case 'en':
      return 'Respond in English, regardless of what language the data is in.'
    default:
      return 'Respond in the same language as the data given to you (e.g. category names).'
  }
}

// Shared by every feature whose output is shown through <MarkdownView> —
// keeps every AI-generated block renderable by that one constrained parser
// instead of each feature inventing its own format.
export const MARKDOWN_FORMAT_INSTRUCTION =
  `Format the response as Markdown using ONLY this exact subset, nothing else:\n` +
  `- "## " at the start of a line for a section heading\n` +
  `- "- " at the start of a line for a bullet point\n` +
  `- "**text**" to emphasize a key number or category name\n` +
  `- Blank lines between paragraphs\n` +
  `Do not use tables, code blocks, links, images, numbered lists, or nested lists — the renderer only understands the subset above.`
