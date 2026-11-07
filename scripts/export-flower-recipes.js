// Keep the Blender build tied to the same species and quality definitions as the app.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({ window: {} });
for (const file of ['data.js', 'flower-forms.js']) vm.runInContext(fs.readFileSync(path.join(root, 'www/js', file), 'utf8'), context);
const grades = ['common', 'fine', 'rare', 'epic', 'legendary'];
const flowers = context.window.GameData.flowers.map(flower => ({ ...flower, forms: grades.map(grade => context.window.FlowerForms.get(flower.id, grade)) }));
fs.mkdirSync(path.join(root, 'art/blender'), { recursive: true });
fs.writeFileSync(path.join(root, 'art/blender/recipes.json'), JSON.stringify(flowers, null, 2) + '\n');
console.log('Exported recipes for ' + flowers.length * grades.length + ' Blender models');
