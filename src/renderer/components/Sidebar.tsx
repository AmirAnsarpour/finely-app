import React from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, ArrowLeftRight, Tag,
  BarChart3, Settings, Minus, Square, X, Plus, CreditCard
} from 'lucide-react'
import logoUrl from '../assets/finely.png'

const MAIN_NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/categories', icon: Tag, label: 'Categories' },
  { to: '/reports', icon: BarChart3, label: 'Reports' },
  { to: '/installments', icon: CreditCard, label: 'Installments' },
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

      <style>{`
        .sidebar {
          width: var(--sidebar-width); height: 100vh;
          display: flex; flex-direction: column;
          border-radius: 0; border-top: none; border-bottom: none; border-left: none;
          flex-shrink: 0; position: relative; z-index: 10;
        }
        .sidebar__titlebar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 14px 10px;
          -webkit-app-region: drag; flex-shrink: 0;
        }
        .sidebar__logo { display: flex; align-items: center; gap: 8px; }
        .sidebar__logo-img { width: 26px; height: 26px; object-fit: contain; border-radius: 6px; flex-shrink: 0; }
        .sidebar__app-name {
          font-size: 16px; font-weight: 700; letter-spacing: -0.3px;
          background: linear-gradient(135deg, var(--accent), #a78bfa);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }
        [data-theme='black'] .sidebar__app-name {
          background: rgba(255,255,255,0.92);
          -webkit-background-clip: text; background-clip: text;
        }
        .sidebar__winbtns { display: flex; gap: 5px; -webkit-app-region: no-drag; }
        .winbtn {
          width: 20px; height: 20px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid var(--glass-border); background: var(--glass-bg);
          color: var(--text-muted); transition: all var(--transition); flex-shrink: 0;
        }
        .winbtn--minimize:hover { background: var(--warning-dim); color: var(--warning); border-color: rgba(251,191,36,0.4); }
        .winbtn--maximize:hover { background: var(--income-dim);  color: var(--income);  border-color: rgba(74,222,128,0.4);  }
        .winbtn--close:hover    { background: var(--expense-dim); color: var(--expense); border-color: rgba(248,113,113,0.4); }

        .sidebar__cta-wrap { padding: 4px 12px 8px; }
        .sidebar__cta {
          display: flex; align-items: center; gap: 8px; width: 100%;
          padding: 10px 14px; border-radius: var(--radius-md);
          background: linear-gradient(135deg, rgba(108,142,245,0.18), rgba(167,139,250,0.12));
          border: 1px solid rgba(108,142,245,0.35);
          color: var(--accent); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all var(--transition-spring);
          box-shadow: 0 2px 12px rgba(108,142,245,0.12);
        }
        [data-theme='black'] .sidebar__cta {
          background: rgba(255,255,255,0.05);
          border-color: rgba(255,255,255,0.12);
          box-shadow: none;
        }
        .sidebar__cta:hover {
          background: linear-gradient(135deg, rgba(108,142,245,0.28), rgba(167,139,250,0.2));
          border-color: rgba(108,142,245,0.55);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(108,142,245,0.22);
        }
        [data-theme='black'] .sidebar__cta:hover {
          background: rgba(255,255,255,0.09);
          border-color: rgba(255,255,255,0.22);
          box-shadow: none;
        }
        .sidebar__cta:active { transform: scale(0.98); }
        .sidebar__kbd {
          margin-left: auto; font-size: 10px; font-family: inherit;
          padding: 2px 5px; border-radius: 4px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          color: var(--text-muted); letter-spacing: 0;
        }

        .sidebar__nav {
          display: flex; flex-direction: column; gap: 3px;
          padding: 4px 12px 12px; flex: 1; overflow-y: auto;
        }
        .sidebar__link {
          display: flex; align-items: center; gap: 9px; padding: 9px 11px;
          border-radius: var(--radius-md); color: var(--text-secondary);
          text-decoration: none; font-size: 13px; font-weight: 500;
          border: 1px solid transparent;
          transition: background var(--transition), color var(--transition),
                      border-color var(--transition), transform var(--transition-spring);
        }
        .sidebar__link:hover {
          background: var(--glass-bg-hover); color: var(--text-primary);
          border-color: var(--glass-border); transform: translateX(2px);
        }
        .sidebar__link--active {
          background: var(--glass-bg-active); color: var(--accent);
          border-color: var(--glass-border-accent); font-weight: 600;
        }
        .sidebar__link--active:hover { transform: none; }
        .sidebar__badge {
          margin-left: auto; min-width: 18px; height: 18px; border-radius: 9px;
          padding: 0 5px; display: flex; align-items: center; justify-content: center;
          background: var(--warning); color: #000;
          font-size: 10px; font-weight: 700; letter-spacing: -0.2px;
          flex-shrink: 0; line-height: 1;
        }
        .sidebar__badge--accent { background: var(--accent); color: #fff; }
        .sidebar__spacer { flex: 1; }
        .sidebar__divider {
          height: 1px; background: var(--glass-border);
          margin: 6px 0; flex-shrink: 0;
        }
      `}</style>
    </aside>
  )
}
