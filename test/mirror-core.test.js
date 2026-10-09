import test from 'node:test';
import assert from 'node:assert/strict';
import { core } from './load.js';

const C = core();
const cp = (...codes) => String.fromCodePoint(...codes);
const hex = (s) => Array.from(s, (c) => c.codePointAt(0).toString(16));

// 見た目の1文字が複数のコードポイントでできている例
const FAMILY = cp(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);
const FLAGS_JP_US = cp(0x1F1EF, 0x1F1F5, 0x1F1FA, 0x1F1F8);
const CAFE = `Cafe${cp(0x301)}!`;
const GA_KI_NFD = cp(0x304B, 0x3099, 0x304D);
const NAMASTE = cp(0x928, 0x92E, 0x938, 0x94D, 0x924, 0x947);
const KEYCAP = `1${cp(0xFE0F, 0x20E3)}2`;

test('方式の一覧と既定値', () => {
  assert.deepEqual(C.MODES, ['none', 'all', 'eachWord', 'wordOrder', 'eachLine', 'lineOrder',
    'eachSentence', 'blocks', 'blocksThenOrder']);
  assert.deepEqual(C.MIRRORS, ['none', 'h', 'v']);
  assert.deepEqual(C.FONTS, ['system-ui', 'serif', 'monospace']);
  assert.equal(C.MAX_TEXT_LENGTH, 50000);
  assert.equal(C.SHARE_WARN_LENGTH, 2000);
  assert.equal(C.hasSegmenter, true, 'Node 22 には Intl.Segmenter がある');
});

test('全文の逆順は、見た目の1文字（書記素クラスター）の単位で並べ替える', () => {
  const cases = [
    [`${FAMILY}AB`, ['42', '41', '1f468', '200d', '1f469', '200d', '1f467']],
    [CAFE, ['21', '65', '301', '66', '61', '43']],
    [GA_KI_NFD, ['304d', '304b', '3099']],
    [FLAGS_JP_US, ['1f1fa', '1f1f8', '1f1ef', '1f1f5']],
    [NAMASTE, ['938', '94d', '924', '947', '92e', '928']],
    [KEYCAP, ['32', '31', 'fe0f', '20e3']],
    ['ab\r\ncd', ['64', '63', 'd', 'a', '62', '61']]
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(hex(C.reverseAll(input)), expected, JSON.stringify(input));
    assert.equal(C.reverseAll(C.reverseAll(input)), input, '2回で元に戻る');
  }
});

test('コードポイントで切ると壊れる（比較のための対照）', () => {
  // [...str].reverse() だと、国旗は別の組に、結合濁点は別の字に付く
  assert.notEqual([...FLAGS_JP_US].reverse().join(''), C.reverseAll(FLAGS_JP_US));
  assert.deepEqual(hex([...GA_KI_NFD].reverse().join('')), ['304d', '3099', '304b']);
});

test('文字数を3通りで数える', () => {
  assert.deepEqual(C.counts(`${FAMILY}AB`), { graphemes: 3, codePoints: 7, utf16: 10 });
  assert.deepEqual(C.counts('Hello world!'), { graphemes: 12, codePoints: 12, utf16: 12 });
  assert.deepEqual(C.counts(FLAGS_JP_US), { graphemes: 2, codePoints: 4, utf16: 8 });
  assert.deepEqual(C.counts(''), { graphemes: 0, codePoints: 0, utf16: 0 });
});

test('語ごとの逆順は、記号と空白を元の位置に残す', () => {
  assert.equal(C.reverseEachWord('Hello, world!'), 'olleH, dlrow!');
  assert.equal(C.reverseEachWord("don't stop"), "t'nod pots");
  assert.equal(C.reverseEachWord('鏡よ鏡、世界で一番。'), '鏡よ鏡、界世で番一。');
  assert.equal(C.reverseEachWord('  two  spaces '), '  owt  secaps ');
});

test('日本語の語ごとの逆順は、辞書で区切るので2回かけても戻らないことがある', () => {
  const once = C.reverseEachWord('世界で一番。');
  assert.equal(once, '界世で番一。');
  assert.notEqual(C.reverseEachWord(once), '世界で一番。');
});

test('README の例2（スウィフト）: 語ごとの逆順＋文頭の大文字', () => {
  const src = 'Mi sana. Odioso ni mus rem. Moto ima os illud dama nam?';
  assert.equal(C.transform(src, { mode: 'eachWord', fixCase: true }),
    'Im anas. Osoido in sum mer. Otom ami so dulli amad man?');
  // 大文字を整えないと、語の綴りだけが逆になる
  assert.equal(C.transform(src, { mode: 'eachWord' }),
    'iM anas. osoidO in sum mer. otoM ami so dulli amad man?');
});

// キャロルがネリー・ボウマンに宛てた手紙（1891年11月1日）の抜粋。Futility Closet（2012-01-06）の翻刻
const Q = { l: cp(0x2018), r: cp(0x2019) };
const CARROLL = 'Uncle loving your! Instead grandson his to it give to had you that so, years 80 or 70 for it forgot'
  + ' you that was it pity a what and: him of fond so were you wonder don' + Q.r + 't I and, gentleman old nice very a'
  + ' was he. For it made you that him been have must it see you so: grandfather my was, then alive was that, '
  + Q.l + 'Dodgson Uncle' + Q.r + ' only the';
const CARROLL_FORWARD = 'The only ' + Q.l + 'Uncle Dodgson' + Q.r + ', that was alive then, was my grandfather: so you see'
  + ' it must have been him that you made it for. He was a very nice old gentleman, and I don' + Q.r + 't wonder you'
  + ' were so fond of him: and what a pity it was that you forgot it for 70 or 80 years, so that you had to give it'
  + ' to his grandson instead! Your loving uncle';

test('README の例1（キャロル）: 語の並びの逆順＋文頭の大文字', () => {
  assert.equal(C.transform(CARROLL, { mode: 'wordOrder', fixCase: true }), CARROLL_FORWARD);
  // 正読文から逆にかけると、翻刻と1字も違わない
  assert.equal(C.transform(CARROLL_FORWARD, { mode: 'wordOrder', fixCase: true }), CARROLL);
});

test('語の並びの逆順: 記号は前の語に付け、括弧は向きを入れ替える', () => {
  assert.equal(C.reverseWordOrder('Hello (big) world - and/or "quoted text" here.'),
    '. here "text quoted" or/and - world (big) Hello');
  assert.equal(C.reverseWordOrder('鏡よ鏡、世界で一番美しいのは誰？（白雪姫）'),
    '（白雪姫）？誰はの美しい一番で世界、鏡よ鏡');
  assert.equal(C.reverseWordOrder('Line one.\nLine two!\n\nThird'), 'Third\n\n! two Line\n. one Line');
  // 空白を挟まずに並ぶ絵文字は、並べ替えたあとも続けて書く
  assert.equal(C.reverseWordOrder(`ok ${FLAGS_JP_US}`), `${cp(0x1F1FA, 0x1F1F8, 0x1F1EF, 0x1F1F5)} ok`);
});

test('行ごと・行の並び', () => {
  assert.equal(C.reverseEachLine('abc\ndef'), 'cba\nfed');
  assert.equal(C.reverseEachLine('ab\r\ncd'), 'ba\ndc');
  assert.equal(C.reverseLineOrder('1\n2\n3'), '3\n2\n1');
  assert.equal(C.reverseLineOrder('only'), 'only');
});

test('文ごとの逆順は、文末の記号と空白を元の位置に残す', () => {
  assert.equal(C.reverseEachSentence('Line one. Line two!'), 'eno eniL. owt eniL!');
  assert.equal(C.reverseEachSentence('鏡よ鏡。世界で一番。誰？'), '鏡よ鏡。番一で界世。誰？');
  assert.equal(C.reverseEachSentence(' lead. trail '), ' dael. liart ');
  assert.equal(C.reverseEachSentence('ab .c d'), 'ba .d c');
});

test('ブロックごとの逆順（端数のブロックも逆にする）', () => {
  assert.equal(C.reverseBlocks('ATTACKATDAWN', 3), 'TTAKCADTANWA');
  assert.equal(C.reverseBlocks('ATTACKATDAWN', 4), 'ATTATAKCNWAD');
  assert.equal(C.reverseBlocks('ATTACKATDAWN', 5), 'CATTAADTAKNW');
  assert.equal(C.reverseBlocks(`${FAMILY}AB`, 2), `A${FAMILY}B`);
});

test('ブロックの中の逆順＋ブロックの並びの逆順は、どのブロック長でも全文の逆順と同じ', () => {
  const texts = ['ATTACKATDAWN', 'Hello world!', `${FAMILY}${CAFE}${FLAGS_JP_US}`, '鏡よ鏡、世界で一番', 'a'];
  for (const t of texts) {
    for (let n = C.BLOCK_MIN; n <= C.BLOCK_MAX; n++) {
      assert.equal(C.reverseBlocksThenOrder(t, n), C.reverseAll(t), `${t} n=${n}`);
    }
  }
});

test('ブロックの文字数は2〜20に収める', () => {
  assert.equal(C.clampBlockSize(1), 2);
  assert.equal(C.clampBlockSize(21), 20);
  assert.equal(C.clampBlockSize(7.9), 7);
  assert.equal(C.clampBlockSize('x'), 5);
  assert.equal(C.clampBlockSize(undefined), 5);
});

test('どの方式も、同じ操作を2回かけると元に戻る（日本語の語ごとを除く）', () => {
  const samples = ['Hello, world! How are you?', 'Line one.\nLine two!', `Caf${cp(0x65, 0x301)} ${FAMILY} ${FLAGS_JP_US} ok`,
    '鏡よ鏡。世界で一番。', 'I said "yes" (twice) - then left.', 'e.g. the 3.14 rule; A/B test', ''];
  for (const mode of C.MODES) {
    for (const s of samples) {
      if (mode === 'eachWord' && s.startsWith('鏡')) continue;
      const once = C.transform(s, { mode, blockSize: 4 });
      assert.equal(C.transform(once, { mode, blockSize: 4 }), s, `${mode}: ${JSON.stringify(s)}`);
    }
  }
});

test('文頭の大文字を整える', () => {
  assert.equal(C.transform('Hello world!', { mode: 'all', fixCase: true }), '!Dlrow olleh');
  assert.equal(C.lowerSentenceInitials('The cat. I am. NASA is. A b.'), 'the cat. I am. NASA is. A b.');
  assert.equal(C.capitalizeSentenceStarts('one. two! three? four'), 'One. Two! Three? Four');
  // 大文字・小文字のない文は変えない
  assert.equal(C.transform('鏡よ鏡。', { mode: 'none', fixCase: true }), '鏡よ鏡。');
});

test('知らない方式は全文の逆順として扱う', () => {
  assert.equal(C.transform('abc', { mode: 'bogus' }), 'cba');
  assert.equal(C.transform(null, { mode: 'all' }), '');
});

test('組み合わせの種類と、鏡で読めるか', () => {
  assert.equal(C.describeCombination('none', 'none'), 'plain');
  assert.equal(C.describeCombination('none', 'h'), 'mirrorWriting');
  assert.equal(C.describeCombination('none', 'v'), 'waterReflection');
  assert.equal(C.describeCombination('all', 'none'), 'rightToLeft');
  assert.equal(C.describeCombination('all', 'h'), 'glyphsOnly');
  assert.equal(C.describeCombination('all', 'v'), 'reversedAndFlipped');
  assert.equal(C.describeCombination('blocksThenOrder', 'h'), 'glyphsOnly');
  assert.equal(C.describeCombination('eachWord', 'none'), 'dataOnly');
  assert.equal(C.describeCombination('eachWord', 'h'), 'dataAndMirror');
  assert.equal(C.readableInMirror('none', 'h'), true);
  assert.equal(C.readableInMirror('none', 'v'), true);
  assert.equal(C.readableInMirror('all', 'h'), false);
  assert.equal(C.readableInMirror('eachWord', 'h'), false);
});
