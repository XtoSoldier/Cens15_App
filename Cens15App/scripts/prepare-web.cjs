const fs = require('node:fs');
const path = require('node:path');

function prepareWeb(directory = path.resolve(__dirname, '../dist')) {
  const staticDirectory = path.join(directory, 'assets/static');
  const bundleDirectory = path.join(directory, '_expo/static/js/web');
  if (!fs.existsSync(path.join(directory, 'index.html'))) throw new Error('Falta index.html en la exportacion web.');
  const fonts = fs.readdirSync(staticDirectory).filter(name => /^MaterialDesignIcons\.[a-f0-9]+\.ttf$/i.test(name));
  if (!fonts.length) throw new Error('La exportacion no contiene la fuente MaterialDesignIcons en assets/static.');
  const bundles = fs.readdirSync(bundleDirectory).filter(name => name.endsWith('.js'))
    .map(name => fs.readFileSync(path.join(bundleDirectory, name), 'utf8'));
  for (const name of fonts) {
    const font = fs.readFileSync(path.join(staticDirectory, name));
    if (font.length < 4 || font.readUInt32BE(0) !== 0x00010000) throw new Error('La fuente exportada no es un archivo TrueType valido.');
    if (!bundles.some(bundle => bundle.includes(`/assets/static/${name}`))) throw new Error('El bundle no referencia la fuente exportada.');
  }
  if (bundles.some(bundle => bundle.includes('assets/node_modules/.pnpm/'))) throw new Error('Hay URLs de assets que todavia contienen rutas internas de pnpm.');
  const htmlPath = path.join(directory, 'index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');
  if (!html.includes('</head>')) throw new Error('Falta el encabezado HTML de la exportacion web.');
  // iPhone uses home-screen web apps instead of the arbitrary-element Fullscreen API.
  for (const name of ['mobile-web-app-capable', 'apple-mobile-web-app-capable']) {
    if (!html.includes(`name="${name}"`)) html = html.replace('</head>', `<meta name="${name}" content="yes"/></head>`);
  }
  fs.writeFileSync(htmlPath, html);
  fs.copyFileSync(path.resolve(__dirname, '../../web.config'), path.join(directory, 'web.config'));
  return fonts;
}

if (require.main === module) {
  const fonts = prepareWeb(process.argv[2]);
  console.log(`Exportacion IIS preparada: web.config y ${fonts.length} fuente(s) MaterialDesignIcons verificadas.`);
}

module.exports = { prepareWeb };
