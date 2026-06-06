import React, { useState, useEffect } from "react";
import {
  FolderOpen,
  Upload,
  Download,
  Github,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Select from "../components/Select";
import GlassCard from "../components/GlassCard";
import type { UseDataReturn } from "../hooks/useData";
import { CURRENCIES } from "../utils/formatters";
import { useToast } from "../components/Toast";
import { applyTheme } from "../App";

interface Props {
  data: UseDataReturn;
}

type UpdateState = "idle" | "checking" | "no-update" | "available" | "downloading" | "applying" | "error";

const isWindows = window.electronAPI.platform === "win32";

export default function Settings({ data }: Props) {
  const { settings, updateSettings, exportZip, importZip, selectFolder } = data;
  const { toast } = useToast();
  const [browsing, setBrowsing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [appVersion, setAppVersion] = useState("");
  const [updateState, setUpdateState] = useState<UpdateState>("idle");
  const [latestVersion, setLatestVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [updateError, setUpdateError] = useState("");

  useEffect(() => {
    window.electronAPI.getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    if (!isWindows) return;
    const unsub = window.electronAPI.onUpdateProgress((pct) => {
      setDownloadProgress(pct);
    });
    return unsub;
  }, []);

  const handleCheckUpdate = async () => {
    setUpdateState("checking");
    setUpdateError("");
    try {
      const info = await window.electronAPI.checkForUpdate();
      if (info.hasUpdate && info.downloadUrl) {
        setLatestVersion(info.latestVersion);
        setDownloadUrl(info.downloadUrl);
        setUpdateState("available");
      } else {
        setUpdateState("no-update");
      }
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Could not reach update server");
      setUpdateState("error");
    }
  };

  const handleDownloadAndApply = async () => {
    if (!downloadUrl) return;
    setUpdateState("downloading");
    setDownloadProgress(0);
    try {
      const tempPath = await window.electronAPI.downloadUpdate(downloadUrl);
      setUpdateState("applying");
      await window.electronAPI.applyUpdate(tempPath);
    } catch (e) {
      setUpdateError(e instanceof Error ? e.message : "Download failed");
      setUpdateState("error");
    }
  };

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

  const handleCalendarTypeChange = async (val: string) => {
    await updateSettings({ calendarType: val as "gregorian" | "jalali" });
    toast("Calendar updated");
  };

  const handleWeekStartChange = async (val: string) => {
    await updateSettings({ weekStartDay: parseInt(val) as 0 | 1 | 6 });
    toast("Week start updated");
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

        {/* Calendar */}
        <GlassCard className="card-appear">
          <h2 className="section-title">Calendar</h2>
          <p className="section-sub">Date display format and week layout</p>
          <div className="settings-section">
            <div className="setting-row">
              <div>
                <p className="setting-name">Calendar Type</p>
                <p className="setting-desc">
                  Gregorian (international) or Jalali (Persian / شمسی)
                </p>
              </div>
              <div style={{ minWidth: 200 }}>
                <Select
                  value={settings.calendarType ?? "gregorian"}
                  onChange={handleCalendarTypeChange}
                  options={[
                    { value: "gregorian", label: "Gregorian" },
                    { value: "jalali", label: "Jalali" },
                  ]}
                />
              </div>
            </div>
            <div className="setting-row">
              <div>
                <p className="setting-name">First Day of Week</p>
                <p className="setting-desc">The day your week starts on</p>
              </div>
              <div style={{ minWidth: 160 }}>
                <Select
                  value={String(settings.weekStartDay ?? 0)}
                  onChange={handleWeekStartChange}
                  options={[
                    { value: "6", label: "Saturday" },
                    { value: "0", label: "Sunday" },
                    { value: "1", label: "Monday" },
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
              <span className="about-value">{appVersion || "…"}</span>
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
                onClick={() =>
                  window.electronAPI.openExternal(
                    "https://github.com/AmirAnsarpour/finely-app",
                  )
                }
              >
                <Github size={15} />
                <span>GitHub Repository</span>
                <ExternalLink size={12} className="about-link-ext" />
              </button>
              <button
                className="about-link-btn"
                onClick={() =>
                  window.electronAPI.openExternal(
                    "https://github.com/AmirAnsarpour",
                  )
                }
              >
                <Github size={15} />
                <span>Developer Profile</span>
                <ExternalLink size={12} className="about-link-ext" />
              </button>
            </div>
          </div>
        </GlassCard>

        {/* Update — Windows portable only */}
        {isWindows && (
          <GlassCard className="card-appear">
            <h2 className="section-title">Updates</h2>
            <p className="section-sub">Keep Finely up to date automatically</p>
            <div className="settings-section">
              <div className="update-item">
                <div
                  className="backup-icon"
                  style={{
                    background:
                      updateState === "error"
                        ? "var(--expense-dim)"
                        : updateState === "no-update"
                          ? "var(--income-dim)"
                          : "var(--accent-dim)",
                  }}
                >
                  {updateState === "error" ? (
                    <AlertCircle size={18} color="var(--expense)" />
                  ) : updateState === "no-update" ? (
                    <CheckCircle2 size={18} color="var(--income)" />
                  ) : (
                    <RefreshCw
                      size={18}
                      color="var(--accent)"
                      style={
                        updateState === "checking" || updateState === "downloading" || updateState === "applying"
                          ? { animation: "spin 1s linear infinite" }
                          : undefined
                      }
                    />
                  )}
                </div>

                <div className="backup-info">
                  <p className="setting-name">
                    {updateState === "idle" && "Check for Updates"}
                    {updateState === "checking" && "Checking…"}
                    {updateState === "no-update" && "Up to Date"}
                    {updateState === "available" && `v${latestVersion} Available`}
                    {updateState === "downloading" && `Downloading… ${downloadProgress}%`}
                    {updateState === "applying" && "Applying Update…"}
                    {updateState === "error" && "Update Failed"}
                  </p>
                  <p className="setting-desc">
                    {updateState === "idle" && `Current version: ${appVersion || "…"}`}
                    {updateState === "checking" && "Contacting GitHub releases…"}
                    {updateState === "no-update" && `You're on the latest version`}
                    {updateState === "available" && "Ready to download and install"}
                    {updateState === "downloading" && "App will restart automatically when done"}
                    {updateState === "applying" && "Restarting shortly — do not close the app"}
                    {updateState === "error" && updateError}
                  </p>
                  {updateState === "downloading" && (
                    <div className="update-progress-track">
                      <div
                        className="update-progress-fill"
                        style={{ width: `${downloadProgress}%` }}
                      />
                    </div>
                  )}
                </div>

                {updateState === "idle" && (
                  <button className="btn-secondary" onClick={handleCheckUpdate}>
                    <RefreshCw size={15} />
                    Check
                  </button>
                )}
                {updateState === "no-update" && (
                  <button
                    className="btn-secondary"
                    onClick={() => setUpdateState("idle")}
                  >
                    <RefreshCw size={15} />
                    Recheck
                  </button>
                )}
                {updateState === "available" && (
                  <button
                    className="btn-secondary"
                    onClick={handleDownloadAndApply}
                    style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                  >
                    <Download size={15} />
                    Update
                  </button>
                )}
                {updateState === "error" && (
                  <button
                    className="btn-secondary"
                    onClick={() => setUpdateState("idle")}
                  >
                    <RefreshCw size={15} />
                    Retry
                  </button>
                )}
              </div>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
