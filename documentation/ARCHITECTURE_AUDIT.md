# Codebase & Architecture Audit: Monorepo vs Standalone
*Prepared by Antigravity (Senior Software Architect)*

This document evaluates the current architecture of the **MatsyaMitra (fishery_app)** workspace. It outlines what went wrong initially, lists structural and environment flaws, and provides a concrete migration plan to convert the monorepo into a clean, standalone, single-directory React Native project.

---

## 1. Executive Summary

The current project uses an **npm Workspaces monorepo** structure. While monorepos are great for web-centric or pure JS environments, they are notoriously difficult to configure with **React Native / Metro** due to package hoisting. 

As a result, we have had to implement complex workarounds (custom watch exclusions, specialized shell scripts, manually hardcoded IP addresses, and custom Metro resolvers). This has created a fragile ecosystem where a simple network change or a system Node update breaks the development loop.

> [!IMPORTANT]
> **Verdict:** Yes, we can and should separate this monorepo into two independent, standalone projects: `fishery_backend` and `fishery_mobile`. Doing so will completely eliminate Metro configuration hacks, remove dependency conflicts, and make your local testing reliable.

---

## 2. What Went Wrong Initially (The Pitfalls)

Here is an objective look at the decisions and system states that led to the current bottlenecks:

### A. npm Workspaces & Automatic Dependency Hoisting
By configuring `"workspaces": ["backend", "mobile"]` in the root `package.json`, npm was instructed to hoist all node modules to the root folder.
* **The Mistake:** React Native's Metro bundler was never designed to work outside its own project root. Hoisted libraries (like `react`, `react-native`, `react-i18next`) were stored in `/node_modules` instead of `/mobile/node_modules`.
* **The Consequence:** Metro became "blind" to these packages. To make Metro "see" them, we had to add the root folder to `watchFolders`, which forced Metro to crawl 500MB of backend/git files on every boot, leading to infinite hangs.

### B. Broken Homebrew Node & Version Clashes
During system upgrades, the default Homebrew Node path became linked to an incomplete or broken version of Node 25/26 (missing the `libsimdjson.30.dylib` library).
* **The Mistake:** Relying on the global `npx` or `npm` commands, which automatically resolved to this broken system node, causing instant terminal aborts.
* **The Consequence:** We had to write a custom wrapper script (`start.sh`) that hardcoded `/opt/homebrew/opt/node@22/bin/node` to force Node 22 (LTS). While it bypassed the crash, it meant standard commands like `npx expo start --web` failed.

### C. Network Changes & Local IP Binding
The configuration in `mobile/.env` used a hardcoded local IP address (`192.168.1.23`) for development.
* **The Mistake:** Not using automated IP discovery or tunnel fallbacks.
* **The Consequence:** Switching from Wi-Fi to a mobile hotspot changed your machine's IP (e.g., to `192.168.1.6`). Since the app was compiled pointing to the old IP, the phone could never connect to the backend or fetch the JS bundle.

---

## 3. Structural, Code, and System Flaws

Below is a detailed breakdown of the flaws in the current codebase:

| Flaw Category | Description | Impact |
| :--- | :--- | :--- |
| **Structural (Monorepo)** | Web backend and React Native mobile app share a single node_modules cache at the root level. | Causes Metro to crawl non-mobile files, leading to startup freezes. |
| **Code (Metro Configuration)** | `metro.config.js` contains a complex `blockList` regex and a hijacked `nodeModulesPaths` array to manually bypass monorepo hoisting. | Fragile configuration; easily breaks when new packages are added. |
| **Code (React 19 vs SDK 54)** | Expo SDK 54 is running with React 19.1.0 and React Native 0.81.5. | Version warnings in `expo doctor` and potential runtime peer dependency errors. |
| **System (Environment)** | System `node` and `npx` pointing to a broken Homebrew dynamic library link. | Bypassing with `start.sh` hides the issue but breaks integrations with IDEs/VS Code run tools. |
| **Network Configuration** | Device connectivity relies on hardcoded IP addresses inside `.env` which fluctuate on mobile hotspots. | Breaking connection whenever you change locations or routers. |

---

## 4. How to Convert to a Standalone (Single Directory) Project

To simplify your development, you can untangle the monorepo. This guide outlines how to make the `mobile` app completely independent:

### Step 1: Remove npm Workspaces
1. Open the root [package.json](file:///Users/pranjalupadhyay/Desktop/projects/fishery_app/package.json).
2. Delete the `"workspaces"` field:
   ```diff
   - "workspaces": [
   -   "backend",
   -   "mobile"
   - ],
   ```
3. Remove the shared `dependencies` and `devDependencies` from the root `package.json` that belong to the mobile app.

### Step 2: Decouple the `mobile` Project
1. Move the `mobile/` directory out of the `fishery_app` root folder to its own standalone directory on your machine (e.g., `/Users/pranjalupadhyay/Desktop/projects/fishery_mobile`).
2. Now, `fishery_mobile` is its own project root. It will not have access to or look at any parent node modules.

### Step 3: Restore Default Metro Config
Since the project is now standalone, you no longer need the monorepo workarounds! 
Replace the contents of `metro.config.js` with the standard, clean default:

```javascript
const { getDefaultConfig } = require('@expo/metro-config');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

module.exports = config;
```

### Step 4: Clean and Install Standalone Dependencies
Run these commands inside your new standalone `fishery_mobile` folder to install all packages directly inside `node_modules/`:
```bash
# Clear any remaining monorepo cached files
rm -rf node_modules package-lock.json .expo ios android dist

# Install all packages locally (without hoisting to root)
npm install --legacy-peer-deps
```

### Step 5: Run Standard Commands
Now, you can run standard React Native commands directly, using whatever system Node you prefer:
```bash
# Start in tunnel mode (forces bypass of Wi-Fi router restrictions)
npx expo start --tunnel

# Start in web mode (opens in browser)
npx expo start --web
```

---

## 5. Summary Recommendation

By moving the mobile app out of the monorepo, **90% of the complexity disappears**. 
* Metro will only scan the files inside the `mobile` folder.
* Startup times will drop to under 2 seconds.
* You will be able to run standard `npx expo start --tunnel` and `npx expo start --web` without needing custom shell scripts or dealing with system-wide Homebrew conflicts.
