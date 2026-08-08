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
import Modal from "../components/Modal";
import type { UseDataReturn } from "../hooks/useData";
import type { UseAIAnalysisReturn } from "../hooks/useAIAnalysis";
import type { AIProvider, AIResponseLanguage, VaultStatus } from "../types";
import { CURRENCIES } from "../utils/formatters";
import { fileManager } from "../utils/fileManager";
import { friendlyAIErrorMessage } from "../utils/aiError";
import { useToast } from "../components/Toast";
import { applyTheme } from "../App";

interface Props {
  data: UseDataReturn;
  aiData: UseAIAnalysisReturn;
}

const AI_PROVIDER_OPTIONS = [
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "google", label: "Google (Gemini)" },
  { value: "custom", label: "Custom (OpenAI-compatible)" },
];

const AI_MODEL_PLACEHOLDER: Record<AIProvider, string> = {
  openai: "e.g. gpt-4o",
  anthropic: "e.g. claude-opus-5",
  google: "e.g. gemini-2.5-pro",
  custom: "model id your endpoint expects",
};

const AI_KEY_URL: Record<AIProvider, string | null> = {
  openai: "https://platform.openai.com/api-keys",
  anthropic: "https://console.anthropic.com/settings/keys",
  google: "https://aistudio.google.com/apikey",
  custom: null,
};

function AISettingsSection({ data, aiData }: { data: UseDataReturn; aiData: UseAIAnalysisReturn }) {
  const { settings, updateSettings } = data;
  const { hasKey, loading: aiLoading, error, saveKey, clearKey } = aiData;
  const { toast } = useToast();

  const [provider, setProvider] = useState<AIProvider>(settings.aiProvider ?? "anthropic");
  const [model, setModel] = useState(settings.aiModel ?? "");
  const [baseUrl, setBaseUrl] = useState(settings.aiBaseUrl ?? "");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [editingKey, setEditingKey] = useState(!hasKey);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [manualModelEntry, setManualModelEntry] = useState(true);
  const [fetchingModels, setFetchingModels] = useState(false);

  // aiData resolves its own hasKey asynchronously (independent of the app's
  // main loading gate), so sync the key-entry view once that resolves.
  useEffect(() => {
    if (!aiLoading) setEditingKey(!hasKey);
  }, [aiLoading]);
  const [saving, setSaving] = useState(false);

  const keyUrl = AI_KEY_URL[provider];
  const showModelDropdown = availableModels.length > 0 && !manualModelEntry;
  const canFetchModels = (apiKeyInput.trim() || hasKey) && (provider !== "custom" || baseUrl.trim());

  const handleProviderChange = (v: string) => {
    const next = v as AIProvider;
    setProvider(next);
    setAvailableModels([]);
    setManualModelEntry(true);
    updateSettings({ aiProvider: next });
  };

  const handleModelPicked = (v: string) => {
    setModel(v);
    updateSettings({ aiModel: v });
  };

  const handleModelInputBlur = () => {
    if (model.trim()) updateSettings({ aiModel: model.trim() });
  };

  const handleBaseUrlBlur = () => {
    if (provider === "custom") updateSettings({ aiBaseUrl: baseUrl.trim() });
  };

  const handleFetchModels = async () => {
    setFetchingModels(true);
    try {
      const models = await fileManager.listAIModels(
        provider,
        provider === "custom" ? baseUrl.trim() : undefined,
        apiKeyInput.trim() || undefined
      );
      if (models.length === 0) {
        toast("No models returned — enter one manually", "info");
        setAvailableModels([]);
        setManualModelEntry(true);
      } else {
        setAvailableModels(models);
        setManualModelEntry(false);
        if (!models.includes(model)) setModel(models[0]);
      }
    } catch (e) {
      toast(friendlyAIErrorMessage(e), "error");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSaveKey = async () => {
    if (!apiKeyInput.trim()) { toast("Enter an API key", "info"); return; }
    setSaving(true);
    try {
      // Provider/model/base URL aren't secret and are saved as soon as you
      // pick them (see handleProviderChange etc.) — bundled here too so a
      // first-time setup persists everything in one click, in any order.
      await updateSettings({
        aiProvider: provider,
        aiModel: model.trim() || undefined,
        aiBaseUrl: provider === "custom" ? baseUrl.trim() : undefined,
      });
      await saveKey(apiKeyInput.trim());
      setApiKeyInput("");
      setEditingKey(false);
      toast("API key saved");
    } catch (e) {
      toast(friendlyAIErrorMessage(e), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async () => {
    await clearKey();
    setEditingKey(true);
    toast("API key removed", "info");
  };

  return (
    <GlassCard className="card-appear">
      <h2 className="section-title">AI Spending Analysis</h2>
      <p className="section-sub">
        Bring your own API key from any provider — only monthly category totals are sent, never transaction notes, tags, or account names
      </p>
      <div className="settings-section">
        <div className="setting-row">
          <div>
            <p className="setting-name">Provider</p>
            <p className="setting-desc">Which AI API the analysis request goes to</p>
          </div>
          <div style={{ minWidth: 220 }}>
            <Select value={provider} onChange={handleProviderChange} options={AI_PROVIDER_OPTIONS} />
          </div>
        </div>

        {provider === "custom" && (
          <div className="setting-row setting-row--col">
            <div>
              <p className="setting-name">Base URL</p>
              <p className="setting-desc">An OpenAI-compatible endpoint, e.g. https://api.groq.com/openai/v1</p>
            </div>
            <input
              className="form-input"
              value={baseUrl}
              onChange={(e) => { setBaseUrl(e.target.value); setAvailableModels([]); setManualModelEntry(true); }}
              onBlur={handleBaseUrlBlur}
              placeholder="https://…/v1"
            />
          </div>
        )}

        <div className="setting-row setting-row--col">
          <div>
            <p className="setting-name">Model</p>
            <p className="setting-desc">
              {showModelDropdown ? "Choose from the models your key can access" : "Type the exact model id, or fetch what your key can access"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {showModelDropdown ? (
              <div style={{ flex: 1 }}>
                <Select value={model} onChange={handleModelPicked} options={availableModels.map((m) => ({ value: m, label: m }))} />
              </div>
            ) : (
              <input
                className="form-input"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                onBlur={handleModelInputBlur}
                placeholder={AI_MODEL_PLACEHOLDER[provider]}
                style={{ flex: 1 }}
              />
            )}
            <button className="btn-secondary" onClick={handleFetchModels} disabled={fetchingModels || !canFetchModels} title="List the models your API key can access">
              {fetchingModels ? "Checking…" : "Fetch Models"}
            </button>
          </div>
          {showModelDropdown && (
            <button
              type="button"
              onClick={() => setManualModelEntry(true)}
              style={{ alignSelf: "flex-start", background: "none", border: "none", padding: 0, color: "var(--text-muted)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
            >
              Type a model id manually instead
            </button>
          )}
        </div>

        <div className="setting-row setting-row--col">
          <div>
            <p className="setting-name">API Key</p>
            <p className="setting-desc">
              Stored encrypted on this device only — never written to the plain-JSON data folder.
              {keyUrl && (
                <>
                  {" "}
                  <button
                    type="button"
                    onClick={() => window.electronAPI.openExternal(keyUrl)}
                    style={{ background: "none", border: "none", padding: 0, color: "var(--accent)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Get a key →
                  </button>
                </>
              )}
            </p>
          </div>
          {hasKey && !editingKey ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span className="setting-desc" style={{ color: "var(--income)" }}>● Key configured</span>
              <button className="btn-secondary" onClick={() => setEditingKey(true)}>Change</button>
              <button className="btn-secondary" onClick={handleRemoveKey}>Remove</button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="form-input"
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sk-…"
                style={{ flex: 1 }}
              />
              <button className="btn-secondary" onClick={handleSaveKey} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="rollover-toggle">
            <span className="rollover-toggle__text">
              <span className="form-label" style={{ margin: 0 }}>Analyze automatically every month</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>Runs once when a new month starts, if a key is configured</span>
            </span>
            <input
              type="checkbox"
              checked={!!settings.aiAutoMonthly}
              onChange={(e) => updateSettings({ aiAutoMonthly: e.target.checked })}
              style={{ display: "none" }}
            />
            <span className={`rollover-toggle__switch ${settings.aiAutoMonthly ? "rollover-toggle__switch--on" : ""}`} />
          </label>
        </div>

        <div className="setting-row">
          <div>
            <p className="setting-name">Response Language</p>
            <p className="setting-desc">Applies to every AI feature — analysis, chat, suggestions</p>
          </div>
          <div style={{ minWidth: 180 }}>
            <Select
              value={settings.aiResponseLanguage ?? "auto"}
              onChange={(v) => updateSettings({ aiResponseLanguage: v as AIResponseLanguage })}
              options={[
                { value: "auto", label: "Match my data" },
                { value: "fa", label: "فارسی" },
                { value: "en", label: "English" },
              ]}
            />
          </div>
        </div>

        {error && <p className="form-error">{error}</p>}

        <p className="folder-tip">
          Once a key is saved, go to the <strong>AI Insights</strong> page in the sidebar to run and read analyses.
        </p>
      </div>
    </GlassCard>
  );
}

function SecuritySettingsSection() {
  const { toast } = useToast();
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmDisable, setConfirmDisable] = useState(false);

  const refresh = () => fileManager.vaultStatus().then(setStatus);
  useEffect(() => { refresh(); }, []);

  const validatePassphrase = () => {
    if (passphrase.length < 8) { setError("Passphrase must be at least 8 characters"); return false; }
    if (passphrase !== confirmPassphrase) { setError("Passphrases do not match"); return false; }
    return true;
  };

  const handleEnable = async () => {
    setError("");
    if (!validatePassphrase()) return;
    setBusy(true);
    try {
      await fileManager.vaultEnable(passphrase);
      setPassphrase(""); setConfirmPassphrase("");
      await refresh();
      toast("Encryption enabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to enable encryption");
    } finally {
      setBusy(false);
    }
  };

  const handleChangePassphrase = async () => {
    setError("");
    if (!validatePassphrase()) return;
    setBusy(true);
    try {
      await fileManager.vaultChangePassphrase(passphrase);
      setPassphrase(""); setConfirmPassphrase("");
      toast("Passphrase changed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to change passphrase");
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = async () => {
    setBusy(true);
    try {
      await fileManager.vaultDisable();
      await refresh();
      toast("Encryption disabled", "info");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Failed to disable encryption", "error");
    } finally {
      setBusy(false);
      setConfirmDisable(false);
    }
  };

  const handleLock = async () => {
    await fileManager.vaultLock();
    window.location.reload();
  };

  const handleToggleOsUnlock = async (checked: boolean) => {
    setBusy(true);
    setError("");
    try {
      if (checked) await fileManager.vaultEnableOsUnlock();
      else await fileManager.vaultDisableOsUnlock();
      await refresh();
      toast(checked ? "Enabled" : "Disabled");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  return (
    <GlassCard className="card-appear">
      <h2 className="section-title">Data Encryption</h2>
      <p className="section-sub">
        {status.exists
          ? "Your data folder is encrypted with a passphrase only you know."
          : "Optional. Locks your entire data folder with a passphrase — useful if this folder syncs to the cloud."}
      </p>
      <div className="settings-section">
        {status.exists ? (
          <>
            <div className="setting-row">
              <div>
                <p className="setting-name">Status</p>
                <p className="setting-desc" style={{ color: "var(--income)" }}>● Encrypted</p>
              </div>
              <button className="btn-secondary" onClick={handleLock}>Lock Now</button>
            </div>

            {status.osUnlockAvailable && (
              <div className="form-group">
                <label className="rollover-toggle">
                  <span className="rollover-toggle__text">
                    <span className="form-label" style={{ margin: 0 }}>{isMac ? "Unlock with Touch ID" : "Unlock automatically on this device"}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>
                      {isMac
                        ? "Skip the passphrase using Touch ID. Anyone signed into this Mac could then open your data too."
                        : "Skip the passphrase since you're signed into this device. Anyone signed into this account could then open your data too."}
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={status.osUnlockEnabled}
                    onChange={(e) => handleToggleOsUnlock(e.target.checked)}
                    disabled={busy}
                    style={{ display: "none" }}
                  />
                  <span className={`rollover-toggle__switch ${status.osUnlockEnabled ? "rollover-toggle__switch--on" : ""}`} />
                </label>
              </div>
            )}

            <div className="setting-row setting-row--col">
              <div>
                <p className="setting-name">Change Passphrase</p>
                <p className="setting-desc">Re-encrypts every data file with a new passphrase</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="form-input" type="password" placeholder="New passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} style={{ flex: 1 }} />
                <input className="form-input" type="password" placeholder="Confirm" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} style={{ flex: 1 }} />
                <button className="btn-secondary" onClick={handleChangePassphrase} disabled={busy || !passphrase}>Change</button>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <p className="setting-name">Disable Encryption</p>
                <p className="setting-desc">Decrypts everything back to plain JSON</p>
              </div>
              <button className="btn-secondary" onClick={() => setConfirmDisable(true)}>Disable</button>
            </div>
          </>
        ) : (
          <div className="setting-row setting-row--col">
            <div>
              <p className="setting-name">Set a Passphrase</p>
              <p className="setting-desc">If you forget it, your data cannot be recovered — there's no reset.</p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input className="form-input" type="password" placeholder="Passphrase" value={passphrase} onChange={(e) => setPassphrase(e.target.value)} style={{ flex: 1 }} />
              <input className="form-input" type="password" placeholder="Confirm" value={confirmPassphrase} onChange={(e) => setConfirmPassphrase(e.target.value)} style={{ flex: 1 }} />
              <button className="btn-secondary" onClick={handleEnable} disabled={busy || !passphrase}>Enable</button>
            </div>
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
      </div>

      <Modal open={confirmDisable} onClose={() => setConfirmDisable(false)} title="Disable Encryption" width={380}>
        <p style={{ color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
          Your data files will be decrypted and stored as plain readable JSON again. Continue?
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={() => setConfirmDisable(false)}>Cancel</button>
          <button className="btn-danger" onClick={handleDisable} disabled={busy}>Disable</button>
        </div>
      </Modal>
    </GlassCard>
  );
}

type UpdateState = "idle" | "checking" | "no-update" | "available" | "downloading" | "applying" | "error";

const isWindows = window.electronAPI.platform === "win32";
const isMac = window.electronAPI.platform === "darwin";

export default function Settings({ data, aiData }: Props) {
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

            <div className="form-group">
              <label className="rollover-toggle">
                <span className="rollover-toggle__text">
                  <span className="form-label" style={{ margin: 0 }}>{isMac ? "Show balance in menu bar" : "Show balance in tray tooltip"}</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 400 }}>
                    {isMac ? "Displays your total balance next to the tray icon" : "Displays your total balance when you hover the tray icon"}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={!!settings.showMenuBarBalance}
                  onChange={(e) => updateSettings({ showMenuBarBalance: e.target.checked })}
                  style={{ display: "none" }}
                />
                <span className={`rollover-toggle__switch ${settings.showMenuBarBalance ? "rollover-toggle__switch--on" : ""}`} />
              </label>
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

            <div className="setting-row">
              <div>
                <p className="setting-name">Investment Value Display</p>
                <p className="setting-desc">
                  Currency used to show your portfolio's estimated value
                </p>
              </div>
              <div style={{ minWidth: 220 }}>
                <Select
                  value={settings.investmentCurrency}
                  onChange={(v) => updateSettings({ investmentCurrency: v as 'IRT' | 'USDT' })}
                  options={[
                    { value: 'USDT', label: 'USDT (USD equivalent)' },
                    { value: 'IRT', label: 'Toman (IRT)' },
                  ]}
                />
              </div>
            </div>
          </div>
        </GlassCard>

        <AISettingsSection data={data} aiData={aiData} />

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

        <SecuritySettingsSection />

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
