import React from 'react'
import {
  Briefcase, Code2, TrendingUp, Gift, DollarSign,
  Utensils, Car, ShoppingBag, Home, Film, Heart,
  BookOpen, Zap, MoreHorizontal, Tag, Wallet, Plane,
  Coffee, Music, Gamepad2, Baby, Dumbbell, PiggyBank
} from 'lucide-react'

const ICON_MAP: Record<string, React.ElementType> = {
  'briefcase': Briefcase,
  'code-2': Code2,
  'trending-up': TrendingUp,
  'gift': Gift,
  'dollar-sign': DollarSign,
  'utensils': Utensils,
  'car': Car,
  'shopping-bag': ShoppingBag,
  'home': Home,
  'film': Film,
  'heart': Heart,
  'book-open': BookOpen,
  'zap': Zap,
  'more-horizontal': MoreHorizontal,
  'tag': Tag,
  'wallet': Wallet,
  'plane': Plane,
  'coffee': Coffee,
  'music': Music,
  'gamepad-2': Gamepad2,
  'baby': Baby,
  'dumbbell': Dumbbell,
  'piggy-bank': PiggyBank,
}

export const AVAILABLE_ICONS = Object.keys(ICON_MAP)

interface CategoryIconProps {
  icon: string
  color: string
  size?: number
  showBg?: boolean
  bgSize?: number
}

export default function CategoryIcon({ icon, color, size = 16, showBg = false, bgSize = 36 }: CategoryIconProps) {
  const IconComp = ICON_MAP[icon] ?? Tag

  if (showBg) {
    return (
      <div style={{
        width: bgSize,
        height: bgSize,
        borderRadius: '50%',
        background: `${color}22`,
        border: `1px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        <IconComp size={size} color={color} strokeWidth={2} />
      </div>
    )
  }

  return <IconComp size={size} color={color} strokeWidth={2} />
}
