# Security — Dependency Audit Exceptions

> Last reviewed: 2026-06-02

## Summary

CI runs `npm audit --audit-level=critical`.
All **critical** vulnerabilities must be fixed before merging.
The issues listed below are **moderate/high** but cannot be resolved without
breaking changes in core dependencies. Each entry documents why it is safe
to defer.

---

## Active Exceptions

### 1. `node-fetch <2.6.7` — HIGH
**Path:** `react-native-web-maps → react-google-maps → recompose → fbjs → isomorphic-fetch → node-fetch@1.7.3`

**Advisory:** GHSA-r683-j2x4-v87g — node-fetch forwards `Authorization` and
cookie headers on redirects to untrusted origins.

**Why deferred:**
- `node-fetch` is a Node.js HTTP client. It is **never bundled** into the iOS/Android or web app runtime — the React Native bundle uses the native `fetch` implementation.
- The vulnerable code path only activates when running Node.js server-side code. None of our server-side code uses `react-native-web-maps` or its transitive chain.
- All 3 versions of `react-native-web-maps` (0.1, 0.2, 0.3) carry this chain; there is no fix available without switching map libraries entirely.
- npm `overrides` cannot reach into `isomorphic-fetch`'s nested `node_modules` because `isomorphic-fetch@2.2.1` itself is in the vulnerable range and is pinned by `fbjs@0.8.18`.

**Resolution path:** Upgrade to a map library that doesn't use `react-google-maps` (e.g., `@react-native-maps/web` if/when available), or inline a patched copy of `isomorphic-fetch`.

---

### 2. `@babel/runtime <7.26.10` — MODERATE
**Path:** `@nozbe/watermelondb >=0.26.0 → @babel/runtime`

**Advisory:** GHSA-968p-4wvh-cqc8 — inefficient RegExp complexity in
transpiled named capturing groups (potential ReDoS).

**Why deferred:**
- The Babel runtime helpers do not process user-controlled regex inputs in this app.
- The available fix (`npm audit fix --force`) would downgrade WatermelonDB to
  `0.25.5`, losing offline-sync features the app depends on.
- The vulnerability requires the app to expose named capturing groups to
  adversarial input, which our data-access patterns do not do.

**Resolution path:** Watch for a WatermelonDB release that upgrades its `@babel/runtime` peer dep, or add a root-level `overrides` once npm correctly propagates it through workspace packages.

---

### 3. `postcss <8.5.10` — MODERATE
**Path:** `expo >=41 → @expo/metro-config → postcss`

**Advisory:** GHSA-qx2v-qp2m-jg93 — XSS via unescaped `</style>` in CSS output.

**Why deferred:**
- `postcss` is a **build-time** tool only. It processes CSS during Metro bundling on developer machines, not in the shipped app.
- An attacker would need code-execution on a developer's machine to exploit this — at which point the machine is already compromised.
- The fix requires upgrading Expo to v56, which is a major breaking change.

**Resolution path:** Upgrade to Expo 56 in the next scheduled major upgrade cycle.

---

### 4. `uuid <11.1.1` — MODERATE
**Path:** `expo → @expo/config-plugins → xcode → uuid@7.0.3`

**Advisory:** GHSA-w5hq-g745-h8pq — missing buffer bounds check in `v3/v5/v6` when `buf` is provided.

**Why deferred:**
- The `xcode` npm package uses `uuid` to generate identifiers in Xcode project files. This runs **at build time only** (during `expo prebuild`), never at runtime.
- The `buf` parameter (which triggers the vulnerability) is never passed by `xcode`; it always uses the default UUID generation path.
- The fix requires upgrading Expo to v56.

**Resolution path:** Same as postcss — address during Expo 56 upgrade.

---

## Already Fixed (2026-06-02)

| Package | Severity | Fixed version |
|---------|----------|---------------|
| `axios` | HIGH | `^1.9.x` |
| `express` | MODERATE | latest |
| `body-parser` | MODERATE | latest |
| `qs` | MODERATE | latest |
| `lodash` | HIGH | latest |
| `@xmldom/xmldom` | HIGH | latest |
| `node-forge` | HIGH | latest |
| `basic-ftp` | HIGH | latest |
| `undici` | HIGH | latest |
| `tar` | HIGH | latest |
| `picomatch` | HIGH | latest |
| `brace-expansion` | MODERATE | latest |
| `ip-address` + `express-rate-limit` | MODERATE | latest |
| `ws` | MODERATE | latest |
| `yaml` | MODERATE | latest |
| `uuid` (direct, both workspaces) | MODERATE | `^11.1.1` |
