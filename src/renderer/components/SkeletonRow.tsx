import React from 'react'

export default function SkeletonRow({ width = '60%' }: { width?: string }) {
  return (
    <div className="sk-row">
      <div className="sk-icon sk-shine" />
      <div className="sk-info">
        <div className="sk-line sk-shine" style={{ width: '38%' }} />
        <div className="sk-line sk-shine sk-line--sm" style={{ width }} />
      </div>
      <div className="sk-right">
        <div className="sk-line sk-shine" style={{ width: 68 }} />
        <div className="sk-line sk-shine sk-line--sm" style={{ width: 44 }} />
      </div>
      <style>{`
        .sk-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 16px; border-radius: var(--radius-md);
          background: var(--glass-bg); border: 1px solid var(--glass-border);
        }
        .sk-icon { width: 42px; height: 42px; border-radius: var(--radius-md); flex-shrink: 0; }
        .sk-info { flex: 1; display: flex; flex-direction: column; gap: 7px; }
        .sk-right { display: flex; flex-direction: column; align-items: flex-end; gap: 7px; }
        .sk-line { height: 13px; border-radius: 5px; }
        .sk-line--sm { height: 10px; }
        .sk-shine {
          background: linear-gradient(90deg, var(--glass-bg) 25%, var(--glass-bg-hover) 50%, var(--glass-bg) 75%);
          background-size: 400px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
