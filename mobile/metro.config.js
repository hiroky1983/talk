const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.watchFolders = Array.from(
  new Set([...(config.watchFolders ?? []), path.resolve(__dirname, '..')])
);

module.exports = config;
