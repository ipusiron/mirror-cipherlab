# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mirror CipherLab** is an educational web application about mirror ciphers: it reorders text (Step 1, changes the data) and mirrors the glyphs with CSS (Step 2, display only), then explains what each combination looks like in the real world and whether it can be read in a mirror. Client-side only (no backend, no external requests), vanilla JavaScript, HTML and CSS.

Part of the "100 Security Tools with Generative AI" project (Day084).

**Live Demo:** https://ipusiron.github.io/mirror-cipherlab/

## Development Commands

```bash
# Tests (Node.js 22+, no dependencies)
npm test

# Local development (either works; file:// also works)
python -m http.server 8000

# Deploy: GitHub Pages builds main (legacy build, repository root)
```

GitHub Actions (`.github/workflows/test.yml`) runs `npm test` on push and pull request.

## Architecture

Classic scripts (no modules, so `file://` works), loaded in this order by `index.html`:

- `js/messages.js` - `MirrorMessages`: UI strings by key (`ja`, `en`), `t(lang, key, vars)` fills `{name}`
- `js/examples.js` - `MirrorExamples`: six examples (text + settings)
- `js/mirror-core.js` - `MirrorCore`: pure logic, no DOM (tests load it with `vm.runInThisContext`)
- `script.js` - UI only (events, rendering, theme, share URL)

**Step 1 modes** (`MirrorCore.MODES`): `none`, `all`, `eachWord`, `wordOrder`, `eachLine`, `lineOrder`, `eachSentence`, `blocks`, `blocksThenOrder`.

- All reordering is by grapheme cluster (`Intl.Segmenter`, granularity `grapheme`); falls back to code points if missing.
- `eachWord` / `wordOrder` use `Intl.Segmenter` word granularity with a fixed locale (`ja`).
- `wordOrder` reverses words and punctuation as units, attaches punctuation to the previous word, swaps paired brackets/quotes, and copies the source spacing for pairs not decided by punctuation rules (so it is an involution).
- `eachSentence` keeps sentence-end marks (`SENTENCE_END`) and the whitespace touching them in place and reverses the text between them.
- `blocksThenOrder` always equals `all` (proved by the tests for block sizes 2-20).
- `fixCase`: lowercases sentence-initial capitals before, capitalizes sentence starts after (sentence starts are detected by `SENTENCE_END`, not by UAX #29, because UAX #29 does not break before a lowercase word).
- Every mode is an involution (applying it twice restores the input), except `eachWord` on Japanese (dictionary segmentation of reversed kanji differs).

**Step 2 mirrors** (`MirrorCore.MIRRORS`): `none`, `h` (`scaleX(-1)`), `v` (`scaleY(-1)`), as CSS classes `.mirror-*`. Copy and download always use the Step 1 string.

**Combination keys** (`describeCombination(mode, mirror)`): `plain`, `mirrorWriting`, `waterReflection`, `rightToLeft`, `glyphsOnly`, `reversedAndFlipped`, `dataOnly`, `dataAndMirror`. `readableInMirror` is true only for `none` + `h`/`v`.

**Share URL**: `#` + base64url(JSON `{t, r, m, f, n?, c?}`) built from `location.href` (not `location.origin`, which is `"null"` on Firefox `file://`). `decodeShare` validates format, length (text up to 50,000 UTF-16 units, hash up to 300,000), whitelists values and maps legacy `r` values (`full` -> `all`, `word` -> `eachWord`). Loaded on start and on `hashchange`; errors are shown in `#shareStatus`.

## Adding Features

**New Step 1 mode:**
1. Add the function and the case in `MirrorCore.transform`, and add the name to `MODES` (order = select order)
2. Add `<option>` to `#reversal` in `index.html`
3. Add `mode.<name>` and `hint.<name>` to both languages in `js/messages.js`
4. Add a known-answer row to the Step 1 table in `README.md` / `README.en.md` (tests check the table)

**New mirror:** add to `MIRRORS`, the `<option>`, a `.mirror-*` class in `style.css`, `mirror.<name>` strings, and decide its combination keys.

**UI strings:** never hard-code text in HTML or JS; add keys to both `ja` and `en` in `js/messages.js` and reference them with `data-i18n`, `data-i18n-placeholder` or `data-i18n-label`.

**Colors:** only as CSS variables in `:root` (dark, default) and `:root[data-theme="light"]`; `test/contrast.test.js` checks text pairs (4.5:1) and the focus ring (3:1).

## Security Considerations

- CSP meta: `default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'` (no inline scripts, styles or handlers)
- Output is written with `textContent` only
- Share URL input is validated by `MirrorCore.decodeShare` (format, length, whitelists)
- `localStorage` access is wrapped (`withStorage`), so blocked storage does not stop the app
- No external requests; everything runs in the browser
