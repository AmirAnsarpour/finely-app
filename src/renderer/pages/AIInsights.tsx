import React, { useState, useEffect, useMemo, useRef } from 'react'
import { Sparkles, Trash2, RefreshCw, Activity, Send } from 'lucide-react'
import GlassCard from '../components/GlassCard'
import Modal from '../components/Modal'
import MarkdownView from '../components/MarkdownView'
import type { UseDataReturn } from '../hooks/useData'
import type { UseAIAnalysisReturn } from '../hooks/useAIAnalysis'
import type { AIUsageEntry, AIChatMessage, AppSettings } from '../types'
import { useToast } from '../components/Toast'
import { useCalendar } from '../utils/calendarContext'
import { buildSpendingSummary, summaryToPrompt } from '../utils/aiAnalysis'
import { fileManager } from '../utils/fileManager'
import { logAIUsage, languageInstruction, MARKDOWN_FORMAT_INSTRUCTION } from '../utils/aiClient'
import { friendlyAIErrorMessage } from '../utils/aiError'
import { generateId } from '../utils/formatters'

interface Props { data: UseDataReturn; aiData: UseAIAnalysisReturn }

function UsageStats() {
  const [usage, setUsage] = useState<AIUsageEntry[] | null>(null)

  useEffect(() => { fileManager.readAIUsage().then(setUsage) }, [])

  const totals = useMemo(() => {
    if (!usage || usage.length === 0) return null
    return usage.reduce(
      (acc, u) => ({
        calls: acc.calls + 1,
        input: acc.input + (u.inputTokens ?? 0),
        output: acc.output + (u.outputTokens ?? 0),
      }),
      { calls: 0, input: 0, output: 0 }
    )
  }, [usage])

  if (!totals) return null

  return (
    <GlassCard className="card-appear" style={{ marginBottom: 16 }}>
      <div className="nw-strip">
        <div className="nw-col">
          <span className="nw-label">AI Calls Logged</span>
          <span className="nw-value">{totals.calls}</span>
        </div>
        <div className="nw-divider" />
        <div className="nw-col">
          <span className="nw-label">Input Tokens</span>
          <span className="nw-value">{totals.input.toLocaleString()}</span>
        </div>
        <div className="nw-divider" />
        <div className="nw-col">
          <span className="nw-label">Output Tokens</span>
          <span className="nw-value">{totals.output.toLocaleString()}</span>
        </div>
      </div>
      <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, marginBottom: 0 }}>
        Token counts only — no dollar estimate, since per-model pricing varies by provider and changes often.
      </p>
    </GlassCard>
  )
}

function buildChatSystemPrompt(
  settings: AppSettings,
  data: UseDataReturn,
  getLast6Months: () => string[],
  getMonthKey: (iso: string) => string,
  getMonthLabel: (key: string) => string
): string {
  const summary = buildSpendingSummary(data.transactions, data.categories, data.settings.currencySymbol, getLast6Months(), getMonthKey, getMonthLabel)
  return (
    `You are a helpful personal finance assistant chatting with the app's user about their own finances. ` +
    `Below is their aggregated spending data — category totals per month only, no transaction-level descriptions, merchant names, or account names:\n\n` +
    `${summaryToPrompt(summary)}\n\n` +
    `Answer their questions using this data when relevant. If they ask something this data can't answer, say so plainly rather than guessing. ` +
    `${languageInstruction(settings)}\n\n` +
    MARKDOWN_FORMAT_INSTRUCTION
  )
}

function AIChatPanel({ data }: { data: UseDataReturn }) {
  const { settings } = data
  const { getLast6Months, getMonthKey, getMonthLabel } = useCalendar()
  const { toast } = useToast()
  const [messages, setMessages] = useState<AIChatMessage[]>([])
  const [loaded, setLoaded] = useState(false)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fileManager.readAIChatMessages().then(msgs => { setMessages(msgs); setLoaded(true) })
  }, [])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, streamingText])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    if (!settings.aiProvider || !settings.aiModel) {
      toast('Set up an AI provider and model in Settings first.', 'error')
      return
    }

    const userMsg: AIChatMessage = { id: generateId(), role: 'user', content: text, createdAt: new Date().toISOString() }
    const withUser = [...messages, userMsg]
    setMessages(withUser)
    setInput('')
    setSending(true)
    setStreamingText('')
    void fileManager.writeAIChatMessages(withUser)

    const unsubscribe = fileManager.onAIChatChunk(chunk => setStreamingText(prev => prev + chunk))
    try {
      const systemPrompt = buildChatSystemPrompt(settings, data, getLast6Months, getMonthKey, getMonthLabel)
      const history = withUser.map(m => ({ role: m.role, content: m.content }))
      const result = await fileManager.streamAIChat(settings.aiProvider, settings.aiModel, settings.aiBaseUrl, systemPrompt, history)
      void logAIUsage(settings, 'chat', result.usage)
      const assistantMsg: AIChatMessage = { id: generateId(), role: 'assistant', content: result.text, createdAt: new Date().toISOString() }
      const withAssistant = [...withUser, assistantMsg]
      setMessages(withAssistant)
      void fileManager.writeAIChatMessages(withAssistant)
    } catch (err) {
      toast(friendlyAIErrorMessage(err), 'error')
    } finally {
      unsubscribe()
      setStreamingText('')
      setSending(false)
    }
  }

  const handleClear = async () => {
    setMessages([])
    await fileManager.writeAIChatMessages([])
    setConfirmClear(false)
  }

  return (
    <>
      <div className="ai-chat">
        <div className="ai-chat__messages" ref={scrollRef}>
          {loaded && messages.length === 0 && !streamingText && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, padding: '32px 0' }}>
              Ask anything about your spending, budgets, or trends.
            </p>
          )}
          {messages.map(m => (
            <div key={m.id} className={`ai-chat__msg ai-chat__msg--${m.role}`}>
              {m.role === 'assistant' ? <MarkdownView content={m.content} /> : <p dir="auto">{m.content}</p>}
            </div>
          ))}
          {sending && (
            <div className="ai-chat__msg ai-chat__msg--assistant">
              {streamingText ? <MarkdownView content={streamingText} /> : <span className="ai-chat__typing">Thinking…</span>}
            </div>
          )}
        </div>
        <div className="ai-chat__input-row">
          <input
            type="text"
            className="form-input"
            placeholder="Ask about your spending…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
            disabled={sending}
          />
          <button type="button" className="btn-add" onClick={handleSend} disabled={sending || !input.trim()}>
            <Send size={14} /> Send
          </button>
          {messages.length > 0 && (
            <button type="button" className="icon-action" title="Clear chat" onClick={() => setConfirmClear(true)}>
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear Chat" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Delete the entire chat history? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmClear(false)}>Cancel</button>
          <button className="btn-danger" onClick={handleClear}>Clear</button>
        </div>
      </Modal>
    </>
  )
}

export default function AIInsights({ data, aiData }: Props) {
  const { analyses, hasKey, loading, running, runAnalysis, deleteAnalysis } = aiData
  const { toast } = useToast()
  const { getLast6Months, getMonthKey, getMonthLabel } = useCalendar()
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [tab, setTab] = useState<'analyses' | 'chat'>('analyses')

  const busy = running || analyzing

  const previewText = useMemo(
    () => summaryToPrompt(buildSpendingSummary(data.transactions, data.categories, data.settings.currencySymbol, getLast6Months(), getMonthKey, getMonthLabel)),
    [data.transactions, data.categories, data.settings.currencySymbol, getLast6Months, getMonthKey, getMonthLabel]
  )
  // ~4 characters per token is a common rough approximation — not exact,
  // but enough to know "this is small" vs "this is a lot" before sending.
  const approxTokens = Math.round(previewText.length / 4)

  const handleAnalyze = async () => {
    setAnalyzing(true)
    try {
      const result = await runAnalysis()
      if (result.ok) toast('Analysis complete')
      else toast(result.error ?? 'Analysis failed', 'error')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <div className="page page-enter">
      <div className="page-header">
        <div>
          <h1 className="page-title">AI Insights</h1>
          <p className="page-sub">Spending analysis from the AI provider you configured in Settings</p>
        </div>
        {tab === 'analyses' && (
          <button className="btn-add" onClick={handleAnalyze} disabled={!hasKey || busy || loading}>
            <RefreshCw size={14} style={busy ? { animation: 'spin 1s linear infinite' } : undefined} />
            {busy ? 'Analyzing…' : 'Analyze Now'}
          </button>
        )}
      </div>

      <div className="ai-tabs">
        <button type="button" className={`ai-tab ${tab === 'analyses' ? 'ai-tab--active' : ''}`} onClick={() => setTab('analyses')}>
          Monthly Analyses
        </button>
        <button type="button" className={`ai-tab ${tab === 'chat' ? 'ai-tab--active' : ''}`} onClick={() => setTab('chat')}>
          Chat
        </button>
      </div>

      {tab === 'analyses' && hasKey && (
        <GlassCard padding="sm" className="card-appear" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              <Activity size={12} style={{ verticalAlign: -2, marginInlineEnd: 4 }} />
              Each run sends ~{previewText.length.toLocaleString()} characters (~{approxTokens.toLocaleString()} tokens, rough estimate) of category totals — last 6 months
            </span>
            <button
              type="button"
              onClick={() => setShowPreview(v => !v)}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline', flexShrink: 0 }}
            >
              {showPreview ? 'Hide' : 'Show'} exact data
            </button>
          </div>
          {showPreview && (
            <pre style={{ marginTop: 10, marginBottom: 0, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 240, overflowY: 'auto', fontFamily: 'monospace' }}>
              {previewText}
            </pre>
          )}
        </GlassCard>
      )}

      {tab === 'analyses' && <UsageStats />}

      {!loading && !hasKey && (
        <GlassCard className="card-appear goals-empty">
          <div className="goals-empty-ring">
            <Sparkles size={26} color="var(--accent)" />
          </div>
          <p className="goals-empty-title">No AI provider configured</p>
          <p className="goals-empty-sub">
            Add an API key in Settings → AI Spending Analysis to get started.
          </p>
        </GlassCard>
      )}

      {tab === 'analyses' && !loading && hasKey && analyses.length === 0 && (
        <GlassCard className="card-appear goals-empty">
          <div className="goals-empty-ring">
            <Sparkles size={26} color="var(--accent)" />
          </div>
          <p className="goals-empty-title">No analysis yet</p>
          <p className="goals-empty-sub">Click "Analyze Now" to get your first spending analysis.</p>
        </GlassCard>
      )}

      {tab === 'analyses' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {analyses.map(a => (
            <GlassCard key={a.id} className="card-appear">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {new Date(a.createdAt).toLocaleString()} · {a.provider} / {a.model}
                </span>
                <button
                  onClick={() => setConfirmDelete(a.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4, flexShrink: 0 }}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <MarkdownView content={a.content} />
            </GlassCard>
          ))}
        </div>
      )}

      {tab === 'chat' && hasKey && <AIChatPanel data={data} />}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete Analysis" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 20, lineHeight: 1.6 }}>
          Delete this analysis? This cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
          <button
            className="btn-danger"
            onClick={async () => { if (confirmDelete) await deleteAnalysis(confirmDelete); setConfirmDelete(null) }}
          >
            Delete
          </button>
        </div>
      </Modal>
    </div>
  )
}
