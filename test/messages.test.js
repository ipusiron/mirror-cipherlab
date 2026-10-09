import test from 'node:test';
import assert from 'node:assert/strict';
import { core, load, read } from './load.js';

const C = core();
const M = load('js/messages.js').MirrorMessages;
const { EXAMPLES } = load('js/examples.js').MirrorExamples;
const html = read('index.html');
const script = read('script.js');
const JA = M.MESSAGES.ja;
const has = (key) => Object.prototype.hasOwnProperty.call(JA, key);

test('index.html が引くキーが、すべて日本語の辞書にある', () => {
  let count = 0;
  for (const attr of ['data-i18n', 'data-i18n-placeholder', 'data-i18n-label']) {
    for (const m of html.matchAll(new RegExp(`${attr}="([^"]+)"`, 'g'))) {
      assert.ok(has(m[1]), `${m[1]} が辞書にない`);
      count++;
    }
  }
  assert.ok(count >= 60, `data-i18n の数が ${count} 件しかない`);
});

test('script.js が直接引くキーが、すべて辞書にある', () => {
  // t("…") の引数と、三項演算子などで選ぶキー（辞書の名前空間で始まる文字列）を拾う
  const spaces = [...new Set(Object.keys(JA).map((k) => k.split('.')[0]))].join('|');
  const pattern = new RegExp(`"((?:${spaces})\\.[\\w.-]+)"`, 'g');
  const keys = [...new Set([...script.matchAll(pattern)].map((m) => m[1]))];
  assert.ok(keys.length >= 10, `キーが ${keys.length} 件しか見つからない`);
  for (const k of keys) assert.ok(has(k), `${k} が辞書にない`);
});

test('組み立てて引くキー（方式・鏡像・フォント・組み合わせ・例文）がそろっている', () => {
  for (const mode of C.MODES) {
    assert.ok(has(`mode.${mode}`), `mode.${mode}`);
    assert.ok(has(`hint.${mode}`), `hint.${mode}`);
  }
  for (const m of C.MIRRORS) assert.ok(has(`mirror.${m}`), `mirror.${m}`);
  for (const f of C.FONTS) assert.ok(has(`font.${f}`), `font.${f}`);
  for (const mode of C.MODES) {
    for (const mirror of C.MIRRORS) {
      const key = C.describeCombination(mode, mirror);
      assert.ok(has(`combo.${key}.title`) && has(`combo.${key}.text`), `combo.${key}`);
    }
  }
  for (const ex of EXAMPLES) assert.ok(has(`example.${ex.key}`), `example.${ex.key}`);
});

test('画面の選択肢の値が、コアの一覧と同じ順でそろっている', () => {
  const options = (id) => {
    const block = html.slice(html.indexOf(`<select id="${id}"`), html.indexOf('</select>', html.indexOf(`<select id="${id}"`)));
    return [...block.matchAll(/<option value="([^"]*)"/g)].map((m) => m[1]);
  };
  assert.deepEqual(options('reversal'), C.MODES);
  assert.deepEqual(options('mirror'), C.MIRRORS);
  assert.deepEqual(options('font'), C.FONTS);
  assert.deepEqual(options('example'), ['', ...EXAMPLES.map((e) => e.key)]);
});

test('差し込みの印を埋める', () => {
  assert.equal(M.t('ja', 'hint.blocks', { n: 5 }).startsWith('5字ずつ'), true);
  assert.equal(M.t('ja', 'input.counts', { graphemes: 3, codePoints: 7, utf16: 10 }),
    '見た目の文字数：3／コードポイント数：7／UTF-16の長さ：10');
  assert.equal(M.t('ja', 'no.such.key'), 'no.such.key');
});
