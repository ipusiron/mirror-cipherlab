import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const css = read('style.css');

/** CSS の宣言ブロックから --name: value を拾う。 */
function vars(block) {
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

const blockOf = (start) => css.slice(css.indexOf(start), css.indexOf('}', css.indexOf(start)) + 1);
const darkBlock = blockOf(':root{');
const lightBlock = blockOf(':root[data-theme="light"]{');
const DARK = vars(darkBlock);
const LIGHT = Object.assign({}, DARK, vars(lightBlock));

const srgb = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

/** #rrggbb・rgba() を [r, g, b, a] にする。 */
function parseColor(value) {
  const rgba = value.match(/rgba?\(([^)]+)\)/);
  if (rgba) {
    const parts = rgba[1].split(',').map((s) => parseFloat(s.trim()));
    return [parts[0], parts[1], parts[2], parts.length > 3 ? parts[3] : 1];
  }
  const hex = value.trim().replace('#', '');
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)).concat(1);
}

/** 半透明の色を下地に重ねた実効色を出す。 */
function composite(top, bottom) {
  const [r1, g1, b1, a] = top;
  const [r2, g2, b2] = bottom;
  return [r1 * a + r2 * (1 - a), g1 * a + g2 * (1 - a), b1 * a + b2 * (1 - a), 1];
}

const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);

function ratio(fg, bg) {
  const [l1, l2] = [lum(fg), lum(bg)].sort((a, b) => b - a);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** 背景の名前から実効色を出す。--controls-bg は半透明なので --panel に重ねる。 */
function background(table, name) {
  const c = parseColor(table[name]);
  return c[3] < 1 ? composite(c, parseColor(table['--panel'])) : c;
}

/** 文字と背景の組（4.5:1 以上）。 */
const TEXT_PAIRS = [
  ['--text', '--bg'], ['--text', '--panel'], ['--text', '--input-bg'], ['--text', '--controls-bg'],
  ['--muted', '--bg'], ['--muted', '--panel'], ['--muted', '--input-bg'], ['--muted', '--controls-bg'],
  ['--accent-fg', '--accent'], ['--accent-2-fg', '--accent-2'], ['--badge-fg', '--badge-bg'],
  ['--flow-fg', '--flow-bg'], ['--link', '--bg'], ['--link', '--panel']
];

/** フォーカスの枠と、その外側の背景の組（非テキストの 3:1 以上。WCAG 2.2 の 1.4.11）。 */
const FOCUS_PAIRS = [['--focus', '--bg'], ['--focus', '--panel'], ['--focus', '--input-bg'], ['--focus', '--controls-bg']];

for (const [theme, table] of [['ダーク', DARK], ['ライト', LIGHT]]) {
  test(`${theme}の文字と背景が、すべて4.5:1以上である`, () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      assert.ok(table[fg] && table[bg], `${theme}: ${fg} か ${bg} がない`);
      const r = ratio(parseColor(table[fg]), background(table, bg));
      assert.ok(r >= 4.5, `${theme}: ${fg} on ${bg} = ${r.toFixed(2)}:1`);
    }
  });

  test(`${theme}のフォーカスの枠が、背景に対して3:1以上である`, () => {
    for (const [fg, bg] of FOCUS_PAIRS) {
      const r = ratio(parseColor(table[fg]), background(table, bg));
      assert.ok(r >= 3, `${theme}: ${fg} on ${bg} = ${r.toFixed(2)}:1`);
    }
  });
}

test('配色はすべて変数で書く（規則の中に色リテラルを残さない）', () => {
  const body = css.replace(darkBlock, '').replace(lightBlock, '');
  const leftovers = [...body.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
  assert.deepEqual(leftovers, [], `色リテラルが残っている: ${leftovers.join(', ')}`);
});

test('ライトはダークで定義した変数だけを上書きしている', () => {
  const extra = Object.keys(vars(lightBlock)).filter((k) => !(k in DARK));
  assert.deepEqual(extra, [], `ダークにない変数がライトにある: ${extra.join(', ')}`);
});

test('フォーカスを消さない（outline:none を書かない）', () => {
  assert.ok(!/outline\s*:\s*none/.test(css), 'outline:none が残っている');
  assert.match(css, /:focus-visible\{\s*outline:3px solid var\(--focus\);\s*outline-offset:2px;/);
});

test('ボタンのホバーで文字と背景の色を変えない（コントラストを保つ）', () => {
  assert.ok(!/filter\s*:\s*brightness/.test(css), 'brightness でホバーの色を変えている');
});

test('入力欄と選択肢は16px以上、操作する要素は高さ44px以上', () => {
  for (const sel of ['#input{', '.control select{', '.example-picker select,']) {
    const block = css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
    assert.match(block, /font-size:16px;/, `${sel} の文字が16px未満`);
  }
  for (const sel of ['.btn{', '.control select{', '.theme-toggle{', '.example-picker select,']) {
    const block = css.slice(css.indexOf(sel), css.indexOf('}', css.indexOf(sel)));
    assert.match(block, /min-height:44px;/, `${sel} の高さの下限がない`);
  }
});

test('動きを減らす設定で、矢印の跳ねと遷移を止める', () => {
  const at = css.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(at >= 0, 'prefers-reduced-motion の指定がない');
  assert.match(css.slice(at, at + 300), /animation:none;/);
});

test('ダークとライトで color-scheme を切り替える（フォームの部品とスクロールバーの色）', () => {
  assert.match(darkBlock, /color-scheme:dark;/);
  assert.match(lightBlock, /color-scheme:light;/);
});
