import React from 'react'

// Renders only the constrained Markdown subset the AI system prompt asks
// for (see AI_ANALYSIS_SYSTEM_PROMPT in utils/aiAnalysis.ts): "## " headings,
// "- " bullets, "**bold**", and blank-line-separated paragraphs. Not a
// general-purpose Markdown renderer — deliberately matched to what we ask
// the model to produce, so no parser dependency is needed.

// Hebrew (U+0590–05FF), Arabic (U+0600–06FF), Syriac (U+0700–074F) — covers
// Persian, which is written with the Arabic script.
function isRTLText(text: string): boolean {
  const rtlChars = text.match(/[֐-׿؀-ۿ܀-ݏ]/g)
  const totalChars = text.replace(/\s/g, '').length
  if (!rtlChars || totalChars === 0) return false
  return rtlChars.length / totalChars > 0.3
}

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(p => p !== '')
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
      : <React.Fragment key={`${keyPrefix}-${i}`}>{part}</React.Fragment>
  )
}

export default function MarkdownView({ content }: { content: string }) {
  const rtl = isRTLText(content)
  const lines = content.split('\n')
  const blocks: React.ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) { i++; continue }

    const heading = line.match(/^##\s+(.*)/)
    if (heading) {
      blocks.push(<h2 key={key} className="ai-md-h2">{renderInline(heading[1], `h${key++}`)}</h2>)
      i++
      continue
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''))
        i++
      }
      blocks.push(
        <ul key={key} className="ai-md-ul">
          {items.map((it, idx) => <li key={idx}>{renderInline(it, `li${key}-${idx}`)}</li>)}
        </ul>
      )
      key++
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() && !/^##\s+/.test(lines[i]) && !/^[-*]\s+/.test(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    blocks.push(<p key={key} className="ai-md-p">{renderInline(paraLines.join(' '), `p${key++}`)}</p>)
  }

  return (
    <div className={`ai-md ${rtl ? 'ai-md--rtl' : ''}`} dir={rtl ? 'rtl' : 'ltr'}>
      {blocks}
    </div>
  )
}
