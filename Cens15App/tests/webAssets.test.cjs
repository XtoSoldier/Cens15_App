const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const exportAssetPaths = require('../scripts/export-asset-paths.cjs');
const { prepareWeb } = require('../scripts/prepare-web.cjs');

test('export assets use clean public paths without changing hashes, filenames or source files', () => {
  const asset = { httpServerLocation: '/assets?export_path=assets/node_modules/.pnpm/package+version/fonts',
    name: 'MaterialDesignIcons', type: 'ttf', hash: 'abc123', files: ['original.ttf'], scales: [1] };
  const exported = exportAssetPaths(asset);
  assert.equal(exported.httpServerLocation, '/assets/static');
  assert.equal(exported.name, asset.name);
  assert.equal(exported.hash, asset.hash);
  assert.equal(exported.files, asset.files);
  assert.equal(exported.scales, asset.scales);
  assert.match(asset.httpServerLocation, /\.pnpm/);
});

test('development asset requests are not rewritten', () => {
  for (const httpServerLocation of ['/assets/fonts', '/assets/node_modules/.pnpm/package+version/fonts']) {
    const asset = { httpServerLocation };
    assert.equal(exportAssetPaths(asset), asset);
  }
});

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(__dirname, '.web-assets-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'assets/static'), { recursive: true });
  fs.mkdirSync(path.join(directory, '_expo/static/js/web'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), '<html><head></head><body></body></html>');
  fs.writeFileSync(path.join(directory, 'assets/static/MaterialDesignIcons.abc123.ttf'), Buffer.from([0, 1, 0, 0, 1, 2, 3, 4]));
  fs.writeFileSync(path.join(directory, '_expo/static/js/web/index.js'), 'module.exports="/assets/static/MaterialDesignIcons.abc123.ttf";');
  return directory;
}

test('prepared export verifies the font reference and automatically includes the IIS config', t => {
  const directory = fixture(t);
  assert.deepEqual(prepareWeb(directory), ['MaterialDesignIcons.abc123.ttf']);
  const config = fs.readFileSync(path.join(directory, 'web.config'), 'utf8');
  assert.match(config, /fileExtension="\.ttf" mimeType="font\/ttf"/);
  assert.ok(config.indexOf('Static assets do not use SPA fallback') < config.indexOf('Expo Web SPA Routes'));
  assert.doesNotMatch(config, /allowDoubleEscaping\s*=\s*"true"/);
});

test('HTML instead of a TrueType font blocks deployment preparation', t => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, 'assets/static/MaterialDesignIcons.abc123.ttf'), '<html>Not found</html>');
  assert.throws(() => prepareWeb(directory), /TrueType/);
});

test('home-screen standalone metadata is included once for mobile browsers', t => {
  const directory = fixture(t);
  prepareWeb(directory);
  prepareWeb(directory);
  const html = fs.readFileSync(path.join(directory, 'index.html'), 'utf8');
  for (const name of ['mobile-web-app-capable', 'apple-mobile-web-app-capable']) {
    assert.equal(html.split(`name="${name}" content="yes"`).length - 1, 1);
  }
});

test('an export with a missing font or a mismatched bundle cannot silently succeed', t => {
  const directory = fixture(t);
  fs.writeFileSync(path.join(directory, '_expo/static/js/web/index.js'), 'module.exports="/old-font.ttf";');
  assert.throws(() => prepareWeb(directory), /no referencia/);
  fs.unlinkSync(path.join(directory, 'assets/static/MaterialDesignIcons.abc123.ttf'));
  assert.throws(() => prepareWeb(directory), /no contiene la fuente/);
});

test('remaining pnpm export URLs are rejected before copying config', t => {
  const directory = fixture(t);
  fs.appendFileSync(path.join(directory, '_expo/static/js/web/index.js'), 'const old="/assets/node_modules/.pnpm/package+version/image.png";');
  assert.throws(() => prepareWeb(directory), /rutas internas/);
});

test('production and intranet web build commands prepare the output for IIS', () => {
  const { scripts } = require('../package.json');
  for (const name of ['build:web:prod', 'build:web:intranet']) {
    assert.match(scripts[name], /expo export --platform web --clear && node scripts\/prepare-web\.cjs$/);
  }
});
