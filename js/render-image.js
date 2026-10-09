/**
 * MirrorRender - 表示中の文を PNG に描く。
 *
 * Step 2 の鏡像は CSS の変形なので、画像にはそのままでは入らない。
 * ここでは canvas に文字を描き直し、同じ変形を掛けてから書き出す。
 * 牛耕式のときは、逆向きの行だけを鏡像にする。
 *
 * 画面から呼ぶが、DOM には触れない（canvas は呼び出し側が渡す）。
 * js/mirror-core.js（MirrorCore）のあとに読み込む。
 */
(function (global) {
  'use strict';

  var Core = global.MirrorCore;

  /** 描くときの寸法（CSS ピクセル）。 */
  var FONT_SIZE = 28;
  var LINE_HEIGHT = 1.6;
  var PADDING = 24;
  var MIN_WIDTH = 320;
  var MAX_WIDTH = 2000;

  /** 画像に描ける行数・1行の文字数の上限（大きすぎる画像を作らない）。 */
  var MAX_LINES = 60;
  var MAX_CHARS_PER_LINE = 200;

  /** フォントの指定（画面の選択肢と同じ）。 */
  var FONT_STACK = {
    'system-ui': 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, "Noto Sans", sans-serif',
    serif: 'Georgia, "Times New Roman", Times, serif',
    monospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
  };

  /** 書き出す文を行に分け、上限で切る。 */
  function toLines(text) {
    var lines = String(text == null ? '' : text).split(/\r\n|\r|\n/);
    var limited = lines.slice(0, MAX_LINES).map(function (line) {
      var g = Core.graphemes(line);
      return g.length > MAX_CHARS_PER_LINE ? g.slice(0, MAX_CHARS_PER_LINE).join('') : line;
    });
    return {
      lines: limited,
      clipped: lines.length > MAX_LINES || lines.some(function (line) {
        return Core.graphemes(line).length > MAX_CHARS_PER_LINE;
      })
    };
  }

  /**
   * 各行に掛ける変形を決める。
   * 牛耕式は逆向きの行だけ、ほかの方式は全部の行に同じ変形を掛ける。
   * @returns {{h: boolean, v: boolean}[]} 行ごとの左右・上下の反転
   */
  function lineTransforms(text, mode, mirror) {
    var all = { h: mirror === 'h' || mirror === 'hv', v: mirror === 'v' || mirror === 'hv' };
    var lines = String(text == null ? '' : text).split(/\r\n|\r|\n/);
    if (mode !== 'boustrophedon') {
      return lines.map(function () { return { h: all.h, v: all.v }; });
    }
    var reversed = Core.reversedLines(text);
    return lines.map(function (line, i) {
      var on = reversed.indexOf(i) >= 0;
      return { h: on && all.h, v: on && all.v };
    });
  }

  /**
   * canvas に描いて、画像の寸法を返す。
   * @param {HTMLCanvasElement} canvas
   * @param {{text: string, mode: string, mirror: string, font: string, scale: number,
   *          background: string, color: string}} options
   */
  function draw(canvas, options) {
    var o = options || {};
    var scale = o.scale || 2;
    var ctx = canvas.getContext('2d');
    var font = FONT_STACK[o.font] ? o.font : 'system-ui';
    var cut = toLines(o.text);
    var lines = cut.lines.length ? cut.lines : [''];
    var transforms = lineTransforms(o.text, o.mode, o.mirror);

    // 文字の幅を測ってから、画像の大きさを決める
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = FONT_SIZE + 'px ' + FONT_STACK[font];
    var widest = 0;
    lines.forEach(function (line) {
      widest = Math.max(widest, ctx.measureText(line).width);
    });
    var lineHeight = Math.round(FONT_SIZE * LINE_HEIGHT);
    var width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.ceil(widest) + PADDING * 2));
    var height = lineHeight * lines.length + PADDING * 2;

    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = o.background || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = o.color || '#000000';
    ctx.font = FONT_SIZE + 'px ' + FONT_STACK[font];
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    lines.forEach(function (line, i) {
      var t = transforms[i] || { h: false, v: false };
      var y = PADDING + lineHeight * i + lineHeight / 2;
      ctx.save();
      // 行の中心を軸にして反転する（左右なら横に立てた鏡、上下なら水面と同じ見え方）
      ctx.translate(t.h ? width : 0, t.v ? y * 2 : 0);
      ctx.scale(t.h ? -1 : 1, t.v ? -1 : 1);
      ctx.fillText(line, PADDING, y);
      ctx.restore();
    });

    return { width: width, height: height, pixelWidth: canvas.width, pixelHeight: canvas.height, clipped: cut.clipped };
  }

  /** 保存するときのファイル名。 */
  function fileName(now) {
    var d = now || new Date();
    return 'mirror-cipherlab_' + d.toISOString().replace(/[:.]/g, '-') + '.png';
  }

  global.MirrorRender = {
    FONT_SIZE: FONT_SIZE,
    MAX_LINES: MAX_LINES,
    MAX_CHARS_PER_LINE: MAX_CHARS_PER_LINE,
    FONT_STACK: FONT_STACK,
    toLines: toLines,
    lineTransforms: lineTransforms,
    draw: draw,
    fileName: fileName
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
