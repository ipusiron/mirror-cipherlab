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
      'share.copied': '共有URLをコピーしました（{length}字）。',
      'share.long': '共有URLが{length}字あります。2,000字を超えると、一部のアプリやメールで途中で切れることがあります。',
      'share.failed': '共有URLをコピーできませんでした。',
      'share.loaded': '共有URLの内容を読み込みました',
      'share.tooLong': '共有URLの文字列が上限の50,000字を超えているため、読み込みませんでした',
      'share.format': '共有URLの形式が正しくないため、読み込みませんでした',
      'share.urlLabel': '共有URL（コピーできないときは、ここから選んでコピーします）',

      'compare.heading': '🔁 3つの「逆」を比べる',
      'compare.lead': '入力した文を、データの逆・見た目の鏡像・表示だけの逆の3通りで並べます。見え方が似ていても、コピーや検索で扱われる中身は違います。',
      'compare.empty': '入力欄に文を入れると、3つの「逆」を比べられます。',
      'compare.sample': '比べているのは、入力の先頭{n}字です。',
      'compare.data.title': 'データの逆（Step 1）',
      'compare.data.sub': '文字の並びそのものを逆にする',
      'compare.mirror.title': '見た目の鏡像（Step 2）',
      'compare.mirror.sub': 'CSSで字形だけを左右反転する',
      'compare.rlo.title': '表示だけの逆（RLO）',
      'compare.rlo.sub': '制御文字U+202Eで、表示の向きだけを変える',
      'fact.order': '元の文字の並び',
      'fact.kept': '保たれる',
      'fact.changed': '変わる',
      'fact.search': '元の文での検索',
      'fact.found': '見つかる',
      'fact.notFound': '見つからない',
      'fact.added': '増えた見えない文字',
      'fact.addedCount': '{n}個',
      'fact.copy': 'コピーすると',
      'copy.data': '並べ替えた文字列になる',
      'copy.mirror': '元の文字列のまま（鏡像はコピーされない）',
      'copy.rlo': '見えない制御文字ごと、元の並びでコピーされる',
      'compare.cpCaption': 'コードポイント（先頭{shown}個／全{total}個）',
      'compare.inspect': 'この文字列をWeirdString Inspectorで調べる',
      'compare.note': 'RLOは文字の並びを変えずに表示だけを逆にするため、画面に見える文字と、検索・保存で扱われる文字が食い違います。この食い違いは悪用の対象として知られており（MITRE ATT&CK T1036.002）、受け取った文字列を調べるときの着眼点になります。',

      'notes.summary': '💡 学習メモ',
      'notes.data': 'Step 1の並べ替えは文字列そのもの（データ）を変えます。Step 2の鏡像はCSSの変形で見た目だけを変え、データは変わりません。',
      'notes.grapheme': '並べ替えは見た目の1文字（書記素クラスター）の単位で行います。コードポイントの単位で逆にすると、絵文字・結合文字・国旗が壊れます。',
      'notes.strength': '鍵がないので、方式を知っていれば誰でも元に戻せます。暗号としての強さはなく、難読化の一種です。',
      'notes.rlo': '表示だけを逆向きにする制御文字（U+202E、RLO）は、ファイル名の偽装に悪用されます（MITRE ATT&CK T1036.002）。本ツールは文字の並びそのものを変えるので、RLOとは別物です。',
      'notes.rendering': '右から左に書く文字や結合文字は、ブラウザーやフォントによって表示が変わることがあります。',
      'footer.label': '🔗 GitHubリポジトリー：'
    },
    en: {
      'app.title': 'Mirror CipherLab - Mirror Cipher and Obfuscation Lab',
      'app.subtitle': 'Experience reverse transposition (reversing the order of characters) combined with mirrored glyphs',

      'lang.toggle': '日本語',
      'lang.toggleLabel': 'Switch to Japanese',
      'theme.toLight': 'Switch to light mode',
      'theme.toDark': 'Switch to dark mode',

      'input.heading': '📝 Input',
      'input.label': 'Text to transform',
      'input.placeholder': 'Type text here (e.g.) Welcome to Mirror CipherLab!',
      'input.counts': 'Visible characters: {graphemes} / Code points: {codePoints} / UTF-16 length: {utf16}',
      'input.split': 'Some visible characters are made of several code points. Reversing by code point would break them.',
      'input.limit': 'Input is limited to 50,000 characters (UTF-16 length).',
      'input.noSegmenter': 'This browser has no Intl.Segmenter, so text is processed by code point. Emoji and combining marks may break.',
      'example.label': 'Load an example',
      'example.placeholder': 'Choose an example…',
      'example.swift': 'Swift\'s mock Latin (reverse each word)',
      'example.carroll': 'Carroll\'s backwards letter (reverse word order)',
      'example.ambulance': 'Ambulance front (read it in a mirror)',
      'example.truck': 'Japanese truck lettering (right to left)',
      'example.emoji': 'Emoji and combining marks (whole visible characters)',
      'example.double': 'Double block reversal (same as reversing everything)',
      'btn.clear': 'Clear',
      'btn.copyInput': 'Copy input',

      'flow.realtime': 'Live conversion',
      'flow.result': 'Result',

      'controls.heading': '⚙️ Settings',
      'control.reversal': 'Reorder (changes the text)',
      'control.mirror': 'Mirror the glyphs (display only)',
      'control.font': 'Font',
      'control.blockSize': 'Block size (2-20)',
      'control.fixCase': 'Fix capitals at sentence starts (English etc.)',
      'control.fixCaseHint': 'Lowercases words that were capitalized only because they started a sentence, then capitalizes the new sentence starts. '
        + 'Proper nouns are not detected.',
      'control.involution': 'Every mode restores the original when applied again with the same settings (except "each word" on Japanese).',
      'step.one': 'Step 1',
      'step.two': 'Step 2',

      'mode.none': 'No reordering',
      'mode.all': 'Reverse the whole text',
      'mode.eachWord': 'Reverse each word',
      'mode.wordOrder': 'Reverse the word order',
      'mode.eachLine': 'Reverse each line',
      'mode.lineOrder': 'Reverse the line order',
      'mode.eachSentence': 'Reverse each sentence',
      'mode.blocks': 'Reverse each block',
      'mode.blocksThenOrder': 'Reverse each block, then the block order (double)',
      'hint.none': 'Leaves the text as it is. Use it to try only the Step 2 mirror.',
      'hint.all': 'Reads the whole text from the end. Emoji and combining marks move as whole visible characters.',
      'hint.eachWord': 'Reverses the spelling of each word and keeps word order, punctuation and spaces in place. Japanese is split into words with '
        + 'a dictionary, so applying it again may not restore the original.',
      'hint.wordOrder': 'Reverses the order of words. Commas and quotation marks are reordered as units and attached to the preceding word, and '
        + 'brackets are flipped (the way Carroll wrote his backwards letters).',
      'hint.eachLine': 'Reverses each line and keeps the order of lines.',
      'hint.lineOrder': 'Reverses the order of lines and keeps each line as it is.',
      'hint.eachSentence': 'Keeps sentence-ending marks (. ! ? and their Japanese forms) and spaces in place and reverses the text of each sentence.',
      'hint.blocks': 'Splits the text into blocks of {n} characters and reverses each block. Line breaks and spaces count as characters.',
      'hint.blocksThenOrder': 'Reverses each block, then the order of the blocks. The result is exactly the same as reversing the whole text, so '
        + 'doubling adds no strength.',

      'mirror.none': 'No mirror',
      'mirror.h': 'Horizontal mirror',
      'mirror.v': 'Vertical mirror',
      'font.system-ui': 'System UI',
      'font.serif': 'Serif',
      'font.monospace': 'Monospace',

      'output.heading': '✨ Output',
      'output.step1': 'Reordered text (copied and saved)',
      'output.step2': 'Mirrored display (display only)',
      'output.copyNote': 'Copy and save use the Step 1 reordered text. The Step 2 mirror only changes the display with CSS, so copied text is in the '
        + 'normal orientation.',
      'btn.copyOutput': 'Copy result',
      'btn.download': 'Save as text',
      'btn.share': 'Copy share URL',

      'combo.heading': 'This combination',
      'combo.mirrorYes': 'A mirror turns it back into the original text',
      'combo.mirrorNo': 'A mirror does not turn it back into the original text',
      'combo.plain.title': 'The original text',
      'combo.plain.text': 'Neither reordered nor mirrored.',
      'combo.mirrorWriting.title': 'Mirror writing (readable in a mirror)',
      'combo.mirrorWriting.text': 'Both the order and the glyphs are flipped left to right, as in a mirror. This is how the word on the front of an '
        + 'ambulance is written so that drivers ahead can read it in the rear-view mirror, and how Leonardo da Vinci wrote his notebooks.',
      'combo.waterReflection.title': 'Reflection in water',
      'combo.waterReflection.text': 'Only flipped upside down. A mirror placed below the text turns it back into the original.',
      'combo.rightToLeft.title': 'Read from right to left',
      'combo.rightToLeft.text': 'The glyphs are unchanged and only the order is reversed, like the company name on the right side of Japanese '
        + 'trucks, written right to left so that it reads from front to back.',
      'combo.glyphsOnly.title': 'Original order, flipped glyphs',
      'combo.glyphsOnly.text': 'Showing reversed text with a horizontal mirror restores the order and flips each glyph. It looks like a row of the '
        + 'hidari-uma ("left horse") charm from Tendo, Japan, where the single kanji for horse is written mirrored.',
      'combo.reversedAndFlipped.title': 'Reversed and flipped upside down',
      'combo.reversedAndFlipped.text': 'The order is reversed and the text is flipped upside down. It matches neither a mirror nor a reflection in '
        + 'water, and it is not a 180-degree rotation (flipping both ways) either.',
      'combo.dataOnly.title': 'Only the text is reordered',
      'combo.dataOnly.text': 'Step 1 changes the order of the characters (the data). This result is what gets copied and saved.',
      'combo.dataAndMirror.title': 'Reordered text shown mirrored',
      'combo.dataAndMirror.text': 'Step 1 changes the text and the Step 2 mirror only changes its display. Copying takes the Step 1 result; the '
        + 'mirror is not copied.',

      'toast.copied': 'Copied',
      'toast.copyFailed': 'Could not copy',
      'share.copied': 'Share URL copied ({length} characters)',
      'share.long': 'The share URL is {length} characters long. Some apps and mail clients cut URLs longer than 2,000 characters.',
      'share.failed': 'Could not copy the share URL',
      'share.loaded': 'Loaded the text and settings from the share URL',
      'share.tooLong': 'The text in the share URL exceeds the 50,000-character limit, so it was not loaded',
      'share.format': 'The share URL is malformed, so it was not loaded',
      'share.urlLabel': 'Share URL (select and copy it here if copying failed)',

      'compare.heading': '🔁 Three kinds of reversal',
      'compare.lead': 'Shows your text as reversed data, a mirrored look and a display-only reversal. They can look alike, but copying and searching '
        + 'handle different contents.',
      'compare.empty': 'Type text in the input to compare the three kinds of reversal.',
      'compare.sample': 'Comparing the first {n} characters of the input.',
      'compare.data.title': 'Reversed data (Step 1)',
      'compare.data.sub': 'Reverses the order of the characters themselves',
      'compare.mirror.title': 'Mirrored look (Step 2)',
      'compare.mirror.sub': 'Flips only the glyphs with CSS',
      'compare.rlo.title': 'Display-only reversal (RLO)',
      'compare.rlo.sub': 'The control character U+202E changes only the direction of display',
      'fact.order': 'Order of the original characters',
      'fact.kept': 'kept',
      'fact.changed': 'changed',
      'fact.search': 'Searching for the original text',
      'fact.found': 'finds it',
      'fact.notFound': 'does not find it',
      'fact.added': 'Invisible characters added',
      'fact.addedCount': '{n}',
      'fact.copy': 'Copying gives',
      'copy.data': 'the reordered string',
      'copy.mirror': 'the original string (the mirror is not copied)',
      'copy.rlo': 'the original order, including the invisible control characters',
      'compare.cpCaption': 'Code points (first {shown} of {total})',
      'compare.inspect': 'Inspect this string in WeirdString Inspector',
      'compare.note': 'RLO reverses only the display without changing the order of the characters, so the characters you see differ from the ones '
        + 'used in searching and saving. This gap is known to be abused (MITRE ATT&CK T1036.002) and is worth checking in strings you receive.',

      'notes.summary': '💡 Notes',
      'notes.data': 'Step 1 changes the string itself (the data). The Step 2 mirror only changes its appearance with a CSS transform; the data stays the same.',
      'notes.grapheme': 'Reordering works on visible characters (grapheme clusters). Reversing by code point breaks emoji, combining marks and flags.',
      'notes.strength': 'There is no key, so anyone who knows the method can undo it. It offers no cryptographic strength; it is a form of obfuscation.',
      'notes.rlo': 'The control character that only reverses the display (U+202E, RLO) is abused to disguise file names (MITRE ATT&CK T1036.002). '
        + 'This tool changes the order of the characters themselves, which is a different thing.',
      'notes.rendering': 'Right-to-left scripts and combining marks may look different depending on the browser and font.',
      'footer.label': '🔗 GitHub repository: '
    }
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
