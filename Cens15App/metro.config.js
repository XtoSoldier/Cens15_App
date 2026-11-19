const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Aseguramos que las extensiones de fuentes se traten como assets empaquetables
config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'ttf', 'woff', 'woff2'])];
config.transformer.assetPlugins = [
  ...config.transformer.assetPlugins,
  require.resolve('./scripts/export-asset-paths.cjs'),
];

module.exports = config;
