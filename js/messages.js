/**
 * MirrorMessages - 画面の文言の辞書。
 *
 * 画面は data-i18n などの属性でキーを引き、script.js が状態から作る文も
 * 「キー＋差し込む値」で持つ。言語を切り替えたら、計算し直さずに描き直す。
 */
(function (global) {
  'use strict';

  var LANGUAGES = ['ja', 'en'];

  var MESSAGES = {
    ja: {
      'app.title': 'Mirror CipherLab - ミラー系暗号化・難読化ツール',
      'app.subtitle': '文字の並びを逆にする「逆転置」と、字形を鏡に映す「鏡像表示」を組み合わせて体験する',

      'lang.toggle': 'English',
      'lang.toggleLabel': '英語に切り替える',
      'theme.toLight': 'ライトモードに切り替える',
      'theme.toDark': 'ダークモードに切り替える',

      'input.heading': '📝 入力',
      'input.label': '入力する文',
      'input.placeholder': 'ここに文を入力します（例）Mirror CipherLabへようこそ！',
      'input.counts': '見た目の文字数：{graphemes}／コードポイント数：{codePoints}／UTF-16の長さ：{utf16}',
      'input.split': '見た目の1文字が複数のコードポイントでできている文字があります。コードポイントの単位で逆にすると、その文字は壊れます。',
      'input.limit': '入力の上限は50,000字（UTF-16の長さ）です。',
      'input.noSegmenter': 'このブラウザーにはIntl.Segmenterがないため、コードポイントの単位で処理しています。絵文字や結合文字は崩れることがあります。',
      'example.label': '例文を入れる',
      'example.placeholder': '例文を選ぶ…',
      'example.swift': 'スウィフトの逆さラテン語（語ごとに綴りを逆順）',
      'example.carroll': 'キャロルの逆さ手紙（語の並びを逆順）',
      'example.ambulance': '救急車の前面（鏡に映して読む）',
      'example.truck': 'トラックの右側面（右から左へ）',
      'example.emoji': '絵文字と結合文字（見た目の1文字の単位）',
      'example.double': 'ブロックの二重化（全文の逆順と同じになる）',
      'btn.clear': 'クリア',
      'btn.copyInput': '入力をコピー',

      'flow.realtime': 'リアルタイム変換',
      'flow.result': '処理結果',

      'controls.heading': '⚙️ 変換の設定',
      'control.reversal': '並べ替え（中身が変わる）',
      'control.mirror': '字形の鏡像（見た目だけ）',
      'control.font': 'フォント',
      'control.blockSize': 'ブロックの文字数（2〜20）',
      'control.fixCase': '文頭の大文字を整える（英語など）',
      'control.fixCaseHint': '文頭だったために大文字になっていた語を小文字にし、並べ替えたあとの文頭を大文字にします。固有名詞は区別しません。',
      'control.involution': 'どの方式も、同じ設定でもう一度かけると元に戻ります（日本語の「語ごと」を除く）。',
      'step.one': 'Step 1',
      'step.two': 'Step 2',

      'mode.none': '並べ替えない',
      'mode.all': '全文を逆順',
      'mode.eachWord': '語ごとに綴りを逆順',
      'mode.wordOrder': '語の並びを逆順',
      'mode.eachLine': '行ごとに逆順',
      'mode.lineOrder': '行の並びを逆順',
      'mode.eachSentence': '文ごとに逆順',
      'mode.blocks': 'ブロックごとに逆順',
      'mode.blocksThenOrder': 'ブロックごとに逆順＋ブロックの並びも逆順（二重化）',
      'hint.none': '並べ替えません。Step 2の鏡像だけを試すときに使います。',
      'hint.all': '全体を後ろから読む並びにします。絵文字や結合文字は、見た目の1文字のまま動かします。',
      'hint.eachWord': '語の綴りだけを逆にし、語の並び・記号・空白は元の位置に残します。日本語は辞書で語を区切るので、逆にした文にもう一度かけても元に戻らないことがあります。',
      'hint.wordOrder': '語の並びを逆にします。カンマや引用符も1つの単位として並べ替えて前の語に付け、括弧は向きを入れ替えます（キャロルの逆さ手紙と同じ書き方）。',
      'hint.eachLine': '行の並びは保ったまま、各行を逆順にします。',
      'hint.lineOrder': '各行の中身は保ったまま、行の並びを逆にします。',
      'hint.eachSentence': '文末の記号（。．！？など）と空白は元の位置に残し、文の中身を逆順にします。',
      'hint.blocks': '{n}字ずつのブロックに区切り、ブロックの中だけを逆順にします。改行や空白も1字と数えます。',
      'hint.blocksThenOrder': 'ブロックの中を逆順にしてから、ブロックの並びも逆にします。結果は全文の逆順とまったく同じになり、二重にしても強くなりません。',

      'mirror.none': '鏡像なし',
      'mirror.h': '左右の鏡像',
      'mirror.v': '上下の鏡像',
      'font.system-ui': 'システムUI',
      'font.serif': 'セリフ体',
      'font.monospace': '等幅',

      'output.heading': '✨ 出力',
      'output.step1': '並べ替えの結果（コピー・保存の対象）',
      'output.step2': '鏡像の表示（見た目だけ）',
      'output.copyNote': 'コピーと保存の対象はStep 1の並べ替えの結果です。Step 2の鏡像はCSSで見た目を変えているだけなので、コピーしても普通の向きの文字になります。',
      'btn.copyOutput': '結果をコピー',
      'btn.download': 'テキストで保存',
      'btn.share': '共有URLをコピー',

      'combo.heading': 'この組み合わせ',
      'combo.mirrorYes': '鏡に映すと元の文に戻ります',
      'combo.mirrorNo': '鏡に映しても元の文には戻りません',
      'combo.plain.title': '元の文のまま',
      'combo.plain.text': '並べ替えも鏡像もしていません。',
      'combo.mirrorWriting.title': '鏡文字（鏡に映すと読める）',
      'combo.mirrorWriting.text': '並びも字形も左右が逆になった、鏡に映した文字です。救急車の前面の「急救」（前の車のルームミラーで正しく読める）や、レオナルド・ダ・ヴィンチの手稿と同じ見え方です。',
      'combo.waterReflection.title': '水面に映した文字',
      'combo.waterReflection.text': '上下だけを反転しています。文の下に鏡を置くと元の文に戻ります。',
      'combo.rightToLeft.title': '右から左へ読む並び',
      'combo.rightToLeft.text': '字形はそのままで、並びだけが逆です。トラックの右側面の社名（進行方向から読めるように右から書く）と同じ並べ方です。',
      'combo.glyphsOnly.title': '並びは元どおり、字形だけが反転',
      'combo.glyphsOnly.text': '逆順にした並びを左右の鏡像で表示すると、並びは元に戻り、1字ずつの形だけが反転します。「馬」の字を1字だけ左右反転した左馬（天童の将棋の駒の縁起物）を並べたような見え方です。',
      'combo.reversedAndFlipped.title': '逆順を上下に反転',
      'combo.reversedAndFlipped.text': '並びを逆にしたうえで上下を反転しています。鏡にも水面にも当てはまらない見え方で、180度の回転（上下と左右の両方の反転）とも違います。',
      'combo.dataOnly.title': '中身だけを並べ替え',
      'combo.dataOnly.text': 'Step 1で文字の並び（データ）が変わっています。コピー・保存されるのはこの結果です。',
      'combo.dataAndMirror.title': '並べ替えた中身を鏡像で表示',
      'combo.dataAndMirror.text': 'Step 1の並べ替えは中身を変え、Step 2の鏡像は見た目だけを変えます。コピーされるのはStep 1の結果で、鏡像はコピーされません。',

      'toast.copied': 'コピーしました',
      'toast.copyFailed': 'コピーできませんでした',
      'share.copied': '共有URLをコピーしました（{length}字）',
      'share.long': '共有URLが{length}字あります。2,000字を超えると、一部のアプリやメールで途中で切れることがあります。',
      'share.failed': '共有URLをコピーできませんでした',
      'share.loaded': '共有URLの内容を読み込みました',
      'share.tooLong': '共有URLの文字列が上限の50,000字を超えているため、読み込みませんでした',
      'share.format': '共有URLの形式が正しくないため、読み込みませんでした',

      'notes.summary': '💡 学習メモ',
      'notes.data': 'Step 1の並べ替えは文字列そのもの（データ）を変えます。Step 2の鏡像はCSSの変形で見た目だけを変え、データは変わりません。',
      'notes.grapheme': '並べ替えは見た目の1文字（書記素クラスター）の単位で行います。コードポイントの単位で逆にすると、絵文字・結合文字・国旗が壊れます。',
      'notes.strength': '鍵がないので、方式を知っていれば誰でも元に戻せます。暗号としての強さはなく、難読化の一種です。',
      'notes.rlo': '表示だけを逆向きにする制御文字（U+202E、RLO）は、ファイル名の偽装に悪用されます（MITRE ATT&CK T1036.002）。本ツールは文字の並びそのものを変えるので、RLOとは別物です。',
      'notes.rendering': '右から左に書く文字や結合文字は、ブラウザーやフォントによって表示が変わることがあります。',
      'footer.label': '🔗 GitHubリポジトリー：'
    },
    en: {}
  };

  /** {name} の印に値を差し込む。 */
  function format(text, vars) {
    return text.replace(/\{(\w+)\}/g, function (m, name) {
      return vars && Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m;
    });
  }

  /** 文言を引く。その言語にないキーは日本語で代用し、日本語にもなければキーを返す。 */
  function t(lang, key, vars) {
    var table = MESSAGES[lang] || MESSAGES.ja;
    var text = Object.prototype.hasOwnProperty.call(table, key) ? table[key] : MESSAGES.ja[key];
    return text === undefined ? key : format(text, vars);
  }

  global.MirrorMessages = { LANGUAGES: LANGUAGES, MESSAGES: MESSAGES, format: format, t: t };
})(typeof globalThis !== 'undefined' ? globalThis : this);
