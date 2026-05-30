import React from 'react'

interface GlassCardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hover?: boolean
  glow?: boolean
  padding?: 'sm' | 'md' | 'lg' | 'none'
  style?: React.CSSProperties
}

const PADDING_MAP = {
  none: '0',
  sm: '16px',
  md: '20px',
  lg: '28px'
}

export default function GlassCard({
  children,
  className = '',
  onClick,
  hover = false,
  glow = false,
  padding = 'md',
  style
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={`glass-card ${hover ? 'glass-card--hover' : ''} ${glow ? 'glass-card--glow' : ''} ${onClick ? 'glass-card--clickable' : ''} ${className}`}
      style={{ '--card-padding': PADDING_MAP[padding], ...style } as React.CSSProperties}
    >
      {children}
      <style>{`
        .glass-card {
          background: var(--glass-bg);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border: 1px solid var(--glass-border);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-glass);
          padding: var(--card-padding, 20px);
          transition: transform var(--transition-spring), box-shadow var(--transition), border-color var(--transition), background var(--transition);
          position: relative;
          overflow: hidden;
        }
        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%);
          pointer-events: none;
        }
        .glass-card--hover:hover, .glass-card--clickable:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-hover);
          border-color: var(--glass-border-hover);
          background: var(--glass-bg-hover);
        }
        .glass-card--clickable {
          cursor: pointer;
        }
        .glass-card--clickable:active {
          transform: translateY(0px) scale(0.99);
        }
        .glass-card--glow {
          border-color: var(--glass-border-accent);
          box-shadow: var(--shadow-glass), 0 0 24px var(--accent-glow);
        }
      `}</style>
    </div>
  )
}
