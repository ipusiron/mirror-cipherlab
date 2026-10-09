import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

const html = read('index.html');
const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]*)"/) || [])[1];

test('CSPのmetaがあり、metaでは効かない指示を書いていない', () => {
  assert.ok(csp, 'CSPのmetaがない');
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /style-src 'self'/);
  assert.match(csp, /base-uri 'none'/);
  assert.match(csp, /form-action 'none'/);
  // frame-ancestors と X-Frame-Options は meta では無視される
  assert.ok(!csp.includes('frame-ancestors'), 'CSPにframe-ancestorsがある');
  assert.ok(!html.includes('X-Frame-Options'), 'X-Frame-Optionsのmetaがある');
});

test('CSPが外部の取得元と危険な許可を含まない', () => {
  assert.ok(!/https?:\/\//.test(csp), `CSPに外部のURLがある: ${csp}`);
  assert.ok(!csp.includes("'unsafe-inline'"), "'unsafe-inline' がある");
  assert.ok(!csp.includes("'unsafe-eval'"), "'unsafe-eval' がある");
});

test('referrerのmetaとfaviconの指定がある（/favicon.ico を取りに行かない）', () => {
  assert.match(html, /<meta name="referrer" content="no-referrer">/);
  assert.match(html, /<link rel="icon" href="data:,">/);
  assert.match(csp, /img-src 'self' data:/);
});

test('外部のスクリプト・スタイルを読み込んでいない', () => {
  for (const m of html.matchAll(/<script[^>]*src="([^"]*)"/g)) {
    assert.ok(!/^(https?:)?\/\//.test(m[1]), `外部のスクリプト: ${m[1]}`);
  }
  for (const m of html.matchAll(/<link[^>]*href="([^"]*)"/g)) {
    assert.ok(!/^(https?:)?\/\//.test(m[1]), `外部のスタイル: ${m[1]}`);
  }
});

test('インラインのイベントハンドラー・style属性・インラインのscriptがない', () => {
  assert.ok(!/<[^>]+\son[a-z]+=/i.test(html), 'インラインのイベントハンドラーがある');
  assert.ok(!/<[^>]+\sstyle="/i.test(html), 'style属性がある');
  assert.ok(!/<script(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/i.test(html), 'インラインのscriptがある');
});

test('読み込むスクリプトがそろい、script.js が最後', () => {
  const order = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
  assert.deepEqual(order, ['./js/messages.js', './js/examples.js', './js/mirror-core.js',
    './js/reversal-compare.js', './js/lang-model.js', './js/solver.js', './script.js']);
});

test('noscriptがある', () => {
  assert.match(html, /<noscript>[\s\S]*JavaScript[\s\S]*<\/noscript>/);
});

test('画面が使う要素のidがそろっている', () => {
  const ids = ['themeToggle', 'themeIcon', 'input', 'example', 'inputCounts', 'inputSplit', 'inputLimit',
    'noSegmenter', 'btnClear', 'btnCopyIn', 'reversal', 'reversalHint', 'blockControl', 'blockSize', 'fixCase',
    'fixCaseHint', 'mirror', 'font', 'stepReversed', 'stepMirrored', 'comboTitle', 'comboText', 'comboMirror',
    'btnCopyOut', 'btnDownload', 'btnShare', 'shareStatus', 'shareBox', 'shareUrl', 'toast'];
  for (const id of ids) assert.ok(html.includes(`id="${id}"`), `id="${id}" がない`);
});

test('ボタンにtype属性があり、入力欄と選択肢にラベルがある', () => {
  for (const m of html.matchAll(/<button\b([^>]*)>/g)) {
    assert.match(m[1], /type="button"/, `type のないボタン: ${m[0]}`);
  }
  for (const id of ['input', 'example', 'reversal', 'blockSize', 'fixCase', 'mirror', 'font', 'shareUrl']) {
    assert.match(html, new RegExp(`<label[^>]*for="${id}"`), `${id} にラベルがない`);
  }
});

test('入力欄の上限が、コアの上限と同じ', () => {
  assert.match(html, /<textarea id="input" maxlength="50000"/);
});

test('結果の欄はキーボードで選べて、名前が付いている', () => {
  assert.match(html, /<pre id="stepReversed"[^>]*tabindex="0"[^>]*aria-labelledby="step1Label"/);
  assert.match(html, /<pre id="stepMirrored"[^>]*tabindex="0"[^>]*aria-labelledby="step2Label"/);
});

test('通知と共有の状態が読み上げに伝わる', () => {
  assert.match(html, /<div id="toast" role="status" aria-live="polite">/);
  assert.match(html, /<p id="shareStatus"[^>]*role="status"/);
  assert.match(html, /<div class="combo" id="combo" aria-live="polite">/);
});

test('外部リンクは noopener noreferrer で開く', () => {
  for (const m of html.matchAll(/<a\b[^>]*target="_blank"[^>]*>/g)) {
    assert.match(m[0], /rel="noopener noreferrer"/);
  }
});

test('lang属性とviewportがある', () => {
  assert.match(html, /<html lang="ja">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
});
