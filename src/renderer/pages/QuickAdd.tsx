import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { useData } from '../hooks/useData'
import TransactionForm from './TransactionForm'
import { applyTheme } from '../App'
import logoUrl from '../assets/finely.png'

// Standalone route rendered in its own small BrowserWindow, opened from the
// system tray — lets the user log a transaction without the full app (with
// its dashboard/sidebar) ever appearing. Reuses TransactionForm so add/edit/
// transfer logic stays in sync with the main app.
export default function QuickAdd() {
  const data = useData()
  const isMac = window.electronAPI.platform === 'darwin'

  useEffect(() => {
    if (!data.loading) applyTheme(data.settings.theme)
  }, [data.loading, data.settings.theme])

  const close = () => window.electronAPI.windowClose()

  return (
    <div className="quickadd">
      <div className={`quickadd__header ${isMac ? 'quickadd__header--mac' : ''}`}>
        <span className="quickadd__title">
          <img src={logoUrl} alt="" className="quickadd__logo" />
          Quick Add
        </span>
        {!isMac && (
          <button className="winbtn winbtn--close" onClick={close} title="Close">
            <X size={10} strokeWidth={3} />
          </button>
        )}
      </div>
      <div className="quickadd__body">
        {data.loading ? (
          <div className="quickadd__loading"><div className="spinner" /></div>
        ) : (
          <TransactionForm
            categories={data.categories}
            accounts={data.accounts}
            settings={data.settings}
            transactions={data.transactions}
            onSave={async (tx) => {
              await data.addTransaction(tx)
              close()
            }}
            onCancel={close}
          />
        )}
      </div>
    </div>
  )
}
