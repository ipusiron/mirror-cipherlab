/**
 * MirrorSolver - 並べ替えられた文を受け取り、どの方式だったかを当てる。
 *
 * 鍵がないので、全方式（ブロックは長さ2〜20）の逆をかけ、戻した文の「文らしさ」で並べる。
 * 文らしさは、文字の2連（バイグラム）の対数確率の平均で測る（js/lang-model.js）。
 *
 * js/mirror-core.js と js/lang-model.js のあとに読み込む。
 */
(function (global) {
  'use strict';

  var Core = global.MirrorCore;
  var Model = global.MirrorLangModel;

  /** 点数を出すのに要る、最低限の文字数。これに満たないと判定は当てにならない。 */
  var MIN_LENGTH = 12;

  /** 候補として並べる上限。 */
  var TOP_N = 5;

  /** 日本語と判定する、かな・漢字の割合。 */
  var JA_RATIO = 0.2;

  /** どの方式も当てはまらないとき（＝並べ替えていない）の名前。 */
  var IDENTITY = 'none';

  function isKana(ch) {
    return (ch >= 'ぁ' && ch <= 'ゟ') || (ch >= '゠' && ch <= 'ヿ');
  }

  function isKanji(ch) {
    return ch >= '一' && ch <= '鿿';
  }

  /** 日本語の文字（かな・漢字）の割合で、使う統計を決める。 */
  function detectLanguage(text) {
    var ja = 0;
    var letters = 0;
    for (var ch of String(text || '')) {
      if (isKana(ch) || isKanji(ch)) {
        ja++;
        letters++;
      } else if (/[A-Za-z]/.test(ch)) {
        letters++;
      }
    }
    if (!letters) return 'en';
    return ja / letters >= JA_RATIO ? 'ja' : 'en';
  }

  /** 英語の統計に合わせて、小文字の a-z と空白だけにする。 */
  function normalizeEn(text) {
    return String(text || '').normalize('NFKC').toLowerCase()
      .replace(/[^a-z]+/g, ' ').replace(/ +/g, ' ').trim();
  }

  /**
   * 日本語の統計に合わせて、かな・読点と句点を残す。
   * よく出る漢字はそのまま、ほかの漢字は1つの印にまとめる（統計を作ったときと同じ扱い）。
   */
  function normalizeJa(text) {
    var out = '';
    for (var ch of String(text || '').normalize('NFKC')) {
      if (isKana(ch) || Model.ja.punct.indexOf(ch) >= 0) out += ch;
      else if (isKanji(ch)) out += Model.ja.kanji.indexOf(ch) >= 0 ? ch : Model.KANJI_MARK;
    }
    return out;
  }

  /** 英語でよく出る語の集合（最初に引かれたときに作る）。 */
  var wordSet = null;
  function commonWords() {
    if (!wordSet) {
      wordSet = Object.create(null);
      Model.en.words.split(' ').forEach(function (w) { wordSet[w] = true; });
    }
    return wordSet;
  }

  /** 語として読めるか。よく出る語に当たった文字数の割合（0〜1）。 */
  function wordCoverage(text) {
    var words = commonWords();
    var hit = 0;
    var total = 0;
    normalizeEn(text).split(' ').forEach(function (w) {
      if (w.length < 2) return;
      total += w.length;
      if (words[w]) hit += w.length;
    });
    return total ? hit / total : 0;
  }

  /** 語として読める割合を、2連の点数と足せる重みにする。 */
  var WORD_WEIGHT = 4;

  /**
   * 文字の連なりの対数確率の平均（0に近いほど、その言語の文らしい）。
   * 連なりの長さは統計に合わせる（英語は4文字、日本語は3文字）。
   */
  function ngramScore(text, lang) {
    var model = lang === 'ja' ? Model.ja : Model.en;
    var s = lang === 'ja' ? normalizeJa(text) : normalizeEn(text);
    var n = model.n;
    if (s.length < n) return null;
    var sum = 0;
    for (var i = 0; i + n <= s.length; i++) {
      var v = model.table[s.slice(i, i + n)];
      sum += v === undefined ? model.floor : v;
    }
    return sum / (s.length - n + 1);
  }

  /**
   * 文らしさ。英語は、2連の点数に「語として読める割合」を足す。
   * 文字が足りないときは null。
   */
  function score(text, lang) {
    var base = ngramScore(text, lang);
    if (base === null) return null;
    return lang === 'ja' ? base : base + WORD_WEIGHT * wordCoverage(text);
  }

  /** 試す方式の一覧（ブロックは長さごとに別の候補として数える）。 */
  function candidates() {
    var list = [];
    for (var i = 0; i < Core.MODES.length; i++) {
      var mode = Core.MODES[i];
      if (mode === IDENTITY) continue;
      if (Core.BLOCK_MODES.indexOf(mode) >= 0) {
        for (var n = Core.BLOCK_MIN; n <= Core.BLOCK_MAX; n++) list.push({ mode: mode, blockSize: n });
      } else {
        list.push({ mode: mode, blockSize: Core.BLOCK_DEFAULT });
      }
    }
    return list;
  }

  /**
   * どの方式だったかを当てる。
   * @param {string} text 並べ替えられた文
   * @param {{lang?: string, topN?: number, fixCase?: boolean}} options
   * @returns {{lang: string, enough: boolean, length: number, baseline: number|null,
   *            results: {mode: string, blockSize: number, text: string, score: number,
   *                      gain: number, sameAsInput: boolean}[]}}
   */
  function solve(text, options) {
    var o = options || {};
    var src = String(text || '');
    var lang = o.lang === 'ja' || o.lang === 'en' ? o.lang : detectLanguage(src);
    var topN = o.topN || TOP_N;
    var baseline = score(src, lang);
    var seen = Object.create(null);
    var results = [];
    candidates().forEach(function (c) {
      // 並べ替えはどれも対合なので、同じ方式をもう一度かければ元に戻る
      var restored = Core.transform(src, { mode: c.mode, blockSize: c.blockSize, fixCase: !!o.fixCase });
      // 同じ文に戻る方式は、この文では見分けがつかない。1つにまとめて「ほかの方式」に並べる
      if (seen[restored] !== undefined) {
        seen[restored].also.push({ mode: c.mode, blockSize: c.blockSize });
        return;
      }
      var value = score(restored, lang);
      if (value === null) return;
      var entry = {
        mode: c.mode,
        blockSize: c.blockSize,
        text: restored,
        score: value,
        gain: baseline === null ? 0 : value - baseline,
        sameAsInput: restored === src,
        also: []
      };
      seen[restored] = entry;
      results.push(entry);
    });
    results.sort(function (a, b) { return b.score - a.score; });
    return {
      lang: lang,
      enough: Array.from(src).length >= MIN_LENGTH,
      length: Array.from(src).length,
      baseline: baseline,
      results: results.slice(0, topN)
    };
  }

  /**
   * 1位が「並べ替えていない」より良くなければ、そもそも並べ替えられていないと見る。
   * @returns {{mode: string, blockSize: number}|null} null は「見分けがつかない」
   */
  function bestGuess(solved) {
    var top = solved.results[0];
    if (!top || !solved.enough) return null;
    if (solved.baseline !== null && top.score <= solved.baseline) return null;
    return { mode: top.mode, blockSize: top.blockSize };
  }

  global.MirrorSolver = {
    MIN_LENGTH: MIN_LENGTH,
    TOP_N: TOP_N,
    JA_RATIO: JA_RATIO,
    detectLanguage: detectLanguage,
    normalizeEn: normalizeEn,
    normalizeJa: normalizeJa,
    wordCoverage: wordCoverage,
    ngramScore: ngramScore,
    score: score,
    candidates: candidates,
    solve: solve,
    bestGuess: bestGuess
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
