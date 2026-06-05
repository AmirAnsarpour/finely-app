import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Tag,
  BarChart3, Settings, Minus, Square, X, Plus, CreditCard, Target
} from 'lucide-react'
import logoUrl from '../assets/finely.png'

const MAIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/installments', icon: CreditCard, label: 'Installments' },
  { to: '/goals', icon: Target, label: 'Goals' },
]

interface SidebarProps {
  onOpenAdd: () => void
  budgetAlertCount?: number
  installmentAlertCount?: number
}

export default function Sidebar({ onOpenAdd, budgetAlertCount = 0, installmentAlertCount = 0 }: SidebarProps) {
  return (
    <aside className="sidebar glass">
      {/* Title bar / drag region */}
      <div className="sidebar__titlebar">
        <div className="sidebar__logo">
          <img src={logoUrl} alt="Finely" className="sidebar__logo-img" />
          <span className="sidebar__app-name">Finely</span>
        </div>
        <div className="sidebar__winbtns">
          <button className="winbtn winbtn--minimize" onClick={() => window.electronAPI.windowMinimize()} title="Minimize">
            <Minus size={10} strokeWidth={3} />
          </button>
          <button className="winbtn winbtn--maximize" onClick={() => window.electronAPI.windowMaximize()} title="Maximize">
            <Square size={9} strokeWidth={3} />
          </button>
          <button className="winbtn winbtn--close" onClick={() => window.electronAPI.windowClose()} title="Close">
            <X size={10} strokeWidth={3} />
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="sidebar__cta-wrap">
        <button className="sidebar__cta" onClick={onOpenAdd}>
          <Plus size={15} strokeWidth={2.5} />
          <span>Add Transaction</span>
          <kbd className="sidebar__kbd">^N</kbd>
        </button>
      </div>

      {/* Main nav */}
      <nav className="sidebar__nav">
        {MAIN_NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}>
            <Icon size={17} strokeWidth={2} />
            <span>{label}</span>
            {to === '/reports' && budgetAlertCount > 0 && (
              <span className="sidebar__badge">{budgetAlertCount}</span>
            )}
            {to === '/installments' && installmentAlertCount > 0 && (
              <span className="sidebar__badge sidebar__badge--accent">{installmentAlertCount}</span>
            )}
          </NavLink>
        ))}

        <div className="sidebar__spacer" />
        <div className="sidebar__divider" />

        <NavLink to="/settings"
          className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}>
          <Settings size={17} strokeWidth={2} />
          <span>Settings</span>
        </NavLink>
      </nav>

    </aside>
  )
}
