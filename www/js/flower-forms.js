/* Species × quality model recipes. Template pigment, pattern and wear stay on the item.
 * modelId is stable so a future Blender GLB can replace any recipe independently.
 */
(function () {
  'use strict';
  const grades = ['common', 'fine', 'rare', 'epic', 'legendary'];
  const forms = {};
  function species(id, labels, variants) {
    forms[id] = {};
    grades.forEach(function (grade, rank) {
      forms[id][grade] = Object.freeze(Object.assign({
        modelId: id + '-' + grade + '-v1', label: labels[rank], grade: grade,
        height: [1, 1.04, 0.98, 1.08, 1.03][rank],
        bend: [1.25, 0.65, 1.1, 0.5, 0.85][rank],
        leafLift: [0, 0.12, -0.09, 0.2, 0.08][rank],
        width: [1, 0.93, 1.13, 1.04, 1.18][rank],
        cup: [1, 1.35, 0.8, 1.15, 1.5][rank],
        curl: [1, 0.7, 1.3, 1.7, 2.1][rank],
        ruffle: [0.012, 0.018, 0.04, 0.065, 0.09][rank],
        opening: [0, -0.08, 0.09, -0.03, 0.13][rank]
      }, variants[rank]));
    });
    Object.freeze(forms[id]);
  }
  species('daisy', ['单轮平瓣', '细瓣小杯', '双轮舒展', '卷瓣重轮', '绒球叠瓣'], [
    { rings: 1, petals: 14 }, { rings: 1, petals: 20 }, { rings: 2, petals: 18 },
    { rings: 2, petals: 24 }, { rings: 3, petals: 26 }
  ]);
  species('sunflower', ['单轮长瓣', '细瓣双轮', '宽瓣复轮', '卷瓣菊型', '密瓣环冠'], [
    { rings: 1, petals: 24 }, { rings: 2, petals: 28 }, { rings: 2, petals: 32 },
    { rings: 3, petals: 30 }, { rings: 4, petals: 34 }
  ]);
  species('rose', ['疏瓣杯形', '螺旋高心', '舒展莲座', '卷边重瓣', '密瓣花心'], [
    { layers: 2, core: 2 }, { layers: 3, core: 3 }, { layers: 4, core: 3 },
    { layers: 4, core: 5 }, { layers: 5, core: 6 }
  ]);
  species('tulip', ['经典杯形', '尖瓣百合型', '流苏杯形', '重瓣碗形', '鹦鹉卷瓣'], [
    { rings: 2, kind: 'round', tilt: 0.32 }, { rings: 2, kind: 'pointed', tilt: 0.5 },
    { rings: 2, kind: 'ruffled', tilt: 0.38 }, { rings: 4, kind: 'wide', tilt: 0.65 },
    { rings: 3, kind: 'ruffled', tilt: 0.78 }
  ]);
  species('hydrangea', ['疏簇球形', '紧簇圆球', '舒展扁球', '双瓣花簇', '重瓣密球'], [
    { florets: 24, roundness: 0.82, double: false }, { florets: 34, roundness: 1, double: false },
    { florets: 30, roundness: 0.58, double: false }, { florets: 36, roundness: 0.8, double: true },
    { florets: 44, roundness: 0.94, double: true }
  ]);
  species('hyacinth', ['疏花长穗', '紧簇锥穗', '舒展宽穗', '卷口密穗', '复瓣花塔'], [
    { florets: 18, spread: 1, double: false }, { florets: 26, spread: 0.82, double: false },
    { florets: 24, spread: 1.35, double: false }, { florets: 32, spread: 1.12, double: false },
    { florets: 36, spread: 1.2, double: true }
  ]);
  species('lily', ['疏铃弯枝', '小铃直穗', '宽口垂铃', '卷口串铃', '密铃花穗'], [
    { bells: 6, bellSize: 1, spread: 1 }, { bells: 8, bellSize: 0.87, spread: 0.8 },
    { bells: 7, bellSize: 1.18, spread: 1.3 }, { bells: 10, bellSize: 1, spread: 1.1 },
    { bells: 12, bellSize: 1.08, spread: 1.25 }
  ]);
  species('cosmos', ['八瓣平展', '窄瓣浅杯', '双轮蝶瓣', '卷边复瓣', '重瓣花冠'], [
    { rings: 1, petals: 8 }, { rings: 1, petals: 8 }, { rings: 2, petals: 8 },
    { rings: 2, petals: 10 }, { rings: 3, petals: 10 }
  ]);
  species('carnation', ['疏瓣细齿', '浅杯褶瓣', '宽瓣波边', '密褶重瓣', '绒球流苏'], [
    { layers: 3 }, { layers: 4 }, { layers: 5 }, { layers: 6 }, { layers: 7 }
  ]);
  species('peony', ['单瓣露蕊', '半重瓣浅碗', '重瓣莲座', '卷瓣楼台', '千层花冠'], [
    { layers: 2 }, { layers: 3 }, { layers: 4 }, { layers: 5 }, { layers: 6 }
  ]);
  species('iris', ['窄旗垂瓣', '高旗浅垂', '宽旗舒展', '波边旗瓣', '卷边花冠'], [
    { standard: 0.36, fall: 2.1 }, { standard: 0.22, fall: 1.85 }, { standard: 0.55, fall: 1.95 },
    { standard: 0.4, fall: 2.25 }, { standard: 0.66, fall: 1.75 }
  ]);
  species('orchid', ['双花垂枝', '三花小蝶', '宽瓣蝶翼', '卷唇花序', '五花展翅'], [
    { blooms: 2, lip: 1 }, { blooms: 3, lip: 0.85 }, { blooms: 3, lip: 1.25 },
    { blooms: 4, lip: 1.5 }, { blooms: 5, lip: 1.35 }
  ]);
  species('jasmine', ['疏枝星瓣', '风车旋瓣', '双轮小簇', '卷瓣重轮', '密簇重瓣'], [
    { blooms: 3, rings: 1, petals: 5 }, { blooms: 4, rings: 1, petals: 7 },
    { blooms: 3, rings: 2, petals: 6 }, { blooms: 4, rings: 2, petals: 7 }, { blooms: 5, rings: 3, petals: 7 }
  ]);
  species('true-lily', ['六瓣平展', '长筒喇叭', '反卷垂花', '宽瓣星形', '复轮重瓣'], [
    { rings: 1, reach: .65, lift: .12, curl: -.12 }, { rings: 1, reach: .56, lift: .52, curl: -.14 },
    { rings: 1, reach: .61, lift: .35, curl: -.56 }, { rings: 1, reach: .73, lift: .2, curl: -.22 },
    { rings: 2, reach: .63, lift: .25, curl: -.16 }
  ]);
  species('gardenia', ['单轮风车', '半重瓣', '宽瓣旋心', '卷边重瓣', '密心叠瓣'], [
    { rings: 1, petals: 6 }, { rings: 2, petals: 7 }, { rings: 3, petals: 7 },
    { rings: 4, petals: 8 }, { rings: 5, petals: 8 }
  ]);
  species('camellia', ['单瓣金蕊', '半重瓣浅杯', '莲座重瓣', '抱心重瓣', '规整叠瓣'], [
    { rings: 1, petals: 7 }, { rings: 2, petals: 8 }, { rings: 4, petals: 9 },
    { rings: 5, petals: 9 }, { rings: 6, petals: 10 }
  ]);
  species('gypsophila', ['轻疏三枝', '细密五枝', '宽幅云簇', '双瓣云簇', '满枝重瓣'], [
    { sprays: 3, florets: 3, rings: 1 }, { sprays: 5, florets: 3, rings: 1 },
    { sprays: 5, florets: 4, rings: 1 }, { sprays: 5, florets: 4, rings: 2 }, { sprays: 6, florets: 4, rings: 2 }
  ]);
  window.FlowerForms = Object.freeze({
    canPreview: function () { return window.__ACCOUNT__?.isAdmin === true; },
    get: function (flowerId, grade) {
      const family = forms[flowerId] || forms.daisy;
      return family[grade] || family.common;
    }
  });
})();
