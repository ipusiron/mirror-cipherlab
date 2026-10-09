import test from 'node:test';
import assert from 'node:assert/strict';
import { core, load } from './load.js';

const C = core();
const R = load('js/render-image.js').MirrorRender;

/** canvas の代わり。呼ばれた順に命令を記録するだけの入れ物。 */
function fakeCanvas() {
  const calls = [];
  const ctx = {
    font: '',
    fillStyle: '',
    textBaseline: '',
    textAlign: '',
    setTransform: (...a) => calls.push(['setTransform', ...a]),
    measureText: (s) => ({ width: s.length * 14 }),
    fillRect: (...a) => calls.push(['fillRect', ...a]),
    fillText: (...a) => calls.push(['fillText', ...a]),
    save: () => calls.push(['save']),
    restore: () => calls.push(['restore']),
    translate: (...a) => calls.push(['translate', ...a]),
    scale: (...a) => calls.push(['scale', ...a])
  };
  return { width: 0, height: 0, getContext: () => ctx, calls };
}

const scales = (canvas) => canvas.calls.filter((c) => c[0] === 'scale').map((c) => [c[1], c[2]]);
const texts = (canvas) => canvas.calls.filter((c) => c[0] === 'fillText').map((c) => c[1]);

test('フォントの指定は画面の選択肢と同じ3つ', () => {
  assert.deepEqual(Object.keys(R.FONT_STACK).sort(), [...C.FONTS].sort());
});

test('行に分け、上限を超えたら切って知らせる', () => {
  assert.deepEqual(R.toLines('a\nb'), { lines: ['a', 'b'], clipped: false });
  assert.equal(R.toLines('x\n'.repeat(R.MAX_LINES + 5)).lines.length, R.MAX_LINES);
  assert.equal(R.toLines('x\n'.repeat(R.MAX_LINES + 5)).clipped, true);
  const long = R.toLines('a'.repeat(R.MAX_CHARS_PER_LINE + 10));
  assert.equal(C.graphemes(long.lines[0]).length, R.MAX_CHARS_PER_LINE);
  assert.equal(long.clipped, true);
  // 見た目の1文字で切るので、絵文字が割れない
  const family = String.fromCodePoint(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);
  const cut = R.toLines(family.repeat(R.MAX_CHARS_PER_LINE + 2));
  assert.equal(C.graphemes(cut.lines[0]).length, R.MAX_CHARS_PER_LINE);
});

test('牛耕式でないときは、全部の行に同じ変形を掛ける', () => {
  assert.deepEqual(R.lineTransforms('a\nb\nc', 'all', 'h'),
    [{ h: true, v: false }, { h: true, v: false }, { h: true, v: false }]);
  assert.deepEqual(R.lineTransforms('a\nb', 'all', 'hv'), [{ h: true, v: true }, { h: true, v: true }]);
  assert.deepEqual(R.lineTransforms('a\nb', 'all', 'none'), [{ h: false, v: false }, { h: false, v: false }]);
});

test('牛耕式は、向きが逆になる行だけに変形を掛ける', () => {
  assert.deepEqual(R.lineTransforms('a\nb\nc\nd', 'boustrophedon', 'h'),
    [{ h: false, v: false }, { h: true, v: false }, { h: false, v: false }, { h: true, v: false }]);
  // 行の番号は計算部と同じ
  assert.deepEqual(C.reversedLines('a\nb\nc\nd'), [1, 3]);
  assert.deepEqual(R.lineTransforms('a\nb', 'boustrophedon', 'none'), [{ h: false, v: false }, { h: false, v: false }]);
});

test('canvas に行の数だけ文字を描き、寸法を返す', () => {
  const canvas = fakeCanvas();
  const info = R.draw(canvas, { text: 'abc\ndef', mode: 'all', mirror: 'none', font: 'monospace', scale: 2 });
  assert.deepEqual(texts(canvas), ['abc', 'def']);
  assert.equal(info.clipped, false);
  assert.equal(info.pixelWidth, info.width * 2);
  assert.equal(info.pixelHeight, info.height * 2);
  assert.ok(info.height > info.width / 10, '行の数だけ高さがある');
});

test('鏡像の指定を、行ごとの反転として canvas に渡す', () => {
  const h = fakeCanvas();
  R.draw(h, { text: 'ab\ncd', mode: 'all', mirror: 'h' });
  assert.deepEqual(scales(h), [[-1, 1], [-1, 1]]);

  const hv = fakeCanvas();
  R.draw(hv, { text: 'ab', mode: 'all', mirror: 'hv' });
  assert.deepEqual(scales(hv), [[-1, -1]]);

  const ox = fakeCanvas();
  R.draw(ox, { text: 'ab\ncd\nef', mode: 'boustrophedon', mirror: 'h' });
  assert.deepEqual(scales(ox), [[1, 1], [-1, 1], [1, 1]], '2行目だけ左右反転する');

  const plain = fakeCanvas();
  R.draw(plain, { text: 'ab\ncd', mode: 'all', mirror: 'none' });
  assert.deepEqual(scales(plain), [[1, 1], [1, 1]]);
});

test('空の入力でも1行ぶん描く', () => {
  const canvas = fakeCanvas();
  const info = R.draw(canvas, { text: '', mode: 'none', mirror: 'none' });
  assert.deepEqual(texts(canvas), ['']);
  assert.ok(info.width >= 320);
});

test('知らないフォントの指定は既定に戻す', () => {
  const canvas = fakeCanvas();
  R.draw(canvas, { text: 'a', mode: 'none', mirror: 'none', font: 'Comic Sans' });
  assert.ok(canvas.getContext().font.includes('system-ui'));
});

test('保存する名前は PNG で、時刻が入る', () => {
  const name = R.fileName(new Date(Date.UTC(2026, 9, 9, 4, 5, 6)));
  assert.equal(name, 'mirror-cipherlab_2026-10-09T04-05-06-000Z.png');
  assert.ok(!/[:.]/.test(name.replace('.png', '')), 'ファイル名に使えない文字を残さない');
});
