import test from 'node:test';
import assert from 'node:assert/strict';
import { core } from './load.js';

const C = core();
const BASE = 'https://ipusiron.github.io/mirror-cipherlab/';

/** 旧版（2025年公開時）の script.js と同じ手順で作った共有URLのハッシュ。 */
function legacyHash(payload) {
  const json = JSON.stringify(payload);
  // eslint-disable-next-line no-undef
  return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** ハッシュの中身の JSON をそのまま読む（テスト用）。 */
function rawPayload(hash) {
  let b64 = hash.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

const FAMILY = String.fromCodePoint(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);

test('共有URLは、画面の状態を往復で保つ', () => {
  const state = { text: `鏡よ鏡、Hello! ${FAMILY}`, mode: 'wordOrder', mirror: 'h', font: 'serif', blockSize: 5, fixCase: true };
  const { url } = C.shareUrl(BASE, state);
  assert.ok(url.startsWith(`${BASE}#`));
  const back = C.decodeShare(url.split('#')[1]);
  assert.equal(back.ok, true);
  assert.deepEqual(back.state, state);
});

test('ブロック長は、ブロックを使う方式のときだけ載せる', () => {
  const hash = C.encodeShare({ text: 'abc', mode: 'blocks', blockSize: 7 });
  assert.equal(C.decodeShare(hash).state.blockSize, 7);
  assert.equal(rawPayload(hash).n, 7);
  assert.deepEqual(Object.keys(rawPayload(C.encodeShare({ text: 'a', mode: 'all' }))).sort(), ['f', 'm', 'r', 't']);
  assert.equal(rawPayload(C.encodeShare({ text: 'a', fixCase: true })).c, 1);
});

test('URL はページのアドレスからハッシュを外して組み立てる（file:// でも壊れない）', () => {
  const r1 = C.shareUrl('file:///D:/tools/mirror-cipherlab/index.html#old', { text: 'x' });
  assert.ok(r1.url.startsWith('file:///D:/tools/mirror-cipherlab/index.html#'));
  assert.ok(!r1.url.includes('#old'));
  assert.ok(!r1.url.startsWith('null'));
});

test('URL の長さを返し、2,000字を超えたら警告の印を立てる', () => {
  const short = C.shareUrl(BASE, { text: 'Hello' });
  assert.equal(short.length, short.url.length);
  assert.equal(short.warn, false);
  const long = C.shareUrl(BASE, { text: 'a'.repeat(2000) });
  assert.equal(long.warn, true);
});

test('旧版の共有URLを読める（full→all、word→eachWord）', () => {
  const a = C.decodeShare(legacyHash({ t: 'Hello world!', r: 'full', m: 'h', f: 'serif' }));
  assert.equal(a.ok, true);
  assert.deepEqual(a.state, { text: 'Hello world!', mode: 'all', mirror: 'h', font: 'serif', blockSize: 5, fixCase: false });
  const b = C.decodeShare(`#${legacyHash({ t: '日本語', r: 'word', m: 'none', f: 'monospace' })}`);
  assert.equal(b.state.mode, 'eachWord');
  assert.equal(b.state.text, '日本語');
  const c = C.decodeShare(legacyHash({ t: 'x', r: 'none', m: 'v', f: 'system-ui' }));
  assert.equal(c.state.mode, 'none');
});

test('5万字を超える文字列は読み込まずに理由を返す', () => {
  const ok = C.decodeShare(C.encodeShare({ text: 'a'.repeat(50000) }));
  assert.equal(ok.ok, true);
  const tooLong = C.decodeShare(C.encodeShare({ text: 'a'.repeat(50001) }));
  assert.deepEqual(tooLong, { ok: false, error: 'tooLong' });
  assert.deepEqual(C.decodeShare('A'.repeat(C.MAX_HASH_LENGTH + 1)), { ok: false, error: 'tooLong' });
});

test('壊れたハッシュ・許可していない値を受け付けない', () => {
  assert.deepEqual(C.decodeShare(''), { ok: false, error: 'empty' });
  assert.deepEqual(C.decodeShare('#'), { ok: false, error: 'empty' });
  assert.deepEqual(C.decodeShare('abc$%'), { ok: false, error: 'format' });
  assert.deepEqual(C.decodeShare('AAAA'), { ok: false, error: 'format' });
  // UTF-8 として正しくないバイト列
  assert.deepEqual(C.decodeShare(btoa(String.fromCharCode(0xff, 0xfe)).replace(/=+$/, '')), { ok: false, error: 'format' });
  assert.deepEqual(C.decodeShare(legacyHash({ t: 123 })), { ok: false, error: 'invalid' });
  assert.deepEqual(C.decodeShare(legacyHash([1, 2])), { ok: false, error: 'invalid' });
  // 一覧にない値は既定値に戻す
  const s = C.decodeShare(legacyHash({ t: 'x', r: '<img>', m: 'rotate', f: 'Comic Sans', n: 999, c: 'yes' })).state;
  assert.deepEqual(s, { text: 'x', mode: 'all', mirror: 'none', font: 'system-ui', blockSize: 20, fixCase: false });
});
