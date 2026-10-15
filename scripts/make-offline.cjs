const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('<link rel="stylesheet" href="style.css">', () => `<style>${fs.readFileSync(path.join(root, 'style.css'), 'utf8')}</style>`);
for (const file of ['engine.js', 'scene.js', 'game.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/<\/script/gi, '<\\/script');
  html = html.replace(`<script src="${file}"></script>`, () => `<script>\n${source}\n</script>`);
}
// There is no self-download link in the already downloaded copy.
html = html.replace(/<a class="notes-download"[\s\S]*?<\/a>/, '<p class="notes-status">你正在使用离线版本。源码与项目记录随完整压缩包提供。</p>');
fs.writeFileSync(path.join(root, 'threshold-offline.html'), html);
console.log('Offline version created: threshold-offline.html');
