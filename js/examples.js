/**
 * MirrorExamples - 「例文を入れる」の中身。
 *
 * 文と設定の組。en があれば英語の画面ではそちらを入れる。
 * 例文の出典は README の「鏡文字暗号のバリエーション」と「現実の例」に書く。
 */
(function (global) {
  'use strict';

  var cp = function () { return String.fromCodePoint.apply(null, arguments); };
  var Q = { l: cp(0x2018), r: cp(0x2019) };

  var EXAMPLES = [
    {
      // ジョナサン・スウィフトの作として伝わる「ラテン語もどき」。語ごとに綴りを逆にすると英語になる
      key: 'swift',
      text: 'Mi sana. Odioso ni mus rem. Moto ima os illud dama nam?',
      mode: 'eachWord',
      mirror: 'none',
      fixCase: true
    },
    {
      // ルイス・キャロルがネリー・ボウマンに宛てた手紙（1891年11月1日）の抜粋。Futility Closet（2012-01-06）の翻刻
      key: 'carroll',
      text: 'Uncle loving your! Instead grandson his to it give to had you that so, years 80 or 70 for it forgot'
        + ' you that was it pity a what and: him of fond so were you wonder don' + Q.r + 't I and, gentleman old nice very a'
        + ' was he. For it made you that him been have must it see you so: grandfather my was, then alive was that, '
        + Q.l + 'Dodgson Uncle' + Q.r + ' only the',
      mode: 'wordOrder',
      mirror: 'none',
      fixCase: true
    },
    {
      // 救急車の前面の鏡文字。並べ替えずに左右の鏡像で表示すると、鏡に映して読める
      key: 'ambulance',
      text: '救急',
      en: 'AMBULANCE',
      mode: 'none',
      mirror: 'h'
    },
    {
      // トラックの右側面は、進行方向から読めるように右から左へ書く（社名は架空）
      key: 'truck',
      text: 'ミラー運送',
      mode: 'all',
      mirror: 'none'
    },
    {
      // 見た目の1文字が複数のコードポイントでできている文字（家族の絵文字・国旗・結合アクセント・結合濁点）
      key: 'emoji',
      text: cp(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467) + ' ' + cp(0x1F1EF, 0x1F1F5, 0x1F1FA, 0x1F1F8)
        + ' Cafe' + cp(0x301) + ' ' + cp(0x304B, 0x3099, 0x304D),
      mode: 'all',
      mirror: 'none'
    },
    {
      // 牛耕式。偶数行だけ向きが変わる（Step 2 の左右の鏡像と組むと石碑と同じ見え方）
      key: 'ox',
      text: ['牛が畑を耕すように', '行ごとに向きを変えて', '文字を刻んでいきます', 'これが牛耕式です'].join('\n'),
      en: ['as an ox turns while plowing', 'the writing changes direction',
        'at the end of every line', 'this is boustrophedon'].join('\n'),
      mode: 'boustrophedon',
      mirror: 'h'
    },
    {
      // ブロックの中を逆にしてからブロックの並びも逆にすると、全文の逆順と同じになる
      key: 'double',
      text: 'ATTACKATDAWN',
      mode: 'blocksThenOrder',
      mirror: 'none',
      blockSize: 5
    }
  ];

  /** 言語に合わせて例文の文字列を選ぶ。 */
  function textOf(example, lang) {
    return lang === 'en' && example.en ? example.en : example.text;
  }

  global.MirrorExamples = { EXAMPLES: EXAMPLES, textOf: textOf };
})(typeof globalThis !== 'undefined' ? globalThis : this);
