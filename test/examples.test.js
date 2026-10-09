import test from 'node:test';
import assert from 'node:assert/strict';
import { core, load } from './load.js';

const C = core();
const { EXAMPLES, textOf } = load('js/examples.js').MirrorExamples;
const cp = (...codes) => String.fromCodePoint(...codes);
const byKey = (k) => EXAMPLES.find((e) => e.key === k);
const run = (ex, lang = 'ja') => C.transform(textOf(ex, lang), ex);

test('例文は6つで、設定の値がすべて一覧にある', () => {
  assert.deepEqual(EXAMPLES.map((e) => e.key), ['swift', 'carroll', 'ambulance', 'truck', 'emoji', 'double']);
  for (const ex of EXAMPLES) {
    assert.ok(C.MODES.includes(ex.mode), `${ex.key}: ${ex.mode}`);
    assert.ok(C.MIRRORS.includes(ex.mirror), `${ex.key}: ${ex.mirror}`);
    assert.ok(ex.text.length > 0 && ex.text.length <= C.MAX_TEXT_LENGTH);
  }
});

test('スウィフト: README の結果と1字も違わない', () => {
  assert.equal(run(byKey('swift')), 'Im anas. Osoido in sum mer. Otom ami so dulli amad man?');
});

test('キャロル: 正読文になり、もう一度かけると翻刻に戻る', () => {
  const ex = byKey('carroll');
  const forward = run(ex);
  assert.ok(forward.startsWith('The only '), forward);
  assert.ok(forward.includes('you forgot it for 70 or 80 years, so that you had to give it to his grandson instead!'));
  assert.ok(forward.endsWith('Your loving uncle'));
  assert.equal(C.transform(forward, ex), ex.text);
});

test('救急車: 並べ替えずに左右の鏡像（鏡に映すと読める）', () => {
  const ex = byKey('ambulance');
  assert.equal(run(ex), '救急');
  assert.equal(run(ex, 'en'), 'AMBULANCE');
  assert.equal(C.describeCombination(ex.mode, ex.mirror), 'mirrorWriting');
  assert.equal(C.readableInMirror(ex.mode, ex.mirror), true);
});

test('トラック: 右から左へ読む並び', () => {
  const ex = byKey('truck');
  assert.equal(run(ex), '送運ーラミ');
  assert.equal(C.describeCombination(ex.mode, ex.mirror), 'rightToLeft');
});

test('絵文字と結合文字: 見た目の1文字のまま逆順になる', () => {
  const ex = byKey('emoji');
  const expected = cp(0x304D) + cp(0x304B, 0x3099) + ' ' + cp(0x65, 0x301) + 'faC' + ' '
    + cp(0x1F1FA, 0x1F1F8) + cp(0x1F1EF, 0x1F1F5) + ' ' + cp(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);
  assert.equal(run(ex), expected);
  const c = C.counts(ex.text);
  assert.ok(c.codePoints > c.graphemes, '書記素とコードポイントの数が違う例になっている');
});

test('ブロックの二重化: 全文の逆順と同じ', () => {
  const ex = byKey('double');
  assert.equal(run(ex), 'NWADTAKCATTA');
  assert.equal(run(ex), C.reverseAll(ex.text));
});
