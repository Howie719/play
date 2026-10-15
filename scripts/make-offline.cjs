const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="style\.css(?:\?[^"]*)?">/, () => `<style>${fs.readFileSync(path.join(root, 'style.css'), 'utf8')}</style>`);
for (const file of ['engine.js', 'scene.js', 'game.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace(new RegExp(`<script src="${file.replace('.', '\\.')}(?:\\?[^"]*)?"></script>`), () => `<script>\n${source}\n</script>`);
}
fs.writeFileSync(path.join(root, 'threshold-offline.html'), html);
console.log('Offline version created: threshold-offline.html');
