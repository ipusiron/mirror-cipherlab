import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { read } from './load.js';

const JS = ['script.js', 'js/mirror-core.js', 'js/messages.js', 'js/examples.js', 'js/reversal-compare.js', 'js/solver.js',
  ...fs.readdirSync(new URL('./', import.meta.url))
    .filter((f) => f.endsWith('.js')).map((f) => `test/${f}`)];

test('1行に詰め込まない（JS・CSS・テストは160文字、HTMLは250文字まで）', () => {
  for (const f of [...JS, 'style.css']) {
    read(f).split('\n').forEach((line, i) => {
      assert.ok([...line].length <= 160, `${f}:${i + 1} が ${[...line].length} 文字`);
    });
  }
  read('index.html').split('\n').forEach((line, i) => {
    assert.ok([...line].length <= 250, `index.html:${i + 1} が ${[...line].length} 文字`);
  });
});

test('主なファイルの行数の下限（縮めて書き直していない）', () => {
  const min = { 'script.js': 150, 'js/mirror-core.js': 400, 'style.css': 450, 'index.html': 120 };
  for (const [f, n] of Object.entries(min)) {
    const lines = read(f).split('\n').length;
    assert.ok(lines >= n, `${f} が ${lines} 行（下限 ${n}）`);
  }
});

test('ファイルはLFで、制御文字を含まない', () => {
  for (const f of [...JS, 'style.css', 'index.html']) {
    const s = read(f);
    assert.ok(!s.includes('\r'), `${f} にCRがある`);
    const bad = [...s].filter((c) => {
      const n = c.codePointAt(0);
      return (n < 0x20 && n !== 0x0a && n !== 0x09) || n === 0x7f;
    });
    assert.deepEqual(bad, [], `${f} に制御文字がある`);
  }
});

test('ファイルの末尾に改行がある', () => {
  for (const f of [...JS, 'style.css', 'index.html']) {
    assert.ok(read(f).endsWith('\n'), `${f} の末尾に改行がない`);
  }
});

test('ソースに見えない文字を直接書かない（コードポイントから組み立てる）', () => {
  // ZWJ・双方向の制御・ノーブレークハイフン・全角空白など（絵文字の異体字セレクター U+FE0F は表示の一部なので許す）
  const INVISIBLE = [0x200B, 0x200C, 0x200D, 0x200E, 0x200F, 0x2011, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E,
    0x2060, 0x2066, 0x2067, 0x2068, 0x2069, 0xFEFF, 0x00AD, 0x3000];
  for (const f of [...JS, 'style.css', 'index.html']) {
    const hits = [...read(f)].filter((c) => INVISIBLE.includes(c.codePointAt(0)));
    assert.deepEqual(hits.map((c) => c.codePointAt(0).toString(16)), [], `${f}`);
  }
});
