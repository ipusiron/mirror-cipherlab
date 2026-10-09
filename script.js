/* Mirror CipherLab - 画面の処理
   - Step 1 の並べ替えと共有URLの符号化: js/mirror-core.js（MirrorCore）
   - 画面の文言: js/messages.js（MirrorMessages）
   - 例文: js/examples.js（MirrorExamples）
   - Step 2 の鏡像は CSS のクラスで見た目だけを変える
   - すべてブラウザーの中で処理し、外部へは送らない
*/
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const Core = window.MirrorCore;
  const Msg = window.MirrorMessages;
  const Examples = window.MirrorExamples;
  const Compare = window.MirrorCompare;
  const Solver = window.MirrorSolver;

  /** 入力がこの長さを超えたら、打鍵ごとではなく少し待ってから変換する。 */
  const DEBOUNCE_LENGTH = 5000;
  const DEBOUNCE_MS = 150;

  let lang = "ja";
  const t = (key, vars) => Msg.t(lang, key, vars);

  const themeToggle = $("#themeToggle");
  const themeIcon = $("#themeIcon");
  const langToggle = $("#langToggle");

  const elInput = $("#input");
  const elExample = $("#example");
  const elReversal = $("#reversal");
  const elBlockControl = $("#blockControl");
  const elBlockSize = $("#blockSize");
  const elFixCase = $("#fixCase");
  const elMirror = $("#mirror");
  const elFont = $("#font");
  const elStepRev = $("#stepReversed");
  const elStepMir = $("#stepMirrored");
  const elCounts = $("#inputCounts");
  const elSplit = $("#inputSplit");
  const elNoSegmenter = $("#noSegmenter");
  const elReversalHint = $("#reversalHint");
  const elComboTitle = $("#comboTitle");
  const elComboText = $("#comboText");
  const elComboMirror = $("#comboMirror");
  const elShareStatus = $("#shareStatus");
  const elShareBox = $("#shareBox");
  const elShareUrl = $("#shareUrl");
  const elCompareEmpty = $("#compareEmpty");
  const elCompareSample = $("#compareSample");
  const elCmpRloLink = $("#cmpRloLink");

  const elSolveInput = $("#solveInput");
  const elSolveLang = $("#solveLang");
  const elSolveStatus = $("#solveStatus");
  const elSolveResults = $("#solveResults");
  const btnSolveFromOutput = $("#btnSolveFromOutput");
  const btnSolveClear = $("#btnSolveClear");

  /** 比較のカード3枚の要素（データの逆・見た目の鏡像・表示だけの逆）。 */
  const compareCards = {};
  for (const [name, id] of [["data", "Data"], ["mirror", "Mirror"], ["rlo", "Rlo"]]) {
    compareCards[name] = {
      render: $(`#cmp${id}Render`),
      facts: $(`#cmp${id}Facts`),
      caption: $(`#cmp${id}CpCaption`),
      cps: $(`#cmp${id}Cps`)
    };
  }

  const btnClear = $("#btnClear");
  const btnCopyIn = $("#btnCopyIn");
  const btnCopyOut = $("#btnCopyOut");
  const btnDownload = $("#btnDownload");
  const btnShare = $("#btnShare");

  const toast = $("#toast");

  /** Step 1 の結果。コピーと保存はこれを使う（鏡像は見た目だけなので含めない）。 */
  let lastResult = "";

  // ---------- 文言 ----------

  /** data-i18n などの属性が指すキーで、画面の文言を入れ直す。 */
  function applyI18n() {
    document.documentElement.lang = lang;
    document.title = t("app.title");
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    document.querySelectorAll("[data-i18n-label]").forEach((el) => {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-label")));
    });
  }

  // ---------- 保存（localStorage が使えない環境でも止めない） ----------

  const THEME_STORAGE_KEY = "theme";
  const LANG_STORAGE_KEY = "lang";

  /** localStorage の読み書きを包む。プライベートモードやストレージの拒否で例外が出ても止めない。 */
  function withStorage(action, fallback) {
    try {
      return action(window.localStorage);
    } catch (e) {
      return fallback;
    }
  }

  // ---------- 言語 ----------

  /** 言語は、URL の ?lang= → 保存した選択 → ブラウザーの言語（日本語以外は英語）の順で決める。 */
  function initialLang() {
    const m = location.search.match(/[?&]lang=([a-zA-Z-]+)/);
    const asked = m ? m[1].toLowerCase() : "";
    if (Msg.LANGUAGES.includes(asked)) return asked;
    const saved = withStorage((s) => s.getItem(LANG_STORAGE_KEY), null);
    if (Msg.LANGUAGES.includes(saved)) return saved;
    const nav = (navigator.language || "").toLowerCase();
    return nav.startsWith("ja") ? "ja" : "en";
  }

  /**
   * 言語を切り替える。計算し直さずに、文言と状態から作る文だけを描き直す
   * （入力欄・並べ替えの結果・共有URLの欄は言語によらないのでそのまま）。
   */
  function setLang(next, save) {
    lang = next;
    if (save) withStorage((s) => s.setItem(LANG_STORAGE_KEY, next), null);
    applyI18n();
    renderThemeButton();
    renderStatus();
    renderShareStatus();
    renderSolve();
  }

  // ---------- テーマ ----------

  /** テーマは、保存した選択 → OS の設定 → ダークの順で決める。 */
  function initialTheme() {
    const saved = withStorage((s) => s.getItem(THEME_STORAGE_KEY), null);
    if (saved === "dark" || saved === "light") return saved;
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    return prefersLight ? "light" : "dark";
  }

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }

  function setTheme(theme, save) {
    document.documentElement.setAttribute("data-theme", theme);
    if (save) withStorage((s) => s.setItem(THEME_STORAGE_KEY, theme), null);
    renderThemeButton();
  }

  function renderThemeButton() {
    const dark = currentTheme() === "dark";
    themeIcon.textContent = dark ? "☀️" : "🌙";
    themeToggle.setAttribute("aria-label", t(dark ? "theme.toLight" : "theme.toDark"));
  }

  function toggleTheme() {
    setTheme(currentTheme() === "dark" ? "light" : "dark", true);
  }

  // ---------- 通知 ----------

  let toastTimer = 0;

  /** トーストを出す。続けて出したときは、前のタイマーを止めてから数え直す。 */
  function showToast(msg) {
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.add("show");
    toastTimer = setTimeout(() => toast.classList.remove("show"), 1600);
  }

  /** クリップボードに書く。API がない環境（非セキュアな http など）では失敗として扱う。 */
  function writeClipboard(text) {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      return Promise.reject(new Error("clipboard unavailable"));
    }
    return navigator.clipboard.writeText(text);
  }

  function copyText(text) {
    writeClipboard(text).then(() => {
      showToast(t("toast.copied"));
    }).catch(() => {
      showToast(t("toast.copyFailed"));
    });
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    // すぐに解放すると、ブラウザーによっては保存が始まる前に URL が消える
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- 変換と描画 ----------

  function readOptions() {
    return {
      mode: elReversal.value,
      blockSize: Core.clampBlockSize(elBlockSize.value),
      fixCase: elFixCase.checked
    };
  }

  /** Step 2 の鏡像（CSS のクラスで見た目だけを変える）。 */
  function setMirrorClass(target, mode) {
    target.classList.remove("mirror-none", "mirror-h", "mirror-v");
    target.classList.add(Core.MIRRORS.includes(mode) ? `mirror-${mode}` : "mirror-none");
  }

  /** プレビューのフォント（クラスで切り替える）。 */
  function setFont(family) {
    const name = Core.FONTS.includes(family) ? family : "system-ui";
    [elStepRev, elStepMir].forEach((el) => {
      Core.FONTS.forEach((f) => el.classList.remove(`font-${f}`));
      el.classList.add(`font-${name}`);
    });
  }

  /** 入力と設定から Step 1 を計算し、画面に出す。 */
  function update() {
    lastResult = Core.transform(elInput.value, readOptions());
    elStepRev.textContent = lastResult;
    elStepMir.textContent = lastResult;
    renderStatus();
  }

  /**
   * 状態から作る文（文字数・方式の説明・組み合わせ）を描く。
   * 言語を切り替えたときは、計算し直さずにこれだけを呼ぶ。
   */
  function renderStatus() {
    const counts = Core.counts(elInput.value);
    elCounts.textContent = t("input.counts", counts);
    elSplit.hidden = counts.graphemes === counts.codePoints;
    elNoSegmenter.hidden = Core.hasSegmenter;

    const mode = elReversal.value;
    elBlockControl.hidden = !Core.BLOCK_MODES.includes(mode);
    elReversalHint.textContent = t(`hint.${mode}`, { n: Core.clampBlockSize(elBlockSize.value) });

    const mirror = elMirror.value;
    setMirrorClass(elStepMir, mirror);
    const key = Core.describeCombination(mode, mirror);
    const readable = Core.readableInMirror(mode, mirror);
    elComboTitle.textContent = t(`combo.${key}.title`);
    elComboText.textContent = t(`combo.${key}.text`);
    elComboMirror.textContent = t(readable ? "combo.mirrorYes" : "combo.mirrorNo");
    elComboMirror.classList.toggle("is-yes", readable);
    renderCompare();
  }

  // ---------- 3つの「逆」の比較 ----------

  /** 比較に使う文字数の上限（長い文でも、違いは先頭だけで十分に見える）。 */
  const COMPARE_LIMIT = 24;

  /** コードポイントの一覧を <li> で並べる。文字は textContent で入れる。 */
  function renderCodePoints(target, list) {
    target.replaceChildren();
    for (const item of list.items) {
      const li = document.createElement("li");
      li.className = `cp cp-${item.kind}`;
      const glyph = document.createElement("span");
      glyph.className = "cp-glyph";
      glyph.textContent = item.label;
      const code = document.createElement("span");
      code.className = "cp-code";
      code.textContent = item.hex;
      li.append(glyph, code);
      target.append(li);
    }
  }

  /** 1枚のカード（事実の表・見え方・コードポイント）を描く。 */
  function renderCompareCard(name, facts, copyKey) {
    const box = compareCards[name];
    box.render.textContent = facts.shown;
    const rows = [
      ["fact.order", t(facts.orderKept ? "fact.kept" : "fact.changed")],
      ["fact.search", t(facts.containsOriginal ? "fact.found" : "fact.notFound")],
      ["fact.added", t("fact.addedCount", { n: facts.addedCodePoints })],
      ["fact.copy", t(copyKey)]
    ];
    box.facts.replaceChildren();
    for (const [key, value] of rows) {
      const dt = document.createElement("dt");
      dt.textContent = t(key);
      const dd = document.createElement("dd");
      dd.textContent = value;
      box.facts.append(dt, dd);
    }
    box.caption.textContent = t("compare.cpCaption", {
      shown: facts.codePoints.items.length,
      total: facts.codePoints.total
    });
    renderCodePoints(box.cps, facts.codePoints);
  }

  /** 入力の先頭を題材に、3つの「逆」を並べる。 */
  function renderCompare() {
    const full = elInput.value;
    const sample = Array.from(full).slice(0, COMPARE_LIMIT).join("");
    elCompareEmpty.hidden = sample.length > 0;
    elCompareSample.hidden = Array.from(full).length <= COMPARE_LIMIT;
    elCompareSample.textContent = t("compare.sample", { n: COMPARE_LIMIT });
    const r = Compare.compare(sample);
    renderCompareCard("data", r.data, "copy.data");
    renderCompareCard("mirror", r.mirror, "copy.mirror");
    renderCompareCard("rlo", r.rlo, "copy.rlo");
    elCmpRloLink.href = Compare.day023Link(r.rlo.data);
  }

  // ---------- どの並べ替えかを当てる ----------

  /** 直前の解読の結果（言語を切り替えたときに、計算し直さず描き直すため）。 */
  let lastSolved = null;

  /** 方式の名前（ブロックは長さを添える）。 */
  function modeLabel(mode, blockSize) {
    const name = t(`mode.${mode}`);
    return Core.BLOCK_MODES.includes(mode) ? t("solve.blockLabel", { mode: name, n: blockSize }) : name;
  }

  /** 候補1件の行を作る。 */
  function solveRow(item) {
    const li = document.createElement("li");
    li.className = "solve-item";

    const head = document.createElement("p");
    head.className = "solve-mode";
    head.textContent = modeLabel(item.mode, item.blockSize);
    const score = document.createElement("span");
    score.className = "solve-score";
    score.textContent = item.score.toFixed(2);
    head.append(score);

    const text = document.createElement("p");
    text.className = "solve-text";
    text.textContent = item.text;

    li.append(head, text);

    if (item.sameAsInput) {
      const same = document.createElement("p");
      same.className = "hint";
      same.textContent = t("solve.same");
      li.append(same);
    }
    if (item.also.length) {
      const also = document.createElement("p");
      also.className = "hint";
      // ブロックの長さが違うだけの同じ方式は、1つにまとめて出す（長さを全部並べない）
      const sizes = new Map();
      for (const a of item.also) {
        if (!sizes.has(a.mode)) sizes.set(a.mode, []);
        sizes.get(a.mode).push(a.blockSize);
      }
      const names = [...sizes].map(([mode, list]) => (
        Core.BLOCK_MODES.includes(mode) && list.length > 1
          ? t("solve.anySize", { mode: t(`mode.${mode}`) })
          : modeLabel(mode, list[0])
      ));
      also.textContent = t("solve.also", { list: names.join(t("solve.alsoSep")) });
      li.append(also);
    }

    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "btn btn-ghost btn-small";
    apply.textContent = t("solve.apply");
    apply.addEventListener("click", () => {
      elInput.value = item.text;
      elReversal.value = item.mode;
      elBlockSize.value = String(item.blockSize);
      elExample.value = "";
      update();
      elInput.scrollIntoView({ block: "center" });
      elInput.focus();
    });
    li.append(apply);
    return li;
  }

  /** 解読の結果を描く（計算は solveNow が行う）。 */
  function renderSolve() {
    elSolveResults.replaceChildren();
    const text = elSolveInput.value;
    if (!text) {
      elSolveStatus.textContent = t("solve.empty");
      return;
    }
    if (!lastSolved) return;
    const parts = [];
    if (!lastSolved.enough) {
      parts.push(t("solve.short", { n: lastSolved.length, min: Solver.MIN_LENGTH }));
    }
    parts.push(t("solve.found", { lang: t(lastSolved.lang === "ja" ? "solve.langJa" : "solve.langEn") }));
    elSolveStatus.textContent = parts.join(" ");
    for (const item of lastSolved.results) elSolveResults.append(solveRow(item));
  }

  function solveNow() {
    const text = elSolveInput.value;
    lastSolved = text ? Solver.solve(text, { lang: elSolveLang.value }) : null;
    renderSolve();
  }

  let solveTimer = 0;
  function scheduleSolve() {
    clearTimeout(solveTimer);
    solveTimer = setTimeout(solveNow, DEBOUNCE_MS);
  }

  let timer = 0;
  function scheduleUpdate() {
    clearTimeout(timer);
    if (elInput.value.length > DEBOUNCE_LENGTH) {
      timer = setTimeout(update, DEBOUNCE_MS);
    } else {
      update();
    }
  }

  // ---------- 例文 ----------

  function applyExample(key) {
    const ex = Examples.EXAMPLES.find((e) => e.key === key);
    if (!ex) return;
    elInput.value = Examples.textOf(ex, lang);
    elReversal.value = ex.mode;
    elMirror.value = ex.mirror || "none";
    elFixCase.checked = !!ex.fixCase;
    if (ex.blockSize) elBlockSize.value = String(ex.blockSize);
    update();
  }

  // ---------- 共有URL ----------

  function currentState() {
    return {
      text: elInput.value,
      mode: elReversal.value,
      mirror: elMirror.value,
      font: elFont.value,
      blockSize: Core.clampBlockSize(elBlockSize.value),
      fixCase: elFixCase.checked
    };
  }

  /**
   * 共有URLの状態の文。言語を切り替えたら描き直すので、文字列ではなく
   * 「キー＋差し込む値」の並びで持つ。
   */
  let shareMessage = null;

  function renderShareStatus() {
    if (!shareMessage) {
      elShareStatus.hidden = true;
      return;
    }
    elShareStatus.hidden = false;
    elShareStatus.textContent = shareMessage.parts.map((p) => t(p.key, p.vars)).join(lang === "ja" ? "" : " ");
    elShareStatus.classList.toggle("is-warn", shareMessage.warn);
  }

  function setShareMessage(parts, warn) {
    shareMessage = { parts, warn: !!warn };
    renderShareStatus();
  }

  /** 共有URLを作ってコピーし、URL と長さを画面にも出す（コピーできない環境でも手で選べるように）。 */
  function shareURL() {
    const share = Core.shareUrl(location.href, currentState());
    const length = share.length.toLocaleString("en-US");
    elShareUrl.value = share.url;
    elShareBox.hidden = false;
    writeClipboard(share.url).then(() => "share.copied", () => "share.failed").then((key) => {
      const parts = [{ key, vars: { length } }];
      if (share.warn) parts.push({ key: "share.long", vars: { length } });
      setShareMessage(parts, share.warn || key === "share.failed");
      showToast(t(key, { length }));
    });
  }

  /** URL のハッシュから状態を読む。読めなかったときは理由を画面に出す。 */
  function loadFromHash() {
    const result = Core.decodeShare(location.hash);
    if (!result.ok) {
      if (result.error !== "empty") {
        setShareMessage([{ key: result.error === "tooLong" ? "share.tooLong" : "share.format" }], true);
      }
      return;
    }
    const s = result.state;
    elInput.value = s.text;
    elReversal.value = s.mode;
    elMirror.value = s.mirror;
    elFont.value = s.font;
    elBlockSize.value = String(s.blockSize);
    elFixCase.checked = s.fixCase;
    elExample.value = "";
    setFont(s.font);
    update();
    setShareMessage([{ key: "share.loaded" }], false);
  }

  // ---------- イベント ----------

  themeToggle.addEventListener("click", toggleTheme);
  langToggle.addEventListener("click", () => setLang(lang === "ja" ? "en" : "ja", true));
  window.addEventListener("hashchange", loadFromHash);

  elInput.addEventListener("input", () => {
    elExample.value = "";
    scheduleUpdate();
  });
  [elReversal, elMirror, elFixCase].forEach((el) => el.addEventListener("change", update));
  elBlockSize.addEventListener("input", update);
  elBlockSize.addEventListener("change", () => {
    elBlockSize.value = String(Core.clampBlockSize(elBlockSize.value));
    update();
  });
  elFont.addEventListener("change", () => setFont(elFont.value));
  elExample.addEventListener("change", () => applyExample(elExample.value));

  btnClear.addEventListener("click", () => {
    elInput.value = "";
    elExample.value = "";
    update();
  });

  btnCopyIn.addEventListener("click", () => copyText(elInput.value));
  btnCopyOut.addEventListener("click", () => copyText(lastResult));
  btnDownload.addEventListener("click", () => {
    const name = `mirror-cipherlab_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
    downloadText(name, lastResult);
  });
  btnShare.addEventListener("click", shareURL);

  elSolveInput.addEventListener("input", scheduleSolve);
  elSolveLang.addEventListener("change", solveNow);
  btnSolveFromOutput.addEventListener("click", () => {
    elSolveInput.value = lastResult;
    solveNow();
  });
  btnSolveClear.addEventListener("click", () => {
    elSolveInput.value = "";
    solveNow();
  });

  // ---------- 初期化 ----------

  lang = initialLang();
  applyI18n();
  setTheme(initialTheme(), false);
  setFont(elFont.value);
  elReversal.value = "all";
  loadFromHash();
  update();
  solveNow();
})();
