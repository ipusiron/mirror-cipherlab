/**
 * MirrorCore - 並べ替え（Step 1）と共有URLの符号化。
 *
 * DOM に触れない純粋なロジックだけを置く。画面の処理は script.js が持つ。
 * 通常のスクリプトとして読み込むので、file:// でもそのまま動く。
 *
 * 文字は「見た目の1文字」（書記素クラスター）で数え、並べ替える。
 * コードポイントで切ると、結合文字・ZWJ でつないだ絵文字・国旗・
 * インド系の文字の部品が入れ替わって、別の文字になってしまう。
 */
(function (global) {
  'use strict';

  /** 入力の上限（UTF-16 の長さ。textarea の maxlength と同じ数え方）。 */
  var MAX_TEXT_LENGTH = 50000;

  /** 共有URLがこの長さを超えたら、一部のアプリで切れることを知らせる。 */
  var SHARE_WARN_LENGTH = 2000;

  /** 共有URLのハッシュとして受け付ける長さの上限（5万字の日本語でも収まる大きさ）。 */
  var MAX_HASH_LENGTH = 300000;

  /** ブロックの文字数の範囲と既定値。 */
  var BLOCK_MIN = 2;
  var BLOCK_MAX = 20;
  var BLOCK_DEFAULT = 5;

  /**
   * 並べ替えの方式。画面の選択肢と共有URLの r はこの値を使う。
   * none        並べ替えない
   * all         全文を逆順
   * eachWord    語ごとに綴りを逆順（記号と空白は位置を保つ）
   * wordOrder   語の並びを逆順（記号も1つの単位として並べ替える）
   * eachLine    行ごとに逆順（行の並びは保つ）
   * lineOrder   行の並びを逆順
   * eachSentence 文ごとに逆順（文の並びは保つ）
   * blocks      n 字ごとに区切り、ブロックの中で逆順
   * blocksThenOrder ブロックの中で逆順にしたうえで、ブロックの並びも逆順（二重化）
   * boustrophedon 牛耕式。偶数行（2行目・4行目…）だけを逆順にする
   */
  var MODES = ['none', 'all', 'eachWord', 'wordOrder', 'eachLine', 'lineOrder',
    'eachSentence', 'blocks', 'blocksThenOrder', 'boustrophedon'];

  /** ブロックの文字数を使う方式。 */
  var BLOCK_MODES = ['blocks', 'blocksThenOrder'];

  /** 字形の鏡像（Step 2）。CSS で見た目だけを変える。hv は180度の回転。 */
  var MIRRORS = ['none', 'h', 'v', 'hv'];

  /** プレビューのフォント。 */
  var FONTS = ['system-ui', 'serif', 'monospace'];

  /** 旧版の共有URLの値を読み替える。 */
  var LEGACY_MODES = { full: 'all', word: 'eachWord' };

  /** 語の区切りの辞書。CJK の辞書はロケールによらず使われるので、結果を固定するために決め打ちにする。 */
  var SEGMENT_LOCALE = 'ja';

  var hasSegmenter = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function';
  var segmenters = {};

  /**
   * Intl.Segmenter で区切る。
   * @param {string} text
   * @param {'grapheme'|'word'|'sentence'} granularity
   * @returns {{segment: string, isWordLike: boolean}[]}
   */
  function segment(text, granularity) {
    if (!segmenters[granularity]) {
      segmenters[granularity] = new Intl.Segmenter(SEGMENT_LOCALE, { granularity: granularity });
    }
    var out = [];
    var it = segmenters[granularity].segment(text);
    for (var s of it) out.push({ segment: s.segment, isWordLike: !!s.isWordLike });
    return out;
  }

  /** Intl.Segmenter がない環境で語を拾う正規表現（アポストロフィを含む語を1語とする）。 */
  var FALLBACK_WORD = /[\p{L}\p{M}\p{N}]+(?:['’][\p{L}\p{M}\p{N}]+)*/gu;

  /**
   * 見た目の1文字（書記素クラスター）の配列。
   * Intl.Segmenter がない環境ではコードポイントで代用する（画面に注記する）。
   */
  function graphemes(text) {
    if (!hasSegmenter) return Array.from(text);
    return segment(text, 'grapheme').map(function (s) { return s.segment; });
  }

  /** 語の区切り。{text, word} の配列（word=true が語、false が空白・記号）。 */
  function words(text) {
    if (hasSegmenter) {
      return segment(text, 'word').map(function (s) {
        return { text: s.segment, word: s.isWordLike };
      });
    }
    var out = [];
    var last = 0;
    text.replace(FALLBACK_WORD, function (m, offset) {
      if (offset > last) out.push({ text: text.slice(last, offset), word: false });
      out.push({ text: m, word: true });
      last = offset + m.length;
      return m;
    });
    if (last < text.length) out.push({ text: text.slice(last), word: false });
    return out;
  }

  /**
   * 文の終わりの記号。「文ごと」の区切りと、文頭の大文字の判定に使う。
   * Intl.Segmenter の文の区切り（UAX #29）は、小文字で始まる次の文を区切らない
   * （略語の「e.g. something」を1文にするための規則）。逆順にした文は小文字で
   * 始まることが多いので、ここでは記号だけで判定する。
   */
  var SENTENCE_END = '.!?…。！？';

  function hasSentenceEnd(text) {
    for (var i = 0; i < text.length; i++) {
      if (SENTENCE_END.indexOf(text.charAt(i)) >= 0) return true;
    }
    return false;
  }

  /** 文字数を3通りで数える。 */
  function counts(text) {
    return {
      graphemes: graphemes(text).length,
      codePoints: Array.from(text).length,
      utf16: text.length
    };
  }

  /** 全文を逆順にする。 */
  function reverseAll(text) {
    return graphemes(text).reverse().join('');
  }

  /** 語ごとに綴りを逆順にする。記号と空白は元の位置に残す。 */
  function reverseEachWord(text) {
    return words(text).map(function (w) {
      return w.word ? reverseAll(w.text) : w.text;
    }).join('');
  }

  /** 改行で区切る（CRLF・CR も1つの改行とみなす）。 */
  function splitLines(text) {
    return text.split(/\r\n|\r|\n/);
  }

  /** 行ごとに逆順にする（行の並びは保つ）。 */
  function reverseEachLine(text) {
    return splitLines(text).map(reverseAll).join('\n');
  }

  /** 行の並びを逆順にする（各行の中身は保つ）。 */
  function reverseLineOrder(text) {
    return splitLines(text).reverse().join('\n');
  }

  /**
   * 牛耕式（ブストロフェドン）。偶数行だけを逆順にする。
   * 牛が畑を耕すように、行ごとに書く向きを変える書き方である。
   * 古代ギリシャの石碑やエトルリア文字に見られ、逆向きの行は字形も鏡像で刻まれた
   * （字形の反転は Step 2 の役目なので、ここでは並びだけを変える）。
   */
  function boustrophedon(text) {
    return splitLines(text).map(function (line, i) {
      return i % 2 === 1 ? reverseAll(line) : line;
    }).join('\n');
  }

  /** 牛耕式で、向きが逆になる行（0 から数えた行番号）。画面はこの行だけ字形を鏡像にする。 */
  function reversedLines(text) {
    var out = [];
    splitLines(text).forEach(function (line, i) {
      if (i % 2 === 1) out.push(i);
    });
    return out;
  }

  /**
   * 文ごとに逆順にする。文末の記号と、そのあとの空白・改行は元の位置に残し、
   * 間の中身だけを逆順にする。区切りの位置が変わらないので、同じ操作を
   * もう一度かけると元に戻る。
   */
  function reverseEachSentence(text) {
    var g = graphemes(text);
    var n = g.length;
    var isSpace = g.map(function (c) { return /^\s+$/.test(c); });
    // 区切り＝文末の記号と改行
    var fixed = g.map(function (c, i) {
      return SENTENCE_END.indexOf(c) >= 0 || (isSpace[i] && /[\r\n]/.test(c));
    });
    // 区切りか文字列の端に接する空白の並びも区切りにする（中身の端に空白を残さない）
    for (var i = 0; i < n; i++) {
      if (!isSpace[i] || fixed[i]) continue;
      var j = i;
      while (j < n && isSpace[j] && !fixed[j]) j++;
      var touches = i === 0 || j === n || fixed[i - 1] || fixed[j];
      for (var k = i; k < j; k++) fixed[k] = touches;
      i = j - 1;
    }
    var out = [];
    var body = [];
    for (var p = 0; p < n; p++) {
      if (fixed[p]) {
        out.push.apply(out, body.reverse());
        body = [];
        out.push(g[p]);
      } else {
        body.push(g[p]);
      }
    }
    out.push.apply(out, body.reverse());
    return out.join('');
  }

  /** ブロックの文字数を範囲に収める。 */
  function clampBlockSize(n) {
    var v = Math.floor(Number(n));
    if (!isFinite(v)) return BLOCK_DEFAULT;
    return Math.min(BLOCK_MAX, Math.max(BLOCK_MIN, v));
  }

  /** n 字ずつのブロックに分ける（改行も1字と数える。最後のブロックは短くてよい）。 */
  function toBlocks(text, n) {
    var g = graphemes(text);
    var size = clampBlockSize(n);
    var blocks = [];
    for (var i = 0; i < g.length; i += size) blocks.push(g.slice(i, i + size));
    return blocks;
  }

  /** ブロックの中で逆順にする。 */
  function reverseBlocks(text, n) {
    return toBlocks(text, n).map(function (b) { return b.reverse().join(''); }).join('');
  }

  /**
   * ブロックの中で逆順にしたうえで、ブロックの並びも逆順にする。
   * 全体の逆順＝ブロックの並びの逆順×ブロックの中の逆順なので、
   * 端数のブロックがあってもなくても、結果は全文の逆順と同じになる。
   */
  function reverseBlocksThenOrder(text, n) {
    return toBlocks(text, n).map(function (b) { return b.reverse().join(''); }).reverse().join('');
  }

  /* ---------- 語の並びの逆順（記号も1つの単位として並べ替える） ---------- */

  /** 並びを逆にしたときに向きを入れ替える括弧（Unicode の双方向テキストの鏡像ペアと同じ考え方）。 */
  var MIRROR_PAIRS = {};
  [['(', ')'], ['[', ']'], ['{', '}'], ['<', '>'],
    ['“', '”'], ['‘', '’'],
    ['（', '）'], ['「', '」'], ['『', '』'],
    ['【', '】'], ['〈', '〉'], ['《', '》']
  ].forEach(function (p) {
    MIRROR_PAIRS[p[0]] = p[1];
    MIRROR_PAIRS[p[1]] = p[0];
  });

  /** 前の単位に付ける記号（前に空白を入れない）。1字ずつ調べる。 */
  var ATTACH_LEFT = ',.;:!?)]}>”’…、。！？）」』】〉》，．';

  /** 後ろの単位に付ける記号（後ろに空白を入れない）。 */
  var ATTACH_RIGHT = '([{<“‘（「『【〈《';

  /** 前後どちらにも空白を入れない記号（ハイフン・スラッシュ。U+2010・U+2011 も含む）。 */
  var JOINER = '-/' + String.fromCodePoint(0x2010, 0x2011);

  /** 開き・閉じが同じ形の引用符。出てくる順に開き・閉じを交互に当てる。 */
  var STRAIGHT_QUOTE = '"\'';

  /** 分かち書きをしない文字（漢字・かな）。 */
  var NO_SPACE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;

  /** この文字の前後には空白を入れない（漢字・かな・CJK の記号・全角の文字）。 */
  function isNoSpaceChar(ch) {
    if (!ch) return false;
    var c = ch.codePointAt(0);
    return NO_SPACE_SCRIPT.test(ch) || (c >= 0x3000 && c <= 0x303F) || (c >= 0xFF00 && c <= 0xFFEF);
  }

  function has(set, ch) {
    return ch.length > 0 && set.indexOf(ch) >= 0;
  }

  /**
   * 単位（語・記号・改行）に分ける。空白は区切りとして捨てるが、
   * 直前に空白があったかを gapBefore に残す（記号の規則が決めない間の空白を、並べ替えたあとも保つため）。
   * 改行を含む空白は「改行」の単位にする（並びと一緒に逆順になる）。
   */
  function tokenize(text) {
    var out = [];
    var parts = words(text);
    var gap = false;
    var isGap = function (p) { return !p || /^\s+$/.test(p.text); };
    parts.forEach(function (w, i) {
      if (w.word) {
        out.push({ type: 'word', text: w.text, gapBefore: gap });
        gap = false;
        return;
      }
      if (/^\s+$/.test(w.text)) {
        var breaks = (w.text.match(/\r\n|\r|\n/g) || []).length;
        if (breaks) {
          out.push({ type: 'break', text: new Array(breaks + 1).join('\n'), gapBefore: false });
          gap = false;
        } else {
          gap = true;
        }
        return;
      }
      // 空白を挟まずに続く記号は、1字ずつの単位にする
      var marks = graphemes(w.text);
      // ハイフン・スラッシュは、前後に空白がないときだけ語をつなぐ（「 - 」のダッシュは離して書く）
      var joined = marks.length === 1 && !isGap(parts[i - 1]) && !isGap(parts[i + 1]);
      marks.forEach(function (g) {
        if (/^\s+$/.test(g)) return;
        out.push({ type: 'punct', text: g, joined: joined, gapBefore: gap });
        gap = false;
      });
    });
    return out;
  }

  /**
   * 並べ替えた単位を文字列にする。間に空白を入れるかは次の順で決める。
   * 1. 改行の前後には入れない
   * 2. 前に付く記号（, . ! ? 閉じ括弧など）の前と、後ろに付く記号（開き括弧など）の後ろには入れない
   * 3. それ以外で記号の規則がかかわる間は、漢字・かなに接していなければ入れる
   * 4. 語・絵文字どうしの間は、元の文の同じ2つの間に空白があったときだけ入れる
   *    （並びを逆にしたので、出力で前にある単位の gapBefore が、元の2つの間の空白を表す）
   */
  function renderTokens(tokens) {
    var out = '';
    var prev = null;
    var quoteOpen = {};
    tokens.forEach(function (tk) {
      var attachLeft = false;
      var attachRight = false;
      var ruled = false;
      if (tk.type === 'punct') {
        if (has(STRAIGHT_QUOTE, tk.text)) {
          if (quoteOpen[tk.text]) attachLeft = true; else attachRight = true;
          quoteOpen[tk.text] = !quoteOpen[tk.text];
          ruled = true;
        } else if (has(JOINER, tk.text)) {
          attachLeft = !!tk.joined;
          attachRight = !!tk.joined;
          ruled = !!tk.joined;
        } else {
          attachLeft = has(ATTACH_LEFT, tk.text);
          attachRight = has(ATTACH_RIGHT, tk.text);
          ruled = attachLeft || attachRight;
        }
      }
      var chars = Array.from(tk.text);
      var space = false;
      if (prev === null || tk.type === 'break' || prev.type === 'break') {
        space = false;
      } else if (attachLeft || prev.attachRight) {
        space = false;
      } else if (ruled || prev.ruled) {
        space = !isNoSpaceChar(prev.lastChar) && !isNoSpaceChar(chars[0]);
      } else {
        space = prev.gapBefore;
      }
      if (space) out += ' ';
      out += tk.text;
      prev = {
        type: tk.type,
        attachRight: attachRight,
        ruled: ruled,
        gapBefore: tk.gapBefore,
        lastChar: chars[chars.length - 1]
      };
    });
    return out;
  }

  /**
   * 語の並びを逆順にする。キャロルの逆さ手紙と同じく、カンマ・コロン・引用符も
   * 1つの単位として並べ替え、前の語に付けて書く。括弧は向きを入れ替える。
   */
  function reverseWordOrder(text) {
    var tokens = tokenize(text).reverse().map(function (tk) {
      if (tk.type === 'punct' && MIRROR_PAIRS[tk.text]) {
        return { type: 'punct', text: MIRROR_PAIRS[tk.text], joined: tk.joined, gapBefore: tk.gapBefore };
      }
      return tk;
    });
    return renderTokens(tokens);
  }

  /* ---------- 文頭の大文字 ---------- */

  function isUpper(s) {
    return s !== s.toLowerCase() && s === s.toUpperCase();
  }

  /**
   * 各文の最初の語の位置（文字列の中の開始位置）を返す。
   * 文の始まり＝文字列の先頭と、文末の記号（SENTENCE_END）のあと。
   */
  function sentenceInitialWords(text) {
    var found = [];
    var pos = 0;
    var atStart = true;
    words(text).forEach(function (w) {
      if (w.word) {
        if (atStart) found.push({ index: pos, text: w.text });
        atStart = false;
      } else if (hasSentenceEnd(w.text)) {
        atStart = true;
      }
      pos += w.text.length;
    });
    return found;
  }

  /**
   * 文頭だから大文字になっている語を小文字にする。
   * 1字の語（I など）と、2字目以降にも大文字がある語（頭字語・固有の書き方）はそのままにする。
   */
  function lowerSentenceInitials(text) {
    return replaceInitials(text, function (g) {
      if (g.length < 2 || !isUpper(g[0])) return null;
      if (g.slice(1).some(isUpper)) return null;
      return g[0].toLowerCase();
    });
  }

  /** 各文の最初の語の1字目を大文字にする。 */
  function capitalizeSentenceStarts(text) {
    return replaceInitials(text, function (g) { return g[0].toUpperCase(); });
  }

  /**
   * 各文の最初の語の1字目を置き換える。change(書記素の配列) が null を返したら変えない。
   * 文字列の作り直しは最後の1回だけにする（5万字でも打鍵ごとに回せるように）。
   */
  function replaceInitials(text, change) {
    // 大文字・小文字のない文字だけの文（日本語など）は、語の区切りを調べるまでもない
    if (!/[\p{Lu}\p{Ll}]/u.test(text)) return text;
    var pieces = [];
    var last = 0;
    sentenceInitialWords(text).forEach(function (w) {
      var g = graphemes(w.text);
      var next = change(g);
      if (next === null || next === g[0]) return;
      pieces.push(text.slice(last, w.index), next);
      last = w.index + g[0].length;
    });
    pieces.push(text.slice(last));
    return pieces.join('');
  }

  /* ---------- まとめ ---------- */

  /**
   * Step 1 の並べ替え。
   * @param {string} text
   * @param {{mode?: string, blockSize?: number, fixCase?: boolean}} options
   * @returns {string}
   */
  function transform(text, options) {
    var o = options || {};
    var mode = MODES.indexOf(o.mode) >= 0 ? o.mode : 'all';
    var src = String(text == null ? '' : text);
    if (o.fixCase) src = lowerSentenceInitials(src);
    var out;
    switch (mode) {
      case 'none': out = src; break;
      case 'all': out = reverseAll(src); break;
      case 'eachWord': out = reverseEachWord(src); break;
      case 'wordOrder': out = reverseWordOrder(src); break;
      case 'eachLine': out = reverseEachLine(src); break;
      case 'lineOrder': out = reverseLineOrder(src); break;
      case 'eachSentence': out = reverseEachSentence(src); break;
      case 'blocks': out = reverseBlocks(src, o.blockSize); break;
      case 'blocksThenOrder': out = reverseBlocksThenOrder(src, o.blockSize); break;
      case 'boustrophedon': out = boustrophedon(src); break;
      default: out = src;
    }
    return o.fixCase ? capitalizeSentenceStarts(out) : out;
  }

  /**
   * Step 1 と Step 2 の組み合わせを、説明の種類に分ける。
   * 画面はこのキーで説明文と現実の例を引く。
   */
  function describeCombination(mode, mirror) {
    var m = MIRRORS.indexOf(mirror) >= 0 ? mirror : 'none';
    if (mode === 'boustrophedon') {
      // 牛耕式は、逆向きの行だけを鏡像にしたときに石碑の書き方と同じになる
      return m === 'h' ? 'oxTurning' : 'oxTurningPlain';
    }
    if (mode === 'none') {
      return { none: 'plain', h: 'mirrorWriting', v: 'waterReflection', hv: 'rotated' }[m];
    }
    if (mode === 'all' || mode === 'blocksThenOrder') {
      return { none: 'rightToLeft', h: 'glyphsOnly', v: 'reversedAndFlipped', hv: 'upsideDownOrder' }[m];
    }
    return m === 'none' ? 'dataOnly' : 'dataAndMirror';
  }

  /** 鏡（左右なら横に立てた鏡、上下なら下に置いた鏡）に映すと元の文が読めるか。 */
  function readableInMirror(mode, mirror) {
    return mode === 'none' && (mirror === 'h' || mirror === 'v');
  }

  /* ---------- 共有URL ---------- */

  function bytesToBase64Url(bytes) {
    var bin = '';
    var CHUNK = 0x8000;
    for (var i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
    }
    return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function base64UrlToBytes(s) {
    var b64 = s.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  /** 画面の状態を、共有URLのハッシュ（base64url の JSON）にする。 */
  function encodeShare(state) {
    var s = state || {};
    var payload = {
      t: String(s.text || ''),
      r: MODES.indexOf(s.mode) >= 0 ? s.mode : 'all',
      m: MIRRORS.indexOf(s.mirror) >= 0 ? s.mirror : 'none',
      f: FONTS.indexOf(s.font) >= 0 ? s.font : 'system-ui'
    };
    if (BLOCK_MODES.indexOf(payload.r) >= 0) payload.n = clampBlockSize(s.blockSize);
    if (s.fixCase) payload.c = 1;
    return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  }

  /**
   * 共有URLを組み立てる。base はページの URL（ハッシュは外す）。
   * location.origin は Firefox の file:// で "null" になるので使わない。
   */
  function shareUrl(base, state) {
    var url = String(base).split('#')[0] + '#' + encodeShare(state);
    return { url: url, length: url.length, warn: url.length > SHARE_WARN_LENGTH };
  }

  /**
   * 共有URLのハッシュを読む。
   * @returns {{ok: true, state: object} | {ok: false, error: 'empty'|'format'|'tooLong'|'invalid'}}
   */
  function decodeShare(hash) {
    var h = String(hash || '').replace(/^#/, '');
    if (!h) return { ok: false, error: 'empty' };
    if (h.length > MAX_HASH_LENGTH) return { ok: false, error: 'tooLong' };
    if (!/^[A-Za-z0-9_-]+$/.test(h)) return { ok: false, error: 'format' };
    var obj;
    try {
      var json = new TextDecoder('utf-8', { fatal: true }).decode(base64UrlToBytes(h));
      obj = JSON.parse(json);
    } catch (e) {
      return { ok: false, error: 'format' };
    }
    if (!obj || typeof obj !== 'object' || typeof obj.t !== 'string') {
      return { ok: false, error: 'invalid' };
    }
    if (obj.t.length > MAX_TEXT_LENGTH) return { ok: false, error: 'tooLong' };
    var mode = typeof obj.r === 'string' && LEGACY_MODES[obj.r] ? LEGACY_MODES[obj.r] : obj.r;
    return {
      ok: true,
      state: {
        text: obj.t,
        mode: MODES.indexOf(mode) >= 0 ? mode : 'all',
        mirror: MIRRORS.indexOf(obj.m) >= 0 ? obj.m : 'none',
        font: FONTS.indexOf(obj.f) >= 0 ? obj.f : 'system-ui',
        blockSize: obj.n === undefined ? BLOCK_DEFAULT : clampBlockSize(obj.n),
        fixCase: obj.c === 1 || obj.c === true
      }
    };
  }

  global.MirrorCore = {
    MAX_TEXT_LENGTH: MAX_TEXT_LENGTH,
    SHARE_WARN_LENGTH: SHARE_WARN_LENGTH,
    MAX_HASH_LENGTH: MAX_HASH_LENGTH,
    BLOCK_MIN: BLOCK_MIN,
    BLOCK_MAX: BLOCK_MAX,
    BLOCK_DEFAULT: BLOCK_DEFAULT,
    MODES: MODES,
    BLOCK_MODES: BLOCK_MODES,
    MIRRORS: MIRRORS,
    FONTS: FONTS,
    LEGACY_MODES: LEGACY_MODES,
    hasSegmenter: hasSegmenter,
    graphemes: graphemes,
    words: words,
    counts: counts,
    reverseAll: reverseAll,
    reverseEachWord: reverseEachWord,
    reverseEachLine: reverseEachLine,
    reverseLineOrder: reverseLineOrder,
    reverseEachSentence: reverseEachSentence,
    reverseBlocks: reverseBlocks,
    reverseBlocksThenOrder: reverseBlocksThenOrder,
    boustrophedon: boustrophedon,
    reversedLines: reversedLines,
    reverseWordOrder: reverseWordOrder,
    tokenize: tokenize,
    lowerSentenceInitials: lowerSentenceInitials,
    capitalizeSentenceStarts: capitalizeSentenceStarts,
    clampBlockSize: clampBlockSize,
    transform: transform,
    describeCombination: describeCombination,
    readableInMirror: readableInMirror,
    encodeShare: encodeShare,
    shareUrl: shareUrl,
    decodeShare: decodeShare
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
