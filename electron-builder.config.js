/** @type {import('electron-builder').Configuration} */
module.exports = {
  appId: "com.finely.app",
  publish: {
    provider: "github",
    owner: "AmirAnsarpour",
    repo: "finely-app",
  },
  productName: "Finely",
  copyright: "Copyright © 2026 Finely",
  directories: {
    buildResources: "build",
    output: "release",
  },
  files: ["out/**/*", "!out/**/*.map"],
  extraResources: [
    {
      from: "src/renderer/assets/finely.png",
      to: "finely.png",
    },
    {
      from: "src/renderer/assets/trayIcon.png",
      to: "trayIcon.png",
    },
    {
      from: "src/renderer/assets/trayIcon@2x.png",
      to: "trayIcon@2x.png",
    },
  ],

  win: {
    // Portable is the primary Windows artifact — it's what the in-app
    // updater fetches (see checkForUpdate in src/main/updater.ts), and it
    // requires no installation step. NSIS remains available as a secondary
    // option for users who prefer a traditional installer with Start Menu
    // integration.
    target: [
      { target: "portable", arch: ["x64"] },
      { target: "nsis",     arch: ["x64"] },
    ],
    icon: "src/renderer/assets/finely.png",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
    artifactName: "Finely-${version}-setup.exe",
  },
  portable: {
    artifactName: "Finely-${version}-portable.exe",
  },

  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb",      arch: ["x64"] },
      { target: "rpm",      arch: ["x64"] },
    ],
    icon: "src/renderer/assets/finely.png",
    category: "Office",
    synopsis: "Personal income & expense tracker",
  },

  mac: {
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
      { target: "zip", arch: ["x64", "arm64"] },
    ],
    // 1024x1024 source so electron-builder can generate a proper .icns —
    // upscaled from the 280x280 app logo as a placeholder; swap for a
    // native high-res design when one exists.
    icon: "src/renderer/assets/macIcon.png",
    category: "public.app-category.finance",
    // Required for notarization. Without a Developer ID certificate
    // (see below), the build is still produced — just unsigned, which
    // macOS Gatekeeper will flag on first launch, same as the unsigned
    // Windows build today (see README FAQ).
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: "build/entitlements.mac.plist",
    entitlementsInherit: "build/entitlements.mac.plist",
  },
  dmg: {
    artifactName: "Finely-${version}-${arch}.dmg",
  },
  // Signing (all platforms) and notarization (macOS) activate automatically
  // when electron-builder finds the right environment variables — nothing
  // in this file needs to change once a certificate is available:
  //   Windows:  CSC_LINK, CSC_KEY_PASSWORD
  //   macOS:    CSC_LINK, CSC_KEY_PASSWORD (Developer ID Application cert)
  //             + APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID (notarization)
  // See .github/workflows/release.yml for where these are read from secrets.
};
