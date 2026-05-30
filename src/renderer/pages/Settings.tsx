import React, { useState } from "react";
import { FolderOpen, Upload, Download, Github, ExternalLink } from "lucide-react";
import Select from "../components/Select";
import GlassCard from "../components/GlassCard";
import type { UseDataReturn } from "../hooks/useData";
import { CURRENCIES } from "../utils/formatters";
import { useToast } from "../components/Toast";
import { applyTheme } from "../App";

interface Props {
  data: UseDataReturn;
}

export default function Settings({ data }: Props) {
  const { settings, updateSettings, exportZip, importZip, selectFolder } = data;
  const { toast } = useToast();
  const [browsing, setBrowsing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const handleCurrencyChange = async (code: string) => {
    const cur = CURRENCIES.find((c) => c.code === code);
    if (!cur) return;
    await updateSettings({
      currency: cur.code,
      currencySymbol: cur.symbol,
      currencyLocale: cur.locale,
    });
    toast("Currency updated");
  };

  const handleThemeChange = async (theme: string) => {
    await updateSettings({
      theme: theme as "light" | "dark" | "black" | "system",
    });
    applyTheme(theme as "light" | "dark" | "black" | "system");
    toast("Theme updated");
  };

  const handleBrowseFolder = async () => {
    setBrowsing(true);
    try {
      const folder = await selectFolder();
      if (folder) {
        await updateSettings({ dataFolder: folder });
        toast("Data folder updated");
      }
    } finally {
      setBrowsing(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const ok = await exportZip();
      if (ok) toast("Backup exported successfully");
      else toast("Export cancelled", "info");
    } finally {
      setExporting(false);
    }
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const ok = await importZip();
      if (ok) toast("Data imported successfully");
      else toast("Import cancelled", "info");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="page page-enter">
      <div style={{ marginBottom: 24 }}>
        <h1 className="page-title">Settings</h1>
        <p className="page-sub">Customize your Finely experience</p>
      </div>

      <div className="settings-grid">
        {/* Appearance */}
        <GlassCard className="card-appear">
          <h2 className="section-title">Appearance</h2>
          <p className="section-sub">Personalize the look of the app</p>
          <div className="settings-section">
            <div className="setting-row">
              <div>
                <p className="setting-name">Theme</p>
                <p className="setting-desc">
                  Choose your preferred color scheme
                </p>
              </div>
              <div style={{ minWidth: 180 }}>
                <Select
                  value={settings.theme}
                  onChange={handleThemeChange}
                  options={[
                    { value: "light", label: "  Light" },
                    { value: "dark", label: "  Dark" },
                    { value: "black", label: "  Black" },
                    { value: "system", label: "  System" },
                  ]}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Currency */}
        <GlassCard className="card-appear">
          <h2 className="section-title">Currency</h2>
          <p className="section-sub">
            How amounts are displayed throughout the app
          </p>
          <div className="settings-section">
            <div className="setting-row">
              <div>
                <p className="setting-name">Currency</p>
                <p className="setting-desc">
                  Currently: {settings.currencySymbol} ({settings.currency})
                </p>
              </div>
              <div style={{ minWidth: 220 }}>
                <Select
                  value={settings.currency}
                  onChange={handleCurrencyChange}
                  options={CURRENCIES.map((c) => ({
                    value: c.code,
                    label: c.label,
                  }))}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Data folder */}
        <GlassCard className="card-appear">
          <h2 className="section-title">Data Storage</h2>
          <p className="section-sub">
            Where your JSON files are saved — use any synced folder for
            cross-device access
          </p>
          <div className="settings-section">
            <div className="setting-row setting-row--col">
              <div>
                <p className="setting-name">Data Folder</p>
                <p className="setting-desc folder-path">
                  {settings.dataFolder || "Default location"}
                </p>
              </div>
              <button
                className="btn-secondary"
                onClick={handleBrowseFolder}
                disabled={browsing}
              >
                <FolderOpen size={15} />
                {browsing ? "Selecting…" : "Browse Folder"}
              </button>
            </div>
            <div className="folder-tip">
              Tip: Set this to a Dropbox or Google Drive folder to sync across
              devices. All data files (transactions.json, categories.json,
              settings.json) will be stored there.
            </div>
          </div>
        </GlassCard>

        {/* Import / Export */}
        <GlassCard className="card-appear">
          <h2 className="section-title">Backup & Restore</h2>
          <p className="section-sub">
            Export all your data or restore from a backup
          </p>
          <div className="settings-section">
            <div className="backup-row">
              <div className="backup-item">
                <div
                  className="backup-icon"
                  style={{ background: "var(--income-dim)" }}
                >
                  <Download size={18} color="var(--income)" />
                </div>
                <div className="backup-info">
                  <p className="setting-name">Export Backup</p>
                  <p className="setting-desc">
                    Download all data as a .zip file
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={handleExport}
                  disabled={exporting}
                >
                  {exporting ? "Exporting…" : "Export ZIP"}
                </button>
              </div>
              <div className="backup-item">
                <div
                  className="backup-icon"
                  style={{ background: "var(--accent-dim)" }}
                >
                  <Upload size={18} color="var(--accent)" />
                </div>
                <div className="backup-info">
                  <p className="setting-name">Import Backup</p>
                  <p className="setting-desc">
                    Restore data from a .zip backup
                  </p>
                </div>
                <button
                  className="btn-secondary"
                  onClick={handleImport}
                  disabled={importing}
                >
                  {importing ? "Importing…" : "Import ZIP"}
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* About */}
        <GlassCard className="card-appear">
          <h2 className="section-title">About Finely</h2>
          <p className="section-sub">Open-source personal finance tracker</p>
          <div className="about-info">
            <div className="about-row">
              <span className="about-label">Version</span>
              <span className="about-value">1.0.0</span>
            </div>
            <div className="about-row">
              <span className="about-label">Data format</span>
              <span className="about-value">JSON (human-readable)</span>
            </div>
            <div className="about-row">
              <span className="about-label">Tech stack</span>
              <span className="about-value">Electron · React · TypeScript</span>
            </div>
            <div className="about-links">
              <button
                className="about-link-btn"
                onClick={() => window.electronAPI.openExternal('https://github.com/AmirAnsarpour/finely-app')}
              >
                <Github size={15} />
                <span>GitHub Repository</span>
                <ExternalLink size={12} className="about-link-ext" />
              </button>
              <button
                className="about-link-btn"
                onClick={() => window.electronAPI.openExternal('https://github.com/AmirAnsarpour')}
              >
                <Github size={15} />
                <span>Developer Profile</span>
                <ExternalLink size={12} className="about-link-ext" />
              </button>
            </div>
          </div>
        </GlassCard>
      </div>

      <style>{`
        .page-title { font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
        .page-sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
        .settings-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media (max-width: 900px) { .settings-grid { grid-template-columns: 1fr; } }
        .section-title { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
        .section-sub { font-size: 12px; color: var(--text-muted); margin-bottom: 20px; }
        .settings-section { display: flex; flex-direction: column; gap: 16px; }
        .setting-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .setting-row--col { flex-direction: column; align-items: flex-start; }
        .setting-name { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .setting-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }
        .folder-path { font-family: monospace; font-size: 11px; word-break: break-all; max-width: 100%; }
        .folder-tip { font-size: 12px; color: var(--text-muted); background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); padding: 10px 12px; line-height: 1.6; }

.btn-secondary { display: flex; align-items: center; gap: 7px; padding: 9px 16px; border-radius: var(--radius-md); background: var(--glass-bg); border: 1px solid var(--glass-border); color: var(--text-secondary); font-size: 13px; font-weight: 500; cursor: pointer; transition: all var(--transition); white-space: nowrap; }
        .btn-secondary:hover:not(:disabled) { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .btn-secondary:disabled { opacity: 0.55; cursor: not-allowed; }
        .backup-row { display: flex; flex-direction: column; gap: 12px; }
        .backup-item { display: flex; align-items: center; gap: 14px; padding: 14px 16px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-md); }
        .backup-icon { width: 40px; height: 40px; border-radius: var(--radius-sm); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .backup-info { flex: 1; }
        .about-info { display: flex; flex-direction: column; gap: 10px; }
        .about-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--glass-bg); border: 1px solid var(--glass-border); border-radius: var(--radius-sm); }
        .about-label { font-size: 13px; color: var(--text-secondary); }
        .about-value { font-size: 13px; font-weight: 500; color: var(--text-primary); }
        .about-links { display: flex; flex-direction: column; gap: 8px; margin-top: 2px; }
        .about-link-btn {
          display: flex; align-items: center; gap: 10px; padding: 11px 14px;
          background: var(--glass-bg); border: 1px solid var(--glass-border);
          border-radius: var(--radius-sm); color: var(--text-secondary);
          font-size: 13px; font-weight: 500; cursor: pointer; text-align: left;
          transition: background var(--transition), color var(--transition), border-color var(--transition);
        }
        .about-link-btn:hover { background: var(--glass-bg-hover); color: var(--text-primary); border-color: var(--glass-border-hover); }
        .about-link-btn span { flex: 1; }
        .about-link-ext { color: var(--text-muted); flex-shrink: 0; transition: color var(--transition); }
        .about-link-btn:hover .about-link-ext { color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
