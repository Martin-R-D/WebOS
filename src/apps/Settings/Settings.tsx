import { useState, useEffect } from "react";
import type { AppProps, ThemeName } from "../../types";
import { useSystemStore } from "../../stores/useSystemStore";
import { useFileSystemStore } from "../../stores/useFileSystemStore";
import { cx, factoryReset } from "../../lib/helpers";
import "./Settings.css";

const WALLPAPERS = [
  "linear-gradient(135deg, #6c5ce7 0%, #00cec9 100%)",
  "linear-gradient(135deg, #ff6a88 0%, #ff99ac 100%)",
  "linear-gradient(135deg, #0f2027, #203a43, #2c5364)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "radial-gradient(circle at 30% 20%, #1a1a2e, #16213e 60%, #0f3460)",
];

const ACCENT_COLORS = ["#6c5ce7", "#00cec9", "#ff6a88", "#feca57", "#1dd1a1"];

const THEMES: ThemeName[] = ["dark", "light", "midnight"];

const SECTIONS = ["Personalization", "Account", "System", "About"] as const;
type Section = (typeof SECTIONS)[number];

export function Settings({}: AppProps) {
  const theme = useSystemStore((s) => s.theme);
  const wallpaper = useSystemStore((s) => s.wallpaper);
  const username = useSystemStore((s) => s.username);
  const accentColor = useSystemStore((s) => s.accentColor);
  const soundEnabled = useSystemStore((s) => s.soundEnabled);
  const setTheme = useSystemStore((s) => s.setTheme);
  const setWallpaper = useSystemStore((s) => s.setWallpaper);
  const setUsername = useSystemStore((s) => s.setUsername);
  const setAccentColor = useSystemStore((s) => s.setAccentColor);
  const toggleSound = useSystemStore((s) => s.toggleSound);
  const resetSettings = useSystemStore((s) => s.resetSettings);

  const [activeSection, setActiveSection] = useState<Section>("Personalization");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty("--color-accent", accentColor);
  }, [accentColor]);

  function handleResetSettings() {
    if (window.confirm("Reset all settings to defaults?")) {
      resetSettings();
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.style.setProperty("--color-accent", "#6c5ce7");
    }
  }

  function handleResetFs() {
    if (window.confirm("Reset the file system? All files will be deleted.")) {
      useFileSystemStore.getState().resetFileSystem();
      location.reload();
    }
  }

  function handleFactoryReset() {
    if (window.confirm("Factory reset WebOS? All settings, files, and profile data will be erased.")) {
      factoryReset();
    }
  }

  return (
    <div className="settings">
      <nav className="settings__nav">
        {SECTIONS.map((s) => (
          <button
            key={s}
            className={activeSection === s ? "active" : ""}
            onClick={() => setActiveSection(s)}
          >
            {s}
          </button>
        ))}
      </nav>

      <div className="settings__content">
        {activeSection === "Personalization" && (
          <>
            <div className="settings__section-title">Personalization</div>

            <div className="settings__row">
              <div className="settings__label">Wallpaper</div>
              <div className="settings__wallpapers">
                {WALLPAPERS.map((w) => (
                  <div
                    key={w}
                    className={cx("settings__wallpaper", wallpaper === w && "active")}
                    style={{ background: w }}
                    onClick={() => setWallpaper(w)}
                  />
                ))}
              </div>
            </div>

            <div className="settings__row">
              <div className="settings__label">Theme</div>
              <div className="settings__themes">
                {THEMES.map((t) => (
                  <button
                    key={t}
                    className={cx("settings__theme-btn", theme === t && "active")}
                    onClick={() => setTheme(t)}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="settings__row">
              <div className="settings__label">Accent Color</div>
              <div className="settings__swatches">
                {ACCENT_COLORS.map((c) => (
                  <div
                    key={c}
                    className={cx("settings__swatch", accentColor === c && "active")}
                    style={{ background: c }}
                    onClick={() => setAccentColor(c)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {activeSection === "Account" && (
          <>
            <div className="settings__section-title">Account</div>
            <div className="settings__row">
              <div className="settings__avatar-preview">
                {username.charAt(0).toUpperCase()}
              </div>
              <div className="settings__label">Username</div>
              <input
                className="settings__input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </>
        )}

        {activeSection === "System" && (
          <>
            <div className="settings__section-title">System</div>

            <div className="settings__row">
              <label className="settings__switch">
                <div
                  className={cx("settings__toggle", soundEnabled && "on")}
                  onClick={toggleSound}
                />
                Sound {soundEnabled ? "On" : "Off"}
              </label>
            </div>

            <div className="settings__row">
              <div className="settings__label">Danger Zone</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button className="settings__danger" onClick={handleResetSettings}>
                  Reset Settings
                </button>
                <button className="settings__danger" onClick={handleResetFs}>
                  Reset File System
                </button>
                <button className="settings__danger" onClick={handleFactoryReset}>
                  Factory Reset
                </button>
              </div>
            </div>
          </>
        )}

        {activeSection === "About" && (
          <>
            <div className="settings__section-title">About</div>
            <div className="settings__row">
              <p style={{ marginBottom: 8 }}><strong>WebOS</strong> v1.0.0</p>
              <p style={{ marginBottom: 8 }}>Built with React + TypeScript</p>
              <p style={{ marginBottom: 8 }}>&copy; {new Date().getFullYear()} Your Name</p>
              <p>
                <a
                  href="https://github.com/yourname"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--color-accent)" }}
                >
                  GitHub
                </a>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
