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
  extraResources: [{ from: "finely.png", to: "finely.png" }],
  win: {
    target: [
      { target: "nsis",     arch: ["x64"] },
      { target: "msi",      arch: ["x64"] },
      { target: "portable", arch: ["x64"] },
    ],
    icon: "finely.png",
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
    deleteAppDataOnUninstall: false,
  },
  mac: {
    target: [
      { target: "dmg", arch: ["x64", "arm64"] },
      { target: "pkg", arch: ["x64", "arm64"] },
    ],
    icon: "finely.png",
    category: "public.app-category.finance",
  },
  linux: {
    target: [
      { target: "AppImage", arch: ["x64"] },
      { target: "deb",      arch: ["x64"] },
      { target: "rpm",      arch: ["x64"] },
      { target: "snap",     arch: ["x64"] },
      { target: "tar.gz",   arch: ["x64"] },
    ],
    icon: "finely.png",
    category: "Office",
    synopsis: "Personal income & expense tracker",
  },
};
