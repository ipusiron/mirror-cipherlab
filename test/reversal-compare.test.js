import test from 'node:test';
import assert from 'node:assert/strict';
import { core, load } from './load.js';

core();
const X = load('js/reversal-compare.js').MirrorCompare;
const cp = (...codes) => String.fromCodePoint(...codes);
const RLO = cp(0x202E);
const PDF = cp(0x202C);

test('RLO と PDF のコードポイント', () => {
  assert.equal(X.RLO.codePointAt(0), 0x202E);
  assert.equal(X.PDF.codePointAt(0), 0x202C);
});

test('コードポイントを、見えない文字は略号、結合文字は点線の丸に付けて出す', () => {
  assert.deepEqual(X.describe(0x48), { code: 0x48, hex: 'U+0048', label: 'H', kind: 'char' });
  assert.deepEqual(X.describe(0x202E), { code: 0x202E, hex: 'U+202E', label: 'RLO', kind: 'bidi' });
  assert.deepEqual(X.describe(0x200D), { code: 0x200D, hex: 'U+200D', label: 'ZWJ', kind: 'invisible' });
  assert.deepEqual(X.describe(0x20), { code: 0x20, hex: 'U+0020', label: 'SP', kind: 'space' });
  assert.deepEqual(X.describe(0x0A), { code: 0x0A, hex: 'U+000A', label: 'LF', kind: 'space' });
  assert.deepEqual(X.describe(0x07), { code: 0x07, hex: 'U+0007', label: 'CTRL', kind: 'control' });
  assert.deepEqual(X.describe(0x301), { code: 0x301, hex: 'U+0301', label: cp(0x25CC, 0x301), kind: 'combining' });
  assert.equal(X.describe(0x1F468).hex, 'U+1F468');
});

test('一覧は先頭から決まった個数だけ出し、残りの数を返す', () => {
  const list = X.codePointList('a'.repeat(50));
  assert.equal(list.items.length, X.LIST_LIMIT);
  assert.equal(list.total, 50);
  assert.equal(list.more, 10);
  assert.deepEqual(X.codePointList('', 5), { items: [], total: 0, more: 0 });
});

test('表示だけの逆は、元の並びの前後に RLO と PDF を置く', () => {
  assert.equal(X.withOverride('abc'), `${RLO}abc${PDF}`);
});

test('RLO の画面での見え方（左から右の文字だけのとき）', () => {
  assert.deepEqual(X.overrideVisual(`invoice${RLO}fdp.exe`), { visual: 'invoiceexe.pdf', exact: true });
  assert.deepEqual(X.overrideVisual(`a${RLO}bc${PDF}d`), { visual: 'acbd', exact: true });
  assert.deepEqual(X.overrideVisual('plain'), { visual: 'plain', exact: true });
  // 見た目の1文字のまま並べ替える
  const family = cp(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);
  assert.equal(X.overrideVisual(`${RLO}${family}A`).visual, `A${family}`);
  // 右から左に書く文字があると、単純な並べ替えとブラウザーの表示は一致しないことがある
  assert.equal(X.overrideVisual(`${RLO}${cp(0x05D0)}b`).exact, false);
});

test('3つの「逆」の事実を計算で出す', () => {
  const r = X.compare('Hello');
  assert.equal(r.data.data, 'olleH');
  assert.equal(r.data.sameOrder, false);
  assert.equal(r.data.containsOriginal, false);
  assert.equal(r.data.addedCodePoints, 0);
  assert.equal(r.mirror.data, 'Hello');
  assert.equal(r.mirror.sameOrder, true);
  assert.equal(r.mirror.containsOriginal, true);
  assert.equal(r.rlo.data, `${RLO}Hello${PDF}`);
  assert.equal(r.rlo.sameOrder, false);
  assert.equal(r.rlo.containsOriginal, true, 'RLO の文字列は元の並びをそのまま含む');
  assert.equal(r.rlo.addedCodePoints, 2);
  assert.equal(r.rlo.shown, 'olleH', '見え方はデータの逆と同じ');
  assert.deepEqual(r.rlo.codePoints.items.map((i) => i.label), ['RLO', 'H', 'e', 'l', 'l', 'o', 'PDF']);
});

test('回文はデータの逆でも並びが変わらない（事実は書き決めず計算する）', () => {
  const r = X.compare('たけやぶやけた');
  assert.equal(r.data.sameOrder, true);
  assert.equal(r.data.containsOriginal, true);
});

test('空の入力', () => {
  const r = X.compare('');
  assert.equal(r.data.data, '');
  assert.equal(r.mirror.containsOriginal, false);
  assert.equal(r.rlo.data, `${RLO}${PDF}`);
});

test('拡張子を取り出す', () => {
  assert.equal(X.extensionOf('report.PDF'), 'pdf');
  assert.equal(X.extensionOf(`invoice${RLO}fdp.exe`), 'exe');
  assert.equal(X.extensionOf('README'), '');
  assert.equal(X.extensionOf('archive.tar.gz'), 'gz');
});

test('ファイル名の偽装の例: 中身は .exe、見え方は .pdf', () => {
  const s = X.spoofExample('invoice', 'pdf', 'exe');
  assert.equal(s.logical, `invoice${RLO}fdp.exe`);
  assert.equal(s.visual, 'invoiceexe.pdf');
  assert.equal(s.realExtension, 'exe');
  assert.equal(s.shownExtension, 'pdf');
  assert.equal(s.codePoints.items[7].label, 'RLO');
});

test('WeirdString Inspector へのリンクは # のあとに中身を置き、受け手の読み方で元に戻る', () => {
  const text = `invoice${RLO}fdp.exe`;
  const url = X.day023Link(text);
  assert.ok(url.startsWith('https://ipusiron.github.io/weirdstring-inspector/#text='));
  assert.ok(url.includes('%E2%80%AE'), 'RLO をパーセントエンコードしている');
  assert.ok(!url.includes(RLO), 'URL に生の RLO を入れない');
  // Day023 は URLSearchParams で # のあとを読む
  const params = new URLSearchParams(url.split('#')[1]);
  assert.equal(params.get('text'), text);
  assert.equal(params.get('source'), 'mirror-cipherlab');
  assert.equal(new URL(url).search, '', '中身を ? に置かない（サーバーへ送らない）');
});
