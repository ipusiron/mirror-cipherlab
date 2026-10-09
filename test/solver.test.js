import test from 'node:test';
import assert from 'node:assert/strict';
import { core, load } from './load.js';

const C = core();
load('js/lang-model.js');
const S = load('js/solver.js').MirrorSolver;
const Model = globalThis.MirrorLangModel;

const EN = 'the quick brown fox jumps over the lazy dog and then sleeps by the warm fire';
const JA = '鏡よ鏡、世界で一番美しいのは誰ですか。わたしはその答えを知りたいのです。'
  + '昨日の夜からずっと考えていましたが、どうしてもわかりませんでした。'
  + '朝になって窓を開けると、小さな鳥が席の近くまで飛んできて、しばらく歌ってから帰っていきました。';

test('統計は英語と日本語の2つで、生成物の形がそろっている', () => {
  assert.ok(Object.keys(Model.en.table).length > 300);
  assert.ok(Object.keys(Model.ja.table).length > 1000);
  assert.ok(Model.en.floor < 0 && Model.ja.floor < 0);
  assert.equal(Model.CODE.length, 64);
  assert.equal(Model.KANJI_MARK, String.fromCodePoint(0x3005));
  assert.ok(Model.ja.kanji.length >= 100, 'そのまま数える漢字がある');
  assert.ok(Model.en.words.split(' ').length >= 1000, 'よく出る語がある');
});

test('言語を自動で見分ける', () => {
  assert.equal(S.detectLanguage(EN), 'en');
  assert.equal(S.detectLanguage(JA), 'ja');
  assert.equal(S.detectLanguage(C.reverseAll(JA)), 'ja', '並べ替えても文字の種類は変わらない');
  assert.equal(S.detectLanguage(''), 'en');
  assert.equal(S.detectLanguage('12345!!!'), 'en');
});

test('統計に合わせて文字をそろえる', () => {
  assert.equal(S.normalizeEn('The Quick, Brown FOX!'), 'the quick brown fox');
  const ja = S.normalizeJa('鏡よ、Hello 世界。');
  assert.ok(!/[A-Za-z]/.test(ja), '英字は落とす');
  assert.ok(ja.includes('よ') && ja.includes('。'));
});

test('文らしい文のほうが、並べ替えた文より点数が高い', () => {
  for (const [text, lang] of [[EN, 'en'], [JA, 'ja']]) {
    const plain = S.score(text, lang);
    const reversed = S.score(C.reverseAll(text), lang);
    assert.ok(plain > reversed, `${lang}: ${plain} > ${reversed}`);
  }
});

test('英語は「語として読めるか」も見る', () => {
  assert.ok(S.wordCoverage(EN) > 0.6, String(S.wordCoverage(EN)));
  assert.ok(S.wordCoverage(C.reverseAll(EN)) < 0.2);
  assert.equal(S.wordCoverage(''), 0);
  assert.notEqual(S.score(EN, 'en'), S.ngramScore(EN, 'en'));
  assert.equal(S.score(JA, 'ja'), S.ngramScore(JA, 'ja'), '日本語は2連だけで見る');
});

test('候補はブロックの長さごとに数え、並べ替えないものは含めない', () => {
  const list = S.candidates();
  const blockCount = (C.BLOCK_MAX - C.BLOCK_MIN + 1) * C.BLOCK_MODES.length;
  assert.equal(list.length, C.MODES.length - 1 - C.BLOCK_MODES.length + blockCount);
  assert.ok(!list.some((c) => c.mode === 'none'));
});

test('全文を逆にした英文から、元の文を1位で取り戻す', () => {
  const solved = S.solve(C.reverseAll(EN));
  assert.equal(solved.lang, 'en');
  assert.equal(solved.enough, true);
  assert.equal(solved.results[0].text, EN);
  assert.ok(solved.results[0].gain > 0, '元の入力より文らしくなっている');
  assert.deepEqual(S.bestGuess(solved), { mode: 'all', blockSize: C.BLOCK_DEFAULT });
});

test('ブロックごとに逆にした文から、ブロックの長さまで当てる', () => {
  const solved = S.solve(C.transform(EN, { mode: 'blocks', blockSize: 7 }));
  assert.equal(solved.results[0].text, EN);
  assert.deepEqual(S.bestGuess(solved), { mode: 'blocks', blockSize: 7 });
});

test('同じ文に戻る方式は1つにまとめ、ほかの方式として並べる', () => {
  const solved = S.solve(C.reverseAll(EN));
  const names = solved.results[0].also.map((a) => a.mode);
  // 改行のない文では「行ごと」は全文と同じ。二重化は常に全文と同じ
  assert.ok(names.includes('eachLine'), names.join(','));
  assert.ok(names.includes('blocksThenOrder'), names.join(','));
});

test('候補の数は上限までで、点数の高い順に並ぶ', () => {
  const solved = S.solve(C.reverseAll(EN), { topN: 3 });
  assert.equal(solved.results.length, 3);
  for (let i = 1; i < solved.results.length; i++) {
    assert.ok(solved.results[i - 1].score >= solved.results[i].score);
  }
});

test('短すぎる文は「当てにならない」と返す', () => {
  const solved = S.solve('abc');
  assert.equal(solved.enough, false);
  assert.equal(solved.length, 3);
  assert.equal(S.bestGuess(solved), null);
});

test('並べ替えていない文は、1位でも元の入力を超えないので見分けがつかないと返す', () => {
  const solved = S.solve(EN);
  assert.equal(S.bestGuess(solved), null);
  assert.ok(solved.results.some((r) => r.sameAsInput), '入力と同じ候補が出る');
});

test('日本語も、全文を逆にした文から元の文を候補に出す', () => {
  const solved = S.solve(C.reverseAll(JA));
  assert.equal(solved.lang, 'ja');
  // 文ごとの逆をかけた文も「文らしい」ので、正解が1位とは限らない（README の「解読の精度」）
  const rank = solved.results.findIndex((r) => r.text === JA);
  assert.ok(rank >= 0 && rank < 3, `正解が ${rank + 1} 位`);
});

test('言語を指定できる', () => {
  assert.equal(S.solve(EN, { lang: 'ja' }).lang, 'ja');
  assert.equal(S.solve(JA, { lang: 'en' }).lang, 'en');
  assert.equal(S.solve(EN, { lang: 'bogus' }).lang, 'en', '知らない指定は自動で選ぶ');
});

test('空の入力でも落ちない', () => {
  const solved = S.solve('');
  assert.equal(solved.length, 0);
  assert.equal(solved.enough, false);
});
