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
    </div>
  )
}
