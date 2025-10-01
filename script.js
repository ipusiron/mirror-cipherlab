/* Mirror CipherLab
   - Text reversal (full / word-wise / none)
   - Glyph mirror (horizontal / vertical / none)
   - Real-time preview, copy/clear/download, share URL
   - Theme toggle (dark/light mode)
   - All client-side
*/
(() => {
  const $ = (sel) => document.querySelector(sel);

  // Theme management
  const themeToggle = $("#themeToggle");
  const themeIcon = $("#themeIcon");

  function getTheme(){
    return localStorage.getItem("theme") || "dark";
  }

  function setTheme(theme){
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
    themeIcon.textContent = theme === "dark" ? "☀️" : "🌙";
    themeToggle.setAttribute("aria-label", theme === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え");
  }

  function toggleTheme(){
    const current = getTheme();
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
  }

  // Initialize theme
  setTheme(getTheme());

  themeToggle.addEventListener("click", toggleTheme);

  const elInput = $("#input");
  const elReversal = $("#reversal");
  const elMirror = $("#mirror");
  const elFont = $("#font");
  const elStepRev = $("#stepReversed");
  const elStepMir = $("#stepMirrored");
  const elCharCount = $("#charCount");

  const btnClear = $("#btnClear");
  const btnCopyIn = $("#btnCopyIn");
  const btnCopyOut = $("#btnCopyOut");
  const btnDownload = $("#btnDownload");
  const btnShare = $("#btnShare");

  const toast = $("#toast");

  // Utils
  function showToast(msg){
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 1600);
  }

  function copyText(text){
    navigator.clipboard.writeText(text).then(() => {
      showToast("Copied!");
    }).catch(() => {
      showToast("Copy failed");
    });
  }

  function downloadText(filename, text){
    const blob = new Blob([text], {type: "text/plain;charset=utf-8"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Reversal functions
  function reverseFull(str){
    // Split by code points to support surrogate pairs, emojis
    // [...str] expands by code points in modern browsers
    return [...str].reverse().join("");
  }

  function reverseWordWise(str){
    // Split by whitespace groups; reverse each token's characters, keep order
    // Keep whitespace as-is using split with capture
    const parts = str.split(/(\s+)/);
    return parts.map(p => /\s+/.test(p) ? p : reverseFull(p)).join("");
  }

  function applyReversal(input, mode){
    switch(mode){
      case "full": return reverseFull(input);
      case "word": return reverseWordWise(input);
      case "none": return input;
      default: return input;
    }
  }

  // Glyph mirror (visual-only) via CSS classes
  function setMirrorClass(target, mode){
    target.classList.remove("mirror-none", "mirror-h", "mirror-v");
    if(mode === "h") target.classList.add("mirror-h");
    else if(mode === "v") target.classList.add("mirror-v");
    else target.classList.add("mirror-none");
  }

  function setFontFamily(family){
    const map = {
      "system-ui": 'system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,"Noto Sans","Apple Color Emoji","Segoe UI Emoji",sans-serif',
      "serif": 'Georgia, "Times New Roman", Times, serif',
      "monospace": 'ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Courier New",monospace'
    };
    document.documentElement.style.setProperty("--font-family-preview", map[family] || map["system-ui"]);
    elStepRev.style.fontFamily = map[family] || map["system-ui"];
    elStepMir.style.fontFamily = map[family] || map["system-ui"];
  }

  function update(){
    const raw = elInput.value ?? "";
    const modeRev = elReversal.value;
    const modeMirror = elMirror.value;

    const reversed = applyReversal(raw, modeRev);
    elStepRev.textContent = reversed;

    elStepMir.textContent = reversed;
    setMirrorClass(elStepMir, modeMirror);

    elCharCount.textContent = `${[...raw].length} chars`;
  }

  function shareURL(){
    const payload = {
      t: elInput.value || "",
      r: elReversal.value,
      m: elMirror.value,
      f: elFont.value
    };
    // Base64url encode (without padding)
    const json = JSON.stringify(payload);
    const b64 = btoa(unescape(encodeURIComponent(json)))
      .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `${location.origin}${location.pathname}#${b64}`;
    navigator.clipboard.writeText(url).then(() => {
      showToast("Share URL copied");
    }).catch(()=>{
      showToast("Failed to copy URL");
    });
  }

  function loadFromHash(){
    if(!location.hash) return;
    try{
      const b64u = location.hash.slice(1);
      // Validate base64url format
      if(!/^[A-Za-z0-9_-]+$/.test(b64u)){
        console.warn("Invalid hash format");
        return;
      }
      const b64 = b64u.replace(/-/g, "+").replace(/_/g, "/");
      const json = decodeURIComponent(escape(atob(b64)));
      const obj = JSON.parse(json);

      // Validate and sanitize inputs
      if(typeof obj.t === "string" && obj.t.length <= 50000){
        elInput.value = obj.t;
      }

      // Whitelist validation for select values
      const validReversals = ["full", "word", "none"];
      if(typeof obj.r === "string" && validReversals.includes(obj.r)){
        elReversal.value = obj.r;
      }

      const validMirrors = ["none", "h", "v"];
      if(typeof obj.m === "string" && validMirrors.includes(obj.m)){
        elMirror.value = obj.m;
      }

      const validFonts = ["system-ui", "serif", "monospace"];
      if(typeof obj.f === "string" && validFonts.includes(obj.f)){
        elFont.value = obj.f;
      }

      setFontFamily(elFont.value);
      update();
    }catch(e){
      console.warn("Invalid hash payload:", e);
    }
  }

  // Events
  [elInput, elReversal, elMirror].forEach(el => {
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });

  elFont.addEventListener("change", () => {
    setFontFamily(elFont.value);
    update();
  });

  btnClear.addEventListener("click", () => {
    elInput.value = "";
    update();
  });

  btnCopyIn.addEventListener("click", () => copyText(elInput.value ?? ""));
  btnCopyOut.addEventListener("click", () => copyText(elStepMir.textContent ?? ""));
  btnDownload.addEventListener("click", () => {
    const name = `mirror-cipherlab_${new Date().toISOString().replace(/[:.]/g,"-")}.txt`;
    downloadText(name, elStepMir.textContent ?? "");
  });

  btnShare.addEventListener("click", shareURL);

  // Init
  setFontFamily(elFont.value);
  loadFromHash();
  update();
})();
