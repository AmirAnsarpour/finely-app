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
  extraResources: [{ from: "src/renderer/assets/finely.png", to: "src/renderer/assets/finely.png" }],
  win: {
    target: [
      { target: "nsis", arch: ["x64"] },
    ],
    icon: "src/renderer/assets/finely.png",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
    ],
    icon: "src/renderer/assets/finely.png",
    category: "Office",
    synopsis: "Personal income & expense tracker",
  },
};
