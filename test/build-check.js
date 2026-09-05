// Extracts the app's inline <script> into check.js so harness.js can run it in a vm.
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(path.resolve(__dirname, '..', 'shift-signal.html'), 'utf8');
const js = html.split('<script>')[1].split('</script>')[0];
fs.writeFileSync(path.resolve(__dirname, 'check.js'), js);
console.log(`extracted ${js.split('\n').length} lines to test/check.js`);
