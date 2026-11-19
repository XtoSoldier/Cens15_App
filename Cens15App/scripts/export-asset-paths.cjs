module.exports = function exportAssetPaths(asset) {
  if (!asset.httpServerLocation.includes('?export_path=')) return asset;
  // Expo appends a content hash to exported web filenames. Keep package-manager
  // directories and '+' characters out of public URLs without changing dev URLs.
  return { ...asset, httpServerLocation: '/assets/static' };
};
