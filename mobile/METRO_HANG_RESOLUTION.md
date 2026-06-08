# Metro Bundler Hang & Package Resolution in npm Workspaces (Monorepo)

This document records a critical issue faced during development with **Expo (SDK 54)** and **React Native (0.81.5)** inside an **npm workspaces monorepo** on macOS, and the exact steps taken to resolve it. 

Provide this file to future AI coding agents or developers to quickly configure the workspace if these issues reappear.

---

## 1. Symptoms

### Symptom A: Infinite Metro Hang
Running `npx expo start` or `npx expo start --clear` inside the `mobile/` directory freezes indefinitely at this line:
```text
Starting project at /Users/pranjalupadhyay/Desktop/projects/fishery_app/mobile
```
The terminal never proceeds, never prints the Expo Go QR code, and never starts the local HTTP server.

### Symptom B: Module Resolution Failure (File Exists but Cannot Be Found)
Once Metro successfully boots, scanning the QR code in Expo Go results in a red screen error claiming a package (such as `react-i18next` or `react`) specifies a main module field that does not exist, even though the file is physically present in the root `node_modules`:
```text
Metro has encountered an error: While trying to resolve module `react-i18next` from file `/Users/.../mobile/App.tsx`, the package `/Users/.../node_modules/react-i18next/package.json` was successfully found. However, this package itself specifies a `main` module field that could not be resolved (`/Users/.../node_modules/react-i18next/dist/commonjs/index.js`). Indeed, none of these files exist...
```

---

## 2. Root Causes

1. **Missing Watchman (Mac OS native file watcher):**
   Without `watchman` installed, Metro falls back to Node.js's native `fs.watch` module. This sequential, CPU-heavy file watcher freezes when crawling massive directory trees.
2. **Massive iOS/Android Build Directories:**
   The `mobile/ios` directory (often 600+ MB and 8,000+ files) was being scanned by Metro's default crawler. Node's file watcher became trapped in a loop analyzing static libraries and binary frameworks.
3. **Monorepo Hoisting & Metro Sandbox:**
   In an npm workspaces setup, dependencies are hoisted to the root `node_modules` (outside the `mobile/` project root). While Metro's resolver can *find* the `package.json` file using its search paths, Metro refuses to read or bundle any file located outside its designated `watchFolders`. Because `watchFolders` was empty, Metro was blind to the root `node_modules` and threw "file does not exist" errors.
4. **Over-broad `blockList` RegEx Patterns:**
   Using generic regex patterns like `/.*\/dist\/.*/` in `blockList` matches folders inside library dependencies (such as `node_modules/react-i18next/dist/`). Metro then ignores those folders, resulting in resolution errors for valid packages.

---

## 3. Resolution Steps

Follow these steps to clean and reset the workspace:

### Step 1: Install Watchman
Install the kernel-level file watching utility via Homebrew:
```bash
brew install watchman
```

### Step 2: Clean and Wipe All Caches
Kill any running Node processes and wipe transient files and node modules:
```bash
# Kill stuck processes
killall node expo

# Clean local caches and native folders
rm -rf mobile/.expo
rm -rf mobile/ios
rm -rf mobile/android
rm -rf mobile/dist

# Wipe node_modules and lockfiles
rm -rf node_modules package-lock.json
rm -rf mobile/node_modules

# Wipe system temp Metro caches
rm -rf /tmp/metro-*
rm -rf /tmp/haste-map-*
```

### Step 3: Configure Metro for the Monorepo
Configure `mobile/metro.config.js` to exclude heavy native folders, and explicitly whitelist the root `node_modules` inside `watchFolders`. 

Use absolute paths with an `escapeRegExp` helper to prevent blocking package `dist` folders:

```javascript
const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// 1. Tell Metro to watch the hoisted root node_modules directory
config.watchFolders = [
  path.resolve(workspaceRoot, 'node_modules'),
];

// 2. Resolve modules from both local and hoisted node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// 3. Block heavy native directories and workspace dirs using precise absolute paths
config.resolver.blockList = [
  // Local project directories to block
  new RegExp('^' + escapeRegExp(path.resolve(projectRoot, 'ios')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(projectRoot, 'android')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(projectRoot, 'dist')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(projectRoot, '.expo')) + '.*'),

  // Workspace-level directories to block
  new RegExp('^' + escapeRegExp(path.resolve(workspaceRoot, 'backend')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(workspaceRoot, '.git')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(workspaceRoot, '.code-review-graph')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(workspaceRoot, '.claude')) + '.*'),
  new RegExp('^' + escapeRegExp(path.resolve(workspaceRoot, '.kiro')) + '.*'),
];

module.exports = config;
```

### Step 4: Re-Install Dependencies & Run
Re-install dependencies at the root workspace. Use the `--legacy-peer-deps` flag to bypass peer dependency warnings caused by library version mismatches (e.g., React 19 vs React 18):
```bash
npm install --legacy-peer-deps
```

Start the Expo server clean:
```bash
cd mobile
npx expo start --clear
```
Metro will now boot in seconds, watch changes instantly, and resolve all hoisted packages successfully.

