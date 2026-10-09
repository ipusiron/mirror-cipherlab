import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { core, load, read } from './load.js';

const C = core();
const M = load('js/messages.js').MirrorMessages;
const { EXAMPLES } = load('js/examples.js').MirrorExamples;
const html = read('index.html');
const script = read('script.js');
const JA_README = read('README.md');
const EN_README = read('README.en.md');
const ROOT = fileURLToPath(new URL('../', import.meta.url));

const range = (a, b) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`;
const JP = new RegExp(`[${range(0x3040, 0x30ff)}${range(0x4e00, 0x9fff)}${range(0xff00, 0xffef)}]`, 'u');

test('対応する言語は ja と en の2つ', () => {
  assert.deepEqual(M.LANGUAGES, ['ja', 'en']);
  assert.deepEqual(Object.keys(M.MESSAGES).sort(), ['en', 'ja']);
});

test('日本語と英語のキーが完全に一致する', () => {
  const ja = Object.keys(M.MESSAGES.ja).sort();
  const en = Object.keys(M.MESSAGES.en).sort();
  assert.deepEqual(ja.filter((k) => !en.includes(k)), [], '英語にないキー');
  assert.deepEqual(en.filter((k) => !ja.includes(k)), [], '日本語にないキー');
});

test('英語の辞書に日本語の文字が入っていない（言語の切り替えボタンを除く）', () => {
  for (const [key, value] of Object.entries(M.MESSAGES.en)) {
    if (key === 'lang.toggle') continue;
    assert.ok(!JP.test(value), `${key} に日本語の文字がある: ${value}`);
  }
  assert.equal(M.MESSAGES.en['lang.toggle'], '日本語');
  assert.equal(M.MESSAGES.ja['lang.toggle'], 'English');
});

test('差し込みの印が、日本語と英語でそろっている', () => {
  const names = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(M.MESSAGES.ja)) {
    assert.deepEqual(names(M.MESSAGES.ja[key]), names(M.MESSAGES.en[key]), `${key} の差し込みの印が食い違う`);
  }
});

test('画面の文言がHTMLに直書きされていない（noscript を除く）', () => {
  const body = html.slice(html.indexOf('<body>'))
    .replace(/<noscript>[\s\S]*?<\/noscript>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '');
  const texts = body.replace(/<[^>]+>/g, '\n').split('\n').map((s) => s.trim()).filter(Boolean);
  for (const s of texts) assert.ok(!JP.test(s), `index.html に直書きの日本語がある: ${s}`);
  for (const attr of ['placeholder', 'aria-label', 'title', 'alt']) {
    for (const m of html.matchAll(new RegExp(`\\s${attr}="([^"]*)"`, 'g'))) {
      assert.ok(!JP.test(m[1]), `${attr}="${m[1]}" が直書きされている`);
    }
  }
});

test('script.js のコードに日本語の文字列を書かない（文言は辞書から引く）', () => {
  const code = script.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.ok(!JP.test(code), 'script.js のコードに日本語の文字がある');
});

test('言語の決め方は、問い合わせ・保存・ブラウザーの順で、localStorage を包んでいる', () => {
  assert.match(script, /lang=\(\[a-zA-Z-\]\+\)/);
  assert.ok(script.includes('LANG_STORAGE_KEY'));
  assert.ok(script.includes('navigator.language'));
  assert.match(script, /withStorage\(\(s\) => s\.getItem\(LANG_STORAGE_KEY\)/);
  assert.ok(script.includes('document.documentElement.lang = lang'));
  assert.ok(script.includes('document.title = t("app.title")'));
});

test('言語を切り替えても計算し直さず、状態から作る文を描き直す', () => {
  const body = script.slice(script.indexOf('function setLang'), script.indexOf('// ---------- テーマ'));
  assert.ok(!body.includes('update()'), 'setLang が update() を呼んでいる（計算し直している）');
  for (const fn of ['applyI18n()', 'renderThemeButton()', 'renderStatus()', 'renderShareStatus()']) {
    assert.ok(body.includes(fn), `setLang が ${fn} を呼んでいない`);
  }
});

test('2つのREADMEが互いを指している', () => {
  assert.ok(JA_README.includes('\n[English](README.en.md) · 日本語\n\n# Mirror CipherLab'));
  assert.ok(EN_README.startsWith('English · [日本語](README.md)\n'));
  assert.ok(!EN_README.includes('slug: mirror-cipherlab'), 'README.en.md にYAMLメタデータがある');
});

test('README.en.md は日本語版と同じ節（見出しの数・深さ・アイコン）をそろえている', () => {
  const strip = (s) => s.replace(/```[\s\S]*?```/g, '');
  const heads = (s) => [...strip(s).matchAll(/^(#{1,3}) (.+)$/gm)]
    .map((m) => [m[1].length, m[1].length === 2 ? [...m[2]][0] : '']);
  assert.deepEqual(heads(EN_README), heads(JA_README));
  assert.ok(heads(JA_README).length >= 30);
});

test('README.en.md に日本語の本文が残っていない（1行目・コード・表は除く）', () => {
  const body = EN_README.replace(/```[\s\S]*?```/g, '').split('\n').slice(1)
    .filter((l) => !l.startsWith('|'))
    .map((l) => l.replace(/`[^`]*`/g, ''));
  for (const line of body) assert.ok(!JP.test(line), `README.en.md に日本語がある: ${line.trim()}`);
});

test('README.en.md の Step 1 の表と例も、実装の出力と一致する', () => {
  const block = EN_README.slice(EN_README.indexOf('### Step 1:'), EN_README.indexOf('### Step 2:'));
  const rows = block.split('\n').filter((l) => l.startsWith('|') && !/^\|[-|]+\|$/.test(l)).slice(1)
    .map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
  assert.equal(rows.length, C.MODES.length);
  const code = (cell) => cell.match(/`([^`]*)`/)[1].replace(/\\n/g, '\n');
  rows.forEach((cells, i) => {
    assert.equal(C.transform(code(cells[2]), { mode: C.MODES[i], blockSize: 5 }), code(cells[3]), cells[0]);
  });
  const joined = EN_README.replace(/\n> /g, ' ');
  for (const key of ['carroll', 'swift']) {
    const ex = EXAMPLES.find((e) => e.key === key);
    assert.ok(joined.includes(ex.text), `${key} の原文`);
    assert.ok(joined.includes(C.transform(ex.text, ex)), `${key} の変換結果`);
  }
});

test('英語の画面のスクリーンショットはすべて実在し、README.en.md から参照されている', () => {
  const refs = [...EN_README.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]).filter((r) => !/^https?:/.test(r));
  for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, r)), `${r} がない`);
  const pngs = fs.readdirSync(path.join(ROOT, 'assets', 'en')).filter((f) => f.endsWith('.png')).map((f) => `assets/en/${f}`);
  assert.deepEqual(pngs.filter((p) => !refs.includes(p)), []);
  assert.equal(refs.length, 6);
});

test('2つのREADMEのディレクトリー構造は、同じ行を同じ順で並べる', () => {
  const tree = (md) => md.slice(md.lastIndexOf('```\nmirror-cipherlab/')).split('\n```')[0].split('\n').slice(1)
    .map((l) => l.split(/\s+#/)[0].trimEnd());
  assert.deepEqual(tree(EN_README), tree(JA_README));
});

test('例文の英語版（en）は、英語の画面で使う', () => {
  const amb = EXAMPLES.find((e) => e.key === 'ambulance');
  assert.equal(amb.en, 'AMBULANCE');
  assert.ok(script.includes('Examples.textOf(ex, lang)'));
});
