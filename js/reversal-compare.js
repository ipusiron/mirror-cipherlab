/**
 * MirrorCompare - 3つの「逆」を比べる計算部（DOM に触れない）。
 *
 * 1. データの逆      Step 1 の全文の逆順。文字の並び（データ）が変わる
 * 2. 見た目の鏡像    Step 2 の CSS の変形。データは変わらず、見た目だけが変わる
 * 3. 表示だけの逆    制御文字 RLO（U+202E）。データは元の並びのまま、表示だけが逆になる
 *                    （見た目と中身が食い違うので、悪用の対象として知られる。MITRE ATT&CK T1036.002）
 *
 * js/mirror-core.js（MirrorCore）のあとに読み込む。
 * 見えない制御文字はソースに直接書かず、コードポイントから組み立てる。
 */
(function (global) {
  'use strict';

  var Core = global.MirrorCore;
  var cp = function () { return String.fromCodePoint.apply(null, arguments); };

  var RLO = cp(0x202E);
  var PDF = cp(0x202C);

  /** コードポイントの一覧で、先頭から見せる個数。 */
  var LIST_LIMIT = 40;

  /** WeirdString Inspector（Day023）の公開 URL と、送り元の名前。 */
  var DAY023_URL = 'https://ipusiron.github.io/weirdstring-inspector/';
  var SOURCE = 'mirror-cipherlab';

  /** 見えない文字・制御文字の略号。 */
  var NAMES = {
    0x0009: 'TAB', 0x000A: 'LF', 0x000D: 'CR', 0x0020: 'SP', 0x00A0: 'NBSP', 0x00AD: 'SHY',
    0x061C: 'ALM', 0x200B: 'ZWSP', 0x200C: 'ZWNJ', 0x200D: 'ZWJ', 0x200E: 'LRM', 0x200F: 'RLM',
    0x202A: 'LRE', 0x202B: 'RLE', 0x202C: 'PDF', 0x202D: 'LRO', 0x202E: 'RLO',
    0x2060: 'WJ', 0x2066: 'LRI', 0x2067: 'RLI', 0x2068: 'FSI', 0x2069: 'PDI',
    0x3000: 'IDSP', 0xFE0E: 'VS15', 0xFE0F: 'VS16', 0xFEFF: 'BOM'
  };

  /** 双方向テキストの制御文字（表示の向きを変える）。 */
  var BIDI = [0x061C, 0x200E, 0x200F, 0x202A, 0x202B, 0x202C, 0x202D, 0x202E, 0x2066, 0x2067, 0x2068, 0x2069];

  function hex(code) {
    var h = code.toString(16).toUpperCase();
    while (h.length < 4) h = '0' + h;
    return 'U+' + h;
  }

  /**
   * コードポイント1つを、画面に出せる形にする。
   * 見えない文字は略号（RLO・ZWJ など）、結合文字は点線の丸（U+25CC）に付けて見せる。
   */
  function describe(code) {
    var ch = String.fromCodePoint(code);
    var kind = 'char';
    var label = ch;
    if (BIDI.indexOf(code) >= 0) {
      kind = 'bidi';
      label = NAMES[code];
    } else if (NAMES[code]) {
      kind = /\s/.test(ch) ? 'space' : 'invisible';
      label = NAMES[code];
    } else if (code < 0x20 || (code >= 0x7F && code < 0xA0)) {
      kind = 'control';
      label = 'CTRL';
    } else if (/\p{M}/u.test(ch)) {
      kind = 'combining';
      label = cp(0x25CC) + ch;
    }
    return { code: code, hex: hex(code), label: label, kind: kind };
  }

  /** 文字列のコードポイントの一覧（先頭から limit 個）と、全体の個数。 */
  function codePointList(text, limit) {
    var all = Array.from(String(text || ''));
    var n = limit === undefined ? LIST_LIMIT : limit;
    return {
      items: all.slice(0, n).map(function (c) { return describe(c.codePointAt(0)); }),
      total: all.length,
      more: Math.max(0, all.length - n)
    };
  }

  /** 表示だけを逆にした文字列（先頭に RLO、末尾に PDF を置く）。 */
  function withOverride(text) {
    return RLO + String(text || '') + PDF;
  }

  /** 双方向テキストの制御文字や、右から左に書く文字（ヘブライ文字・アラビア文字など）を含むか。 */
  function hasBidiContent(text) {
    return Array.from(String(text || '')).some(function (c) {
      return BIDI.indexOf(c.codePointAt(0)) >= 0 || /[\p{Script=Hebrew}\p{Script=Arabic}\p{Script=Syriac}\p{Script=Thaana}]/u.test(c);
    });
  }

  /**
   * RLO から PDF（なければ文字列の終わり）までを左右逆に並べた、画面での見え方。
   * 左から右に書く文字だけの文字列で、RLO が入れ子になっていないときに正しい
   * （exact が false のときは、ブラウザーの表示と食い違うことがある）。
   */
  function overrideVisual(text) {
    var s = String(text || '');
    var out = [];
    var i = 0;
    var exact = true;
    while (i < s.length) {
      var at = s.indexOf(RLO, i);
      if (at < 0) {
        out.push(s.slice(i));
        break;
      }
      out.push(s.slice(i, at));
      var end = s.indexOf(PDF, at + 1);
      var inner = end < 0 ? s.slice(at + 1) : s.slice(at + 1, end);
      if (hasBidiContent(inner)) exact = false;
      out.push(Core.reverseAll(inner));
      i = end < 0 ? s.length : end + 1;
    }
    var visual = out.join('');
    if (hasBidiContent(visual)) exact = false;
    return { visual: visual, exact: exact };
  }

  /** 双方向テキストの制御文字を取り除く（元の文字の並びを保っているかを見るため）。 */
  function stripBidi(text) {
    return Array.from(String(text || '')).filter(function (c) {
      return BIDI.indexOf(c.codePointAt(0)) < 0;
    }).join('');
  }

  /** 3つの「逆」を並べる。それぞれの事実は計算で出す（書き決めない）。 */
  function compare(text) {
    var src = String(text || '');
    var reversed = Core.reverseAll(src);
    var override = withOverride(src);
    function facts(data, shown) {
      return {
        data: data,
        shown: shown,
        sameOrder: data === src,
        orderKept: stripBidi(data) === src,
        containsOriginal: src.length > 0 && data.indexOf(src) >= 0,
        addedCodePoints: Array.from(data).length - Array.from(src).length,
        codePoints: codePointList(data)
      };
    }
    return {
      source: src,
      data: facts(reversed, reversed),
      mirror: facts(src, src),
      rlo: facts(override, overrideVisual(override).visual)
    };
  }

  /**
   * WeirdString Inspector へ渡す URL。中身は # のあとに置くので、サーバーへは送られない。
   * 受け手は読み込んだあと、URL から中身を消す（Day023 の仕様）。
   */
  function day023Link(text) {
    return DAY023_URL + '#text=' + encodeURIComponent(String(text || '')) + '&source=' + SOURCE;
  }

  global.MirrorCompare = {
    RLO: RLO,
    PDF: PDF,
    LIST_LIMIT: LIST_LIMIT,
    DAY023_URL: DAY023_URL,
    SOURCE: SOURCE,
    describe: describe,
    codePointList: codePointList,
    withOverride: withOverride,
    hasBidiContent: hasBidiContent,
    stripBidi: stripBidi,
    overrideVisual: overrideVisual,
    compare: compare,
    day023Link: day023Link
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
