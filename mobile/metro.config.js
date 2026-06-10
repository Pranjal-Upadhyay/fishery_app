// Standalone Expo project (no workspaces, no hoisting).
// Earlier this file was configured for an npm-workspaces monorepo and pointed
// watchFolders + nodeModulesPaths at a parent `node_modules` directory that
// no longer exists since the workspace split — Metro's file watcher hung
// indefinitely trying to resolve that missing path, which presented as
// `expo start` freezing at "Starting project at...".
//
// Keeping this minimal: Metro watches the project root, resolves from the
// local node_modules, and excludes a few heavy build-output directories
// from bundling. Don't add watchFolders that escape this directory.

const { getDefaultConfig } = require('@expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const config = getDefaultConfig(projectRoot);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

config.resolver.blockList = [
  new RegExp('^' + escape(path.resolve(projectRoot, 'ios')) + '.*'),
  new RegExp('^' + escape(path.resolve(projectRoot, 'android')) + '.*'),
  new RegExp('^' + escape(path.resolve(projectRoot, 'dist')) + '.*'),
  new RegExp('^' + escape(path.resolve(projectRoot, '.expo')) + '.*'),
];

module.exports = config;
