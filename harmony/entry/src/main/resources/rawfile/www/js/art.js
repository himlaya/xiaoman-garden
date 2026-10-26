/* 小满花园 · 手绘感 SVG 花朵 */
(function () {
  'use strict';

  const DATA = window.GameData;
  let uid = 0;

  function hashClass(value) {
    return String(value || '').replace(/[^a-z0-9_-]/gi, '');
  }

  function petalGradient(key, from, to, angle) {
    const x2 = angle === 'v' ? 0 : 1;
    const y2 = angle === 'v' ? 1 : 1;
    return '<linearGradient id="' + key + '-petal" x1="0" y1="0" x2="' + x2 + '" y2="' + y2 + '">' +
      '<stop offset="0" stop-color="' + from + '"></stop>' +
      '<stop offset="1" stop-color="' + to + '"></stop>' +
    '</linearGradient>';
  }

  function soilMound() {
    return '<g class="flower-ground">' +
      '<ellipse cx="70" cy="143" rx="35" ry="8" fill="#453427" opacity=".12"></ellipse>' +
      '<path d="M38 138 C47 125 93 125 102 138 C86 149 54 149 38 138Z" fill="#8c654d"></path>' +
      '<path d="M48 134 C60 128 82 128 92 135" stroke="#ad7c5a" stroke-width="1.5" stroke-linecap="round" opacity=".7"></path>' +
      '<circle cx="58" cy="137" r="1.2" fill="#5c4432" opacity=".45"></circle>' +
      '<circle cx="82" cy="139" r="1" fill="#5c4432" opacity=".4"></circle>' +
    '</g>';
  }

  function sparkles(color, accent) {
    return '<g class="flower-motes" fill="' + color + '">' +
      '<circle cx="108" cy="62" r="1.8" opacity=".65"></circle>' +
      '<circle cx="30" cy="83" r="1.4" opacity=".5"></circle>' +
      '<path d="M102 34 l1.6 4.2 4.3 1.6 -4.3 1.6 -1.6 4.3 -1.6 -4.3 -4.3 -1.6 4.3 -1.6Z" fill="' + accent + '" opacity=".55"></path>' +
      '<path d="M35 50 l1.1 3 3 1.1 -3 1.1 -1.1 3 -1.1 -3 -3 -1.1 3 -1.1Z" opacity=".38"></path>' +
    '</g>';
  }

  function baseFoliage(f, topY) {
    const c = f.colors;
    const y = topY || 84;
    return '<g class="flower-stem">' +
      '<path d="M70 139 C66 ' + Math.round(y + 32) + ' 74 ' + Math.round(y + 18) + ' 70 ' + y + '" fill="none" stroke="' + c.stem + '" stroke-width="3.4" stroke-linecap="round"></path>' +
      '<path d="M69 126 C55 127 45 118 41 103 C56 100 66 109 69 126Z" fill="' + c.leaf + '"></path>' +
      '<path d="M71 119 C85 121 96 112 99 97 C84 95 73 103 71 119Z" fill="' + c.stem + '" opacity=".9"></path>' +
      '<path d="M69 110 C59 110 52 104 50 95 C61 93 68 100 69 110Z" fill="' + c.leaf + '" opacity=".82"></path>' +
      '<path d="M43 104 C53 108 61 116 68 124" fill="none" stroke="#f7f2dc" stroke-width="1.2" opacity=".32"></path>' +
      '<path d="M97 99 C86 104 78 111 72 118" fill="none" stroke="#f7f2dc" stroke-width="1.2" opacity=".22"></path>' +
      '<ellipse cx="49" cy="108" rx="2.2" ry="1.5" fill="#f7f2dc" opacity=".5" transform="rotate(-24 49 108)"></ellipse>' +
    '</g>';
  }

  function seedStage(f, key) {
    const c = f.colors;
    return '<g class="flower-stage seed-art">' +
      '<path d="M38 138 C47 125 93 125 102 138 C86 149 54 149 38 138Z" fill="#8c654d"></path>' +
      '<path d="M48 134 C60 128 82 128 92 135" stroke="#ad7c5a" stroke-width="1.5" stroke-linecap="round" opacity=".7"></path>' +
      '<g transform="translate(70 128) rotate(-18)">' +
        '<ellipse rx="8.5" ry="12" fill="url(#' + key + '-petal)" stroke="' + c.centerAlt + '" stroke-opacity=".25"></ellipse>' +
        '<path d="M-2 -8 C1 -4 2 3 -1 8" fill="none" stroke="#fff7df" stroke-width="1.5" stroke-linecap="round" opacity=".5"></path>' +
      '</g>' +
      '<path d="M43 116 C40 110 42 104 47 101" fill="none" stroke="' + c.stem + '" stroke-width="2" stroke-linecap="round"></path>' +
      '<path d="M45 108 C39 108 35 104 34 99 C40 98 44 102 45 108Z" fill="' + c.leaf + '"></path>' +
      '<g fill="' + c.accent + '">' +
        '<path d="M94 94 l1.6 4.2 4.3 1.6 -4.3 1.6 -1.6 4.3 -1.6 -4.3 -4.3 -1.6 4.3 -1.6Z" opacity=".7"></path>' +
        '<circle cx="47" cy="85" r="1.7" opacity=".55"></circle>' +
        '<circle cx="92" cy="115" r="1.2" opacity=".45"></circle>' +
      '</g>' +
    '</g>';
  }

  function sproutStage(f) {
    const c = f.colors;
    return '<g class="flower-stage sprout-art">' +
      '<path d="M70 139 C68 125 72 113 70 103" fill="none" stroke="' + c.stem + '" stroke-width="3" stroke-linecap="round"></path>' +
      '<path d="M69 122 C54 124 43 113 41 97 C57 95 67 105 69 122Z" fill="' + c.leaf + '"></path>' +
      '<path d="M70 115 C84 117 95 106 98 91 C83 89 71 98 70 115Z" fill="' + c.stem + '" opacity=".88"></path>' +
      '<path d="M68 106 C62 100 61 92 63 86 C69 89 72 97 68 106Z" fill="' + c.leaf + '" opacity=".9"></path>' +
      '<path d="M45 100 C55 104 62 112 68 120" fill="none" stroke="#fff9e6" stroke-width="1.1" opacity=".38"></path>' +
      '<circle cx="61" cy="109" r="2.3" fill="#f4fbfc" opacity=".8"></circle>' +
      '<circle cx="61" cy="109" r="4.2" fill="none" stroke="#fff" stroke-opacity=".22"></circle>' +
      '<g fill="' + c.accent + '">' +
        '<circle cx="94" cy="72" r="1.5" opacity=".6"></circle>' +
        '<path d="M44 73 l1.2 3.2 3.2 1.2 -3.2 1.2 -1.2 3.2 -1.2 -3.2 -3.2 -1.2 3.2 -1.2Z" opacity=".55"></path>' +
      '</g>' +
    '</g>';
  }

  function budShape(c) {
    return '<g class="flower-stage bud-art" transform="translate(70 68)">' +
      '<path d="M0 -30 C18 -17 21 4 8 17 C3 22 -3 22 -8 17 C-21 4 -18 -17 0 -30Z" fill="' + c.petalAlt + '"></path>' +
      '<path d="M0 -25 C10 -14 12 2 4 15" fill="none" stroke="' + c.center + '" stroke-width="2" opacity=".35" stroke-linecap="round"></path>' +
      '<path d="M-1 -27 C-6 -9 -5 8 3 19 C-3 20 -9 14 -11 4 C-14 -9 -8 -21 -1 -27Z" fill="' + c.petal + '" opacity=".75"></path>' +
      '<path d="M-9 8 C-17 9 -21 15 -20 21 C-13 23 -7 18 -3 13" fill="' + c.leaf + '"></path>' +
      '<path d="M9 8 C17 9 21 15 20 21 C13 23 7 18 3 13" fill="' + c.leaf + '" opacity=".86"></path>' +
      '<path d="M-6 16 C-2 14 2 14 6 16" fill="none" stroke="' + c.stem + '" stroke-width="1.8" stroke-linecap="round" opacity=".7"></path>' +
      '<ellipse cx="-4" cy="-6" rx="2" ry="4" fill="#fffdf5" opacity=".25" transform="rotate(-18 -4 -6)"></ellipse>' +
    '</g>';
  }

  function daisyHead(c, cx, cy, scale) {
    const petals = [];
    for (let i = 0; i < 12; i += 1) {
      petals.push('<ellipse cx="0" cy="-23" rx="7.3" ry="17.5" fill="' + (i % 2 ? c.petalAlt : c.petal) + '" stroke="' + c.petalAlt + '" stroke-opacity=".38" transform="rotate(' + (i * 30) + ')"></ellipse>');
    }
    return '<g class="flower-head daisy-head" transform="translate(' + cx + ' ' + cy + ') scale(' + scale + ')">' +
      petals.join('') +
      '<circle r="13" fill="' + c.center + '"></circle>' +
      '<circle r="9.5" fill="' + c.centerAlt + '" opacity=".28"></circle>' +
      '<circle cx="-2.5" cy="-2.5" r="5.5" fill="' + c.center + '"></circle>' +
      '<g fill="' + c.centerAlt + '" opacity=".55">' +
        '<circle cx="3" cy="4" r="1.2"></circle>' +
        '<circle cx="-5" cy="5" r="1"></circle>' +
        '<circle cx="5" cy="-4" r="1"></circle>' +
        '<circle cx="-2" cy="7" r=".9"></circle>' +
      '</g>' +
    '</g>';
  }

  function daisyBloom(f, key) {
    const c = f.colors;
    return soilMound() +
      '<ellipse cx="70" cy="57" rx="48" ry="44" fill="' + c.petal + '" opacity=".12"></ellipse>' +
      '<g class="flower-sway">' +
        '<path d="M69 118 C55 113 47 104 41 93" fill="none" stroke="' + c.stem + '" stroke-width="2.8" stroke-linecap="round"></path>' +
        '<path d="M72 109 C84 104 92 100 99 94" fill="none" stroke="' + c.stem + '" stroke-width="2.4" stroke-linecap="round"></path>' +
        '<path d="M66 116 C58 112 54 108 51 102" fill="none" stroke="' + c.leaf + '" stroke-width="1.2" opacity=".35"></path>' +
        baseFoliage(f, 82) +
        daisyHead(c, 42, 86, .43) +
        daisyHead(c, 99, 92, .35) +
        daisyHead(c, 70, 54, 1) +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function tulipBloom(f, key) {
    const c = f.colors;
    return soilMound() +
      '<ellipse cx="70" cy="57" rx="43" ry="47" fill="' + c.petal + '" opacity=".13"></ellipse>' +
      '<g class="flower-sway">' +
        baseFoliage(f, 91) +
        '<g class="flower-head tulip-head" transform="translate(70 63)">' +
          '<path d="M-25 7 C-28 -17 -16 -35 -4 -43 C-8 -24 -5 -4 2 11 C-9 15 -20 14 -25 7Z" fill="' + c.petalAlt + '"></path>' +
          '<path d="M25 7 C28 -17 16 -35 4 -43 C8 -24 5 -4 -2 11 C9 15 20 14 25 7Z" fill="' + c.petalAlt + '" opacity=".9"></path>' +
          '<path d="M-2 15 C-14 14 -24 6 -25 -9 C-24 -27 -13 -39 0 -46 C13 -39 24 -27 25 -9 C24 6 14 14 2 15Z" fill="url(#' + key + '-petal)" stroke="' + c.petalAlt + '" stroke-opacity=".35"></path>' +
          '<path d="M-2 13 C-10 3 -9 -19 0 -41 C9 -19 10 3 2 13Z" fill="' + c.petal + '" opacity=".58"></path>' +
          '<path d="M-1 -35 C-3 -20 -4 -4 1 9" fill="none" stroke="#fff8ef" stroke-width="1.8" stroke-linecap="round" opacity=".5"></path>' +
          '<path d="M-17 -4 C-13 -20 -7 -31 0 -40" fill="none" stroke="#fff8ef" stroke-width="1.2" stroke-linecap="round" opacity=".22"></path>' +
        '</g>' +
        '<path d="M68 120 C61 112 58 101 61 91" fill="none" stroke="' + c.leaf + '" stroke-width="2" opacity=".65"></path>' +
        '<path d="M49 126 C46 113 50 101 60 94 C61 107 57 120 49 126Z" fill="' + c.leaf + '" opacity=".65"></path>' +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function hyacinthFloret(c, x, y, scale, dark) {
    const petals = [];
    for (let i = 0; i < 5; i += 1) {
      petals.push('<ellipse cx="0" cy="-6.2" rx="3.6" ry="6" fill="' + (dark ? c.petalAlt : c.petal) + '" transform="rotate(' + (i * 72) + ')" opacity=".96"></ellipse>');
    }
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' +
      petals.join('') +
      '<circle r="2.9" fill="' + c.center + '"></circle>' +
      '<circle r="1.1" fill="#fffaf0" opacity=".65"></circle>' +
    '</g>';
  }

  function hyacinthBloom(f, key) {
    const c = f.colors;
    const florets = [
      [70, 39, 1.02, 0], [60, 49, .96, 1], [80, 49, .92, 0],
      [51, 60, .92, 0], [70, 60, 1.05, 1], [89, 60, .9, 0],
      [60, 72, .95, 1], [80, 71, .92, 0], [70, 83, .9, 1],
      [63, 94, .8, 0], [78, 94, .76, 1]
    ];
    return soilMound() +
      '<ellipse cx="70" cy="63" rx="43" ry="51" fill="' + c.petal + '" opacity=".14"></ellipse>' +
      '<g class="flower-sway">' +
        baseFoliage(f, 94) +
        '<g class="flower-head hyacinth-head">' +
          '<path d="M70 97 C65 88 64 76 67 66" fill="none" stroke="' + c.stem + '" stroke-width="3.4" stroke-linecap="round"></path>' +
          '<path d="M67 43 C65 36 68 30 72 28" fill="none" stroke="' + c.leaf + '" stroke-width="2.2" stroke-linecap="round"></path>' +
          florets.map(function (item) { return hyacinthFloret(c, item[0], item[1], item[2], item[3]); }).join('') +
          '<path d="M63 30 C68 22 77 22 81 31 C76 37 68 37 63 30Z" fill="' + c.petalAlt + '" opacity=".85"></path>' +
        '</g>' +
        '<path d="M68 122 C58 115 53 104 55 94" fill="none" stroke="' + c.leaf + '" stroke-width="2" opacity=".5"></path>' +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function roseBloom(f, key) {
    const c = f.colors;
    const outer = [];
    for (let i = 0; i < 6; i += 1) {
      outer.push('<ellipse cx="0" cy="-22" rx="16.5" ry="20" fill="' + (i % 2 ? c.petalAlt : c.petal) + '" transform="rotate(' + (i * 60) + ')"></ellipse>');
    }
    return soilMound() +
      '<ellipse cx="70" cy="58" rx="49" ry="46" fill="' + c.petal + '" opacity=".14"></ellipse>' +
      '<g class="flower-sway">' +
        baseFoliage(f, 91) +
        '<path d="M72 103 C83 98 91 91 96 82" fill="none" stroke="' + c.stem + '" stroke-width="2.4" stroke-linecap="round"></path>' +
        '<g transform="translate(97 79) rotate(22)">' +
          '<path d="M0 0 C-9 -2 -10 -13 -3 -17 C4 -13 5 -5 0 0Z" fill="' + c.petalAlt + '"></path>' +
          '<path d="M-4 1 C-9 5 -9 12 -3 14 C2 11 2 5 -4 1Z" fill="' + c.leaf + '"></path>' +
        '</g>' +
        '<g class="flower-head rose-head" transform="translate(70 58)">' +
          outer.join('') +
          '<ellipse cx="0" cy="-13" rx="12.5" ry="14" fill="' + c.petal + '" transform="rotate(0)"></ellipse>' +
          '<ellipse cx="0" cy="-13" rx="12" ry="13.5" fill="' + c.center + '" opacity=".35" transform="rotate(72)"></ellipse>' +
          '<ellipse cx="0" cy="-13" rx="12" ry="13.5" fill="' + c.petalAlt + '" opacity=".2" transform="rotate(144)"></ellipse>' +
          '<circle r="16" fill="url(#' + key + '-petal)" opacity=".8"></circle>' +
          '<path d="M-7 6 C-13 -5 -3 -15 6 -11 C15 -6 14 6 5 10 C-1 13 -8 9 -6 3 C-4 -2 4 -3 6 2" fill="none" stroke="' + c.centerAlt + '" stroke-width="2.4" stroke-linecap="round" opacity=".7"></path>' +
          '<path d="M-2 9 C-6 3 0 -4 5 -1" fill="none" stroke="#fff7ee" stroke-width="1.2" stroke-linecap="round" opacity=".3"></path>' +
        '</g>' +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function sunflowerBloom(f, key) {
    const c = f.colors;
    const outer = [];
    const inner = [];
    for (let i = 0; i < 18; i += 1) {
      outer.push('<ellipse cx="0" cy="-35" rx="6.4" ry="16.5" fill="' + (i % 2 ? c.petalAlt : c.petal) + '" transform="rotate(' + (i * 20) + ')"></ellipse>');
    }
    for (let i = 0; i < 14; i += 1) {
      inner.push('<ellipse cx="0" cy="-26" rx="6" ry="13" fill="' + c.petal + '" opacity=".8" transform="rotate(' + (i * (360 / 14) + 12) + ')"></ellipse>');
    }
    return soilMound() +
      '<ellipse cx="70" cy="55" rx="55" ry="49" fill="' + c.petal + '" opacity=".16"></ellipse>' +
      '<g class="flower-sway">' +
        baseFoliage(f, 91) +
        '<path d="M68 119 C53 115 43 105 39 93" fill="none" stroke="' + c.leaf + '" stroke-width="2.2" opacity=".55"></path>' +
        '<g class="flower-head sunflower-head" transform="translate(70 54)">' +
          outer.join('') +
          inner.join('') +
          '<circle r="20" fill="' + c.center + '"></circle>' +
          '<circle r="17" fill="' + c.centerAlt + '" opacity=".62"></circle>' +
          '<circle r="12" fill="' + c.center + '" opacity=".32"></circle>' +
          '<g fill="' + c.centerAlt + '" opacity=".55">' +
            '<circle cx="-8" cy="-7" r="1.5"></circle><circle cx="4" cy="-11" r="1.2"></circle>' +
            '<circle cx="10" cy="-2" r="1.4"></circle><circle cx="-11" cy="3" r="1.2"></circle>' +
            '<circle cx="-2" cy="1" r="1.5"></circle><circle cx="7" cy="8" r="1.1"></circle>' +
            '<circle cx="-7" cy="9" r="1.3"></circle><circle cx="0" cy="10" r="1"></circle>' +
            '<circle cx="-8" cy="-1" r="1"></circle><circle cx="12" cy="4" r="1"></circle>' +
          '</g>' +
        '</g>' +
        '<path d="M51 127 C47 115 49 104 57 96 C59 108 57 120 51 127Z" fill="' + c.leaf + '" opacity=".6"></path>' +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function hydrangeaFloret(c, x, y, scale, dark) {
    const petals = [];
    for (let i = 0; i < 4; i += 1) {
      petals.push('<ellipse cx="0" cy="-5.1" rx="4.2" ry="5.1" fill="' + (dark ? c.petalAlt : c.petal) + '" transform="rotate(' + (i * 90) + ')" opacity=".96"></ellipse>');
    }
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')">' +
      petals.join('') +
      '<circle r="2.6" fill="' + c.center + '"></circle>' +
      '<circle r="1" fill="#fff" opacity=".7"></circle>' +
    '</g>';
  }

  function hydrangeaBloom(f, key) {
    const c = f.colors;
    const florets = [
      [70, 28, .9, 0], [51, 37, .92, 1], [89, 38, .88, 0],
      [35, 53, .85, 0], [57, 54, .94, 0], [80, 54, .93, 1], [101, 57, .84, 0],
      [45, 72, .92, 1], [68, 73, .9, 0], [91, 73, .86, 1],
      [58, 89, .86, 0], [79, 89, .84, 1], [70, 102, .78, 0]
    ];
    return soilMound() +
      '<ellipse cx="70" cy="65" rx="52" ry="52" fill="' + c.petal + '" opacity=".17"></ellipse>' +
      '<g class="flower-sway">' +
        baseFoliage(f, 99) +
        '<g class="flower-head hydrangea-head">' +
          '<path d="M70 103 C65 94 62 85 63 76" fill="none" stroke="' + c.stem + '" stroke-width="3.2" stroke-linecap="round"></path>' +
          florets.map(function (item) { return hydrangeaFloret(c, item[0], item[1], item[2], item[3]); }).join('') +
          '<path d="M66 23 C69 15 76 14 80 20 C77 27 70 28 66 23Z" fill="' + c.leaf + '" opacity=".8"></path>' +
        '</g>' +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function lilyBell(c, x, y, scale, flip) {
    return '<g transform="translate(' + x + ' ' + y + ') scale(' + scale + ')' + (flip ? ' scale(-1 1)' : '') + '">' +
      '<path d="M0 0 C-3 4 -7 9 -8 17 Q0 21 8 17 C7 9 3 4 0 0Z" fill="' + c.petal + '" stroke="' + c.petalAlt + '" stroke-width="1.2"></path>' +
      '<path d="M-8 17 Q-4 19 0 17 Q4 19 8 17" fill="none" stroke="' + c.petalAlt + '" stroke-width="1.5" stroke-linecap="round"></path>' +
      '<path d="M-4 4 C-5 9 -5 13 -4 17" fill="none" stroke="' + c.centerAlt + '" stroke-width="1" opacity=".35"></path>' +
      '<circle cx="0" cy="1.5" r="1.8" fill="' + c.center + '"></circle>' +
    '</g>';
  }

  function lilyBloom(f, key) {
    const c = f.colors;
    return soilMound() +
      '<ellipse cx="70" cy="62" rx="43" ry="50" fill="' + c.petal + '" opacity=".28"></ellipse>' +
      '<g class="flower-sway">' +
        '<path d="M70 139 C65 113 67 82 72 55" fill="none" stroke="' + c.stem + '" stroke-width="3.3" stroke-linecap="round"></path>' +
        '<path d="M69 128 C52 130 39 118 36 100 C55 97 67 108 69 128Z" fill="' + c.leaf + '"></path>' +
        '<path d="M71 121 C87 123 101 111 104 94 C86 92 73 103 71 121Z" fill="' + c.stem + '" opacity=".9"></path>' +
        '<path d="M68 111 C58 105 54 96 56 87 C65 90 70 100 68 111Z" fill="' + c.leaf + '" opacity=".85"></path>' +
        '<path d="M69 83 C62 76 57 68 55 61" fill="none" stroke="' + c.stem + '" stroke-width="2.2" stroke-linecap="round"></path>' +
        '<path d="M71 71 C78 66 84 62 90 60" fill="none" stroke="' + c.stem + '" stroke-width="2.2" stroke-linecap="round"></path>' +
        '<path d="M70 92 C64 88 59 84 55 80" fill="none" stroke="' + c.stem + '" stroke-width="2" stroke-linecap="round"></path>' +
        '<g class="flower-head lily-head">' +
          '<path d="M71 55 C71 47 73 41 77 36" fill="none" stroke="' + c.leaf + '" stroke-width="2.1" stroke-linecap="round"></path>' +
          '<circle cx="78" cy="34" r="2.2" fill="' + c.petal + '" stroke="' + c.petalAlt + '"></circle>' +
          '<circle cx="82" cy="38" r="1.7" fill="' + c.petal + '" stroke="' + c.petalAlt + '"></circle>' +
          lilyBell(c, 55, 59, .95, true) +
          lilyBell(c, 90, 58, .86, false) +
          lilyBell(c, 55, 80, .8, true) +
          '<path d="M67 102 C58 95 55 87 56 80" fill="none" stroke="#fffef8" stroke-width="1.2" opacity=".25"></path>' +
        '</g>' +
      '</g>' +
      sparkles(c.petal, c.accent);
  }

  function bloomStage(f, key) {
    const painters = {
      daisy: daisyBloom,
      tulip: tulipBloom,
      hyacinth: hyacinthBloom,
      rose: roseBloom,
      sunflower: sunflowerBloom,
      hydrangea: hydrangeaBloom,
      lily: lilyBloom
    };
    return (painters[f.shape] || daisyBloom)(f, key);
  }

  function flower(id, stage, options) {
    const opts = options || {};
    const f = DATA.flowerMap[id] || DATA.flowerMap.daisy;
    const safeStage = stage === 'bloom' || stage === 'bud' || stage === 'sprout' ? stage : 'seed';
    const key = 'flower' + (++uid);
    const c = f.colors;
    let body = '';
    if (safeStage === 'seed') {
      body = seedStage(f, key);
    } else if (safeStage === 'sprout') {
      body = sproutStage(f);
    } else if (safeStage === 'bud') {
      body = soilMound() + '<g class="flower-sway">' + baseFoliage(f, 92) + budShape(c) + '</g>';
    } else {
      body = bloomStage(f, key);
    }
    const classes = ['flower-render', 'is-' + safeStage, 'flower-' + hashClass(f.shape)];
    if (opts.className) classes.push(opts.className);
    return '<div class="' + classes.join(' ') + '" aria-hidden="true" style="--flower-accent:' + c.accent + ';--flower-petal:' + c.petal + '">' +
      '<svg class="flower-svg" viewBox="0 0 140 160" xmlns="http://www.w3.org/2000/svg" fill="none">' +
        '<defs>' + petalGradient(key, c.petal, c.petalAlt) +
          '<radialGradient id="' + key + '-glow" cx="50%" cy="50%" r="50%">' +
            '<stop offset="0" stop-color="' + c.petal + '" stop-opacity=".42"></stop>' +
            '<stop offset="1" stop-color="' + c.petal + '" stop-opacity="0"></stop>' +
          '</radialGradient>' +
        '</defs>' +
        body +
      '</svg>' +
    '</div>';
  }

  function seedPacket(id) {
    const f = DATA.flowerMap[id] || DATA.flowerMap.daisy;
    const key = 'seedpack' + (++uid);
    return '<div class="seed-packet" aria-hidden="true">' +
      '<svg viewBox="0 0 72 88" xmlns="http://www.w3.org/2000/svg" fill="none">' +
        '<defs>' + petalGradient(key, '#fdf8ea', '#eadfc8') + '</defs>' +
        '<path d="M12 8 C26 2 52 3 62 10 L60 77 C45 84 24 83 10 77Z" fill="url(#' + key + '-petal)" stroke="#d9c9ab" stroke-width="1.2"></path>' +
        '<path d="M12 8 C24 12 49 12 62 10" stroke="#cdb996" stroke-width="1.3"></path>' +
        '<path d="M20 19 L52 19" stroke="#d6c5a6" stroke-width="1"></path>' +
        '<path d="M20 24 L44 24" stroke="#e1d5c0" stroke-width="1"></path>' +
        '<circle cx="36" cy="51" r="16" fill="' + f.colors.petal + '" opacity=".45"></circle>' +
        daisyHead(f.colors, 36, 49, .31) +
        '<path d="M36 64 C35 60 36 57 37 54" stroke="' + f.colors.stem + '" stroke-width="1.6" stroke-linecap="round"></path>' +
        '<path d="M36 62 C32 61 30 59 29 56 C33 56 35 58 36 62Z" fill="' + f.colors.leaf + '"></path>' +
        '<path d="M25 73 L47 73" stroke="#c9b693" stroke-width="1.2" stroke-linecap="round"></path>' +
      '</svg>' +
    '</div>';
  }

  function logo() {
    const c = DATA.flowerMap.daisy.colors;
    return '<svg class="logo-svg" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg" fill="none" aria-hidden="true">' +
      '<circle cx="28" cy="28" r="27" fill="#f2ebdb"></circle>' +
      '<circle cx="28" cy="28" r="26" stroke="#ded1b6" stroke-width="1" stroke-dasharray="2 4"></circle>' +
      '<path d="M28 43 C27 37 29 31 28 25" stroke="#6f9167" stroke-width="1.8" stroke-linecap="round"></path>' +
      '<path d="M28 36 C23 35 20 32 19 28 C24 28 27 31 28 36Z" fill="#86a77a"></path>' +
      '<path d="M28 32 C33 31 36 28 37 24 C32 24 29 27 28 32Z" fill="#6f9167"></path>' +
      daisyHead(c, 28, 19, .33) +
    '</svg>';
  }

  window.Art = {
    flower: flower,
    seedPacket: seedPacket,
    logo: logo
  };
})();
