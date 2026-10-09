import test from 'node:test';
import assert from 'node:assert/strict';
import { read } from './load.js';

// script.js は DOM を触るので Node では動かさず、再発を止めたい書き方だけを静的に確かめる。
// 実際の挙動はブラウザーで確認する（README の「テスト」の節）。
const script = read('script.js');

test('localStorage を例外ごと包み、使えない環境でも止まらない', () => {
  assert.ok(script.includes('function withStorage'), 'localStorage を包む関数がない');
  assert.match(script, /try \{\s*return action\(window\.localStorage\);\s*\} catch/);
  // 包まずに直接触っている箇所がない
  const direct = script.split('\n').filter((l) => /localStorage\.(get|set)Item/.test(l));
  assert.deepEqual(direct, []);
});

test('テーマは保存した選択、OS の設定の順で決める', () => {
  assert.ok(script.includes('prefers-color-scheme: light'), 'OS の設定を見ていない');
});

test('トーストのタイマーを止めてから数え直す', () => {
  assert.match(script, /clearTimeout\(toastTimer\)/);
});

test('ダウンロードの URL は少し待ってから解放する', () => {
  assert.match(script, /setTimeout\(\(\) => URL\.revokeObjectURL\(url\), \d+\)/);
});

test('共有URLは location.origin を使わず、非推奨の escape・unescape も使わない', () => {
  assert.ok(!script.includes('location.origin'), 'Firefox の file:// で "null" になる');
  assert.ok(!/\b(un)?escape\(/.test(script), 'escape・unescape が残っている');
  assert.ok(!/\bbtoa\(|\batob\(/.test(script), '符号化は MirrorCore に任せる');
  assert.ok(script.includes('Core.shareUrl(location.href'), '共有URLをページのアドレスから作っていない');
});

test('開いたあとにハッシュが変わっても読み直す', () => {
  assert.match(script, /addEventListener\("hashchange", loadFromHash\)/);
});

test('クリップボードの API がない環境でも止まらない', () => {
  assert.ok(script.includes('function writeClipboard'));
  assert.match(script, /!navigator\.clipboard/);
});

test('入力の描画は textContent で行い、innerHTML を使わない', () => {
  assert.ok(!script.includes('innerHTML'), 'innerHTML がある');
  assert.ok(!script.includes('insertAdjacentHTML'), 'insertAdjacentHTML がある');
  assert.ok(!/\.style\.\w+\s*=/.test(script), 'style プロパティへの代入がある（クラスで切り替える）');
});

test('長い入力は打鍵ごとではなく少し待ってから変換する', () => {
  assert.match(script, /const DEBOUNCE_LENGTH = \d+;/);
  assert.match(script, /setTimeout\(update, DEBOUNCE_MS\)/);
});
