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
    </div>
  )
}
