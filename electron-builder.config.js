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
};
