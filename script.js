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

  /** 入力がこの長さを超えたら、打鍵ごとではなく少し待ってから変換する。 */
  const DEBOUNCE_LENGTH = 5000;
  const DEBOUNCE_MS = 150;

  let lang = "ja";
  const t = (key, vars) => Msg.t(lang, key, vars);

  const themeToggle = $("#themeToggle");
  const themeIcon = $("#themeIcon");

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

  // ---------- テーマ ----------

  function getTheme() {
    return localStorage.getItem("theme") || "dark";
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    renderThemeButton();
  }

  function renderThemeButton() {
    const dark = document.documentElement.getAttribute("data-theme") !== "light";
    themeIcon.textContent = dark ? "☀️" : "🌙";
    themeToggle.setAttribute("aria-label", t(dark ? "theme.toLight" : "theme.toDark"));
  }

  function toggleTheme() {
    setTheme(getTheme() === "dark" ? "light" : "dark");
  }

  // ---------- 通知 ----------

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
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
    URL.revokeObjectURL(url);
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

  function shareURL() {
    const share = Core.shareUrl(location.href, currentState());
    navigator.clipboard.writeText(share.url).then(() => {
      showToast(t("share.copied", { length: share.length.toLocaleString() }));
    }).catch(() => {
      showToast(t("share.failed"));
    });
  }

  function loadFromHash() {
    const result = Core.decodeShare(location.hash);
    if (!result.ok) return;
    const s = result.state;
    elInput.value = s.text;
    elReversal.value = s.mode;
    elMirror.value = s.mirror;
    elFont.value = s.font;
    elBlockSize.value = String(s.blockSize);
    elFixCase.checked = s.fixCase;
    setFont(s.font);
    update();
  }

  // ---------- イベント ----------

  themeToggle.addEventListener("click", toggleTheme);

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

  // ---------- 初期化 ----------

  applyI18n();
  setTheme(getTheme());
  setFont(elFont.value);
  elReversal.value = "all";
  loadFromHash();
  update();
})();
