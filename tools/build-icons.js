// Builds icons.js from the free Lucide icon set (ISC license).
// Usage:  npm i lucide-static   then   node tools/build-icons.js path/to/node_modules/lucide-static/icons
// To add an icon: put its name in the list below and run this again,
// or open icons.js and paste the inner <path> parts of any SVG from lucide.dev.
const fs = require('fs'), path = require('path');
const dir = process.argv[2];
const names = `house shopping-cart zap smartphone train-front car shield coffee utensils party-popper shopping-bag repeat
heart-pulse gift paw-print plane umbrella key-round trending-up piggy-bank briefcase sparkles landmark wallet layout-dashboard
receipt target scale calculator sunset graduation-cap trophy bell database plus trash-2 check x upload download flame star
award calendar search credit-card building-2 pencil image info triangle-alert circle-check lightbulb coins hand-coins scissors
message-square list-checks book-open baby dog shirt dumbbell music gamepad-2 film beer pizza fuel bus bike stethoscope pill
laptop tv wifi droplet tree-palm mountain tent ship gem crown rocket medal leaf sun moon menu chevron-right chevron-left
arrow-up-right arrow-down-left percent clock lock heart smile school hammer sofa cake flower-2 camera map-pin globe banknote
badge-check refresh-cw copy circle-help baggage-claim sailboat car-front tram-front cat glasses book apple sandwich route flag footprints map shield-check party-popper`.split(/\s+/).filter(Boolean);
const out = {}; const missing = [];
for (const n of names) {
  const f = path.join(dir, n + '.svg');
  if (!fs.existsSync(f)) { missing.push(n); continue; }
  const svg = fs.readFileSync(f, 'utf8');
  out[n] = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '').replace(/\s*\n\s*/g, '');
}
let js = '/* Icons from Lucide (lucide.dev, ISC license). Each entry is the inside of a 24x24 SVG. */\nwindow.ICONS = {\n';
js += Object.entries(out).map(([k, v]) => '  "' + k + '": \'' + v.replace(/'/g, "\\'") + "'").join(',\n') + '\n};\n';
fs.writeFileSync(path.join(__dirname, '..', 'icons.js'), js);
console.log('icons:', Object.keys(out).length, 'missing:', missing.join(' ') || 'none');
