# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mirror CipherLab** is an educational web application demonstrating mirror ciphers through text reversal and visual mirroring. Client-side only (no backend), built with vanilla JavaScript, HTML, and CSS.

Part of the "100 Security Tools with Generative AI" project.

**Live Demo:** https://ipusiron.github.io/mirror-cipherlab/

## Development Commands

```bash
# Local development (any of these work)
python -m http.server 8000
npx serve .
# Or open index.html directly in browser (file:// protocol works)

# Deploy to GitHub Pages
git push origin main
```

No build process. No automated tests - manual testing required for emoji, RTL text, clipboard operations, and responsive layout.

## Architecture

Single-page app with three files:
- `index.html` - UI structure with CSP headers and ARIA attributes
- `script.js` - All logic (reversal algorithms, URL sharing, theme)
- `style.css` - Dark/light themes via CSS custom properties

**Two independent transformations:**
1. **Reversal** (changes actual text): `full` | `word` | `none`
2. **Mirror** (CSS visual only): `h` (scaleX -1) | `v` (scaleY -1) | `none`

**Key functions in script.js:**
- `reverseFull(str)` / `reverseWordWise(str)` - Unicode-safe using `[...str]` spread
- `applyReversal(input, mode)` - Main dispatcher
- `setMirrorClass(target, mode)` - CSS class toggling
- `shareURL()` / `loadFromHash()` - Base64url state in URL hash

**State:** Real-time DOM updates on input/change events. URL hash stores `{t, r, m, f}` (text, reversal, mirror, font).

## Adding Features

**New reversal mode:**
1. Add `<option>` to `#reversal` select in index.html
2. Implement function in script.js
3. Add case to `applyReversal()` switch

**New mirror type:**
1. Add `<option>` to `#mirror` select in index.html
2. Add CSS class in style.css (e.g., `.mirror-rotate { transform: rotate(180deg); }`)
3. Update `setMirrorClass()` in script.js
4. Add to `validMirrors` array in `loadFromHash()` for URL sharing

**Theme colors:** Edit CSS custom properties in `:root` and `:root[data-theme="light"]`

## Security Considerations

- CSP configured in `<meta>` tag: `default-src 'none'; script-src 'self'; style-src 'self'`
- URL hash input validated with whitelist (`validReversals`, `validMirrors`, `validFonts`)
- Text input limited to 50,000 characters
- No external requests - all processing client-side
