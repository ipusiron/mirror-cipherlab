import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { core, load, read } from './load.js';

const C = core();
const { EXAMPLES } = load('js/examples.js').MirrorExamples;
const README = read('README.md');
const ROOT_URL = new URL('../', import.meta.url);
const ROOT = fileURLToPath(ROOT_URL);
const byKey = (k) => EXAMPLES.find((e) => e.key === k);

/** 見出しで区切った節の本文（次の同じ深さ以上の見出しまで）。 */
function section(md, heading) {
  const start = md.indexOf(`\n${heading}\n`);
  assert.ok(start >= 0, `${heading} がない`);
  const level = heading.match(/^#+/)[0].length;
  const rest = md.slice(start + heading.length + 2);
  const next = rest.search(new RegExp(`\\n#{1,${level}} `));
  return next < 0 ? rest : rest.slice(0, next);
}

/** Markdown の表の本文の行を、セルの配列にする。 */
function tableRows(block) {
  return block.split('\n').filter((l) => l.startsWith('|') && !/^\|[-|]+\|$/.test(l))
    .slice(1).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()));
}

/** `…` の中身を取り出し、\n を改行に戻す。 */
const code = (cell) => cell.match(/`([^`]*)`/)[1].replace(/\\n/g, '\n');

/** 引用ブロック（> の行の続き）を、行を空白でつないで並べる。 */
function quotes(block) {
  const out = [];
  let cur = null;
  for (const line of block.split('\n')) {
    if (line.startsWith('> ')) {
      cur = cur === null ? line.slice(2) : `${cur} ${line.slice(2)}`;
    } else if (cur !== null) {
      out.push(cur);
      cur = null;
    }
  }
  if (cur !== null) out.push(cur);
  return out;
}

test('YAMLメタデータの構造と固定の値', () => {
  assert.ok(README.startsWith('<!--\n---\nid: day084\nslug: mirror-cipherlab\n'), '先頭の形が違う');
  const yaml = README.slice(0, README.indexOf('-->'));
  const keys = [...yaml.matchAll(/^([a-z_]+):/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
    'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub']);
  for (const k of ['category_ja', 'category_en', 'tags']) {
    assert.match(yaml, new RegExp(`\\n${k}:\\n  - `), `${k} がブロック形式でない`);
  }
  assert.match(yaml, /\nrepo_url: "https:\/\/github\.com\/ipusiron\/mirror-cipherlab"\n/);
  assert.match(yaml, /\ndemo_url: "https:\/\/ipusiron\.github\.io\/mirror-cipherlab\/"\n/);
  assert.match(yaml, /\nhub: true\n---\n$/);
});

test('シリーズ標準の前半と後半', () => {
  assert.match(README, /\n# Mirror CipherLab - ミラー系暗号化・難読化ツール\n/);
  assert.ok(README.includes('**Day084 - 生成AIで作るセキュリティツール100**'));
  const h2 = [...README.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(h2.slice(0, 2), ['🌐 デモページ', '📸 スクリーンショット']);
  assert.deepEqual(h2.slice(-4), ['📁 ディレクトリー構造', '💻 動作環境', '📄 ライセンス', '🛠️ このツールについて']);
  for (const h of h2) assert.match(h, /^\p{Extended_Pictographic}/u, `アイコンのない見出し: ${h}`);
  assert.ok(README.includes('[https://akademeia.info/?page_id=42163](https://akademeia.info/?page_id=42163)'));
});

test('Step 1 の表は、実装の出力と一致する', () => {
  const rows = tableRows(section(README, '### Step 1：並べ替え（中身が変わる）'));
  assert.equal(rows.length, C.MODES.length, '方式の数と行の数が違う');
  rows.forEach((cells, i) => {
    const mode = C.MODES[i];
    const out = C.transform(code(cells[2]), { mode, blockSize: 5 });
    assert.equal(out, code(cells[3]), `${cells[0]}（${mode}）`);
  });
});

test('組み合わせの表の「鏡に映すと」が、実装の判定と一致する', () => {
  const rows = tableRows(section(README, '### 組み合わせの説明'));
  assert.equal(rows.length, 6);
  const pairs = [['none', 'h'], ['none', 'v'], ['all', 'none'], ['all', 'h'], ['all', 'v'], ['eachWord', 'h']];
  rows.forEach((cells, i) => {
    const [mode, mirror] = pairs[i];
    const back = !cells[3].startsWith('戻らない');
    assert.equal(back, C.readableInMirror(mode, mirror), `${cells[0]}×${cells[1]}`);
  });
});

test('例1（キャロル）と例2（スウィフト）は、例文の文字列と実装の出力に一致する', () => {
  const q = quotes(section(README, '### 鏡文字暗号のバリエーション'));
  assert.equal(q.length, 5, '引用ブロックの数が違う');
  const carroll = byKey('carroll');
  assert.equal(q[0], carroll.text);
  assert.equal(q[1], C.transform(carroll.text, carroll));
  const swift = byKey('swift');
  assert.equal(q[2], swift.text);
  assert.equal(q[3], C.transform(swift.text, swift));
  assert.equal(q[4], "I'm an ass. O so I do in summer. O Tom, am I so dull, I a mad man?");
});

test('しくみの節の数値と例は、実装の値と一致する', () => {
  const family = String.fromCodePoint(0x1F468, 0x200D, 0x1F469, 0x200D, 0x1F467);
  const c = C.counts(family);
  assert.ok(README.includes(`見た目${c.graphemes}字・コードポイント${c.codePoints}・UTF-16の長さ${c.utf16}`));
  const once = C.reverseEachWord('世界で一番。');
  assert.ok(README.includes(`「世界で一番。」は「${once}」になり、これにもう一度かけても「${C.reverseEachWord(once)}」のまま`));
  assert.equal(C.reverseAll('たけやぶやけた'), 'たけやぶやけた');
});

test('README の画像はすべて実在し、assets/ の画像はすべて README から参照されている', () => {
  const refs = [...README.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]).filter((r) => !/^https?:/.test(r));
  assert.ok(refs.length >= 4);
  for (const r of refs) assert.ok(fs.existsSync(path.join(ROOT, r)), `${r} がない`);
  const pngs = fs.readdirSync(path.join(ROOT, 'assets')).filter((f) => f.endsWith('.png')).map((f) => `assets/${f}`);
  assert.deepEqual(pngs.filter((p) => !refs.includes(p)), [], 'README から参照されていない画像がある');
});

test('ディレクトリー構造に全ファイルが載り、全行に説明がある', () => {
  const tree = section(README, '## 📁 ディレクトリー構造').match(/```\n([\s\S]*?)\n```/)[1].split('\n');
  assert.equal(tree[0], 'mirror-cipherlab/');
  for (const line of tree.slice(1)) assert.match(line, /[─ ] \S+\/?\s+# \S/, `説明のない行: ${line}`);
  const listed = tree.slice(1).map((l) => l.replace(/^[│├└─\s]+/, '').split(/\s+#/)[0].trim());
  const files = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      if (['.git', '.claude', 'node_modules'].includes(name)) continue;
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) {
        files.push(`${name}/`);
        walk(full);
      } else {
        files.push(name);
      }
    }
  })(ROOT);
  const missing = files.filter((f) => !listed.includes(f));
  assert.deepEqual(missing, [], `ツリーにないファイル: ${missing.join(', ')}`);
});

test('README・画面の表記（シリーズの規則）', () => {
  const NG = [
    [/逆転値/, '「逆転置」と書く'],
    [/全て/, '「すべて」と書く'],
    [/(?<![一-鿿])分か(る|り|っ|ら)/, '理解の意味は「わかる」と書く'],
    [/既に/, '「すでに」と書く'],
    [/インターフェース/, '「インターフェイス」と書く'],
    [/(ヶ月|か月)/, '「カ月」と書く'],
    [/サーバ(?!ー)/, '「サーバー」と書く'],
    [/ユーザ(?!ー)/, '「ユーザー」と書く'],
    [/ブラウザ(?!ー)/, '「ブラウザー」と書く'],
    [/リポジトリ(?!ー)/, '「リポジトリー」と書く'],
    [/ディレクトリ(?!ー)/, '「ディレクトリー」と書く'],
    [/コンピュータ(?!ー)/, '「コンピューター」と書く']
  ];
  for (const f of ['README.md', 'CLAUDE.md', 'index.html', 'js/messages.js']) {
    const text = read(f);
    for (const [pattern, why] of NG) {
      const hit = text.match(pattern);
      assert.ok(!hit, `${f}: 「${hit && hit[0]}」 → ${why}`);
    }
  }
});

test('README の本文と画面の文言で、日本語と英数字の間に空白を入れない', () => {
  const jp = (a, b) => `${String.fromCodePoint(a)}-${String.fromCodePoint(b)}`;
  const JP = `[${jp(0x3040, 0x30ff)}${jp(0x4e00, 0x9fff)}${jp(0xff00, 0xffef)}]`;
  const SPACED = new RegExp(`${JP} [A-Za-z0-9]|[A-Za-z0-9] ${JP}`, 'u');
  const body = README.replace(/```[\s\S]*?```/g, '').split('\n')
    // シリーズ定型のライセンスの行は、リンクの前後に空白がある形のまま
    .filter((l) => !l.startsWith('MIT License – 詳細は'))
    .map((l) => l.replace(/`[^`]*`/g, 'CODE').replace(/\]\([^)]*\)/g, ']'));
  for (const line of body) assert.ok(!SPACED.test(line), `README に空白がある: ${line}`);
  const ja = load('js/messages.js').MirrorMessages.MESSAGES.ja;
  for (const [k, v] of Object.entries(ja)) assert.ok(!SPACED.test(v), `messages.js ${k}: ${v}`);
});

test('README の強調は節ごとに2か所まで、箇条書きの項目名を太字にしない', () => {
  for (const p of README.split(/\n## /)) {
    const n = (p.match(/\*\*[^*]+\*\*/g) || []).length;
    assert.ok(n <= 2, `${p.split('\n')[0]} の強調が ${n} か所`);
  }
  assert.ok(!/^\s*- \*\*/m.test(README), '箇条書きの先頭が太字');
});

test('README の見出しと番号つきの箇条書きの形', () => {
  for (const line of README.split('\n')) {
    assert.ok(!/^#{1,6}[^#\s]/.test(line), `見出しの # の後に空白がない: ${line}`);
    assert.ok(!/^\d+\.\S/.test(line), `番号の後に空白がない: ${line}`);
  }
});
