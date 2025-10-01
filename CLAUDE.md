# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mirror CipherLab** is an educational web application that demonstrates mirror ciphers through text reversal and visual mirroring. It's a client-side-only tool (no backend) built with vanilla JavaScript, HTML, and CSS.

This is part of the "100 Security Tools with Generative AI" project - an educational tool demonstrating classical cryptography concepts, specifically text reversal (transposition cipher) and mirror rendering.

**Live Demo:** https://ipusiron.github.io/mirror-cipherlab/

## Core Functionality

The application provides two independent transformations:

1. **Text Reversal (Character Order)**
   - Full Reverse: Reverses entire string character-by-character
   - Word-wise Reverse: Reverses characters within each word, preserving word order
   - None: No reversal

2. **Glyph Mirror (Visual Rendering)**
   - Horizontal Mirror: CSS `scaleX(-1)` transformation
   - Vertical Mirror: CSS `scaleY(-1)` transformation
   - None: No visual transformation

**Important:** These are separate operations. Reversal changes the actual text data; mirroring only affects visual display via CSS.

## Architecture

### Files Structure

- `index.html` - Single-page application structure
- `script.js` - All application logic (reversal algorithms, UI updates, URL sharing)
- `style.css` - Dark theme styling with CSS custom properties

### Key Technical Details

**Character Handling:**
- Uses spread operator `[...str]` to properly handle Unicode code points (emojis, surrogate pairs)
- Whitespace-preserving word-wise reversal using `split(/(\s+)/)`

**State Management:**
- No framework - direct DOM manipulation
- URL hash-based state sharing (Base64url-encoded JSON)
- Real-time updates on input/change events

**Core Functions (script.js):**
- `reverseFull(str)` - Full string reversal supporting Unicode
- `reverseWordWise(str)` - Word-by-word reversal preserving whitespace
- `applyReversal(input, mode)` - Main reversal dispatcher
- `setMirrorClass(target, mode)` - Applies CSS mirror transformations
- `shareURL()` - Encodes current state into shareable URL
- `loadFromHash()` - Restores state from URL hash on page load

## Development Commands

### Local Development
```bash
# Serve locally (any static server)
python -m http.server 8000
# or
npx serve .
# or simply open index.html in a browser (file:// protocol works)
```

### Testing
No automated tests. Manual testing checklist:
- Test with emoji, RTL text (Arabic/Hebrew), combining characters
- Verify clipboard operations (copy input/output)
- Test share URL generation and restoration
- Check responsive layout (desktop/mobile)
- Test all reversal modes × mirror modes combinations

### Deployment
Static files only - deploy to any static host:
```bash
# GitHub Pages (already configured with .nojekyll)
git add .
git commit -m "Update"
git push origin main
```

## Educational Context

**Security Note:** This tool demonstrates that mirror ciphers provide NO cryptographic security. They are trivially reversible and serve only as educational examples of:
- Simple transposition ciphers
- Human cognitive biases (visual obfuscation ≠ security)
- Browser rendering edge cases (RTL, combining characters)

**Use Cases:**
- Teaching classical cryptography concepts
- Demonstrating cognitive psychology (reading difficulty)
- Exploring Unicode/CSS rendering edge cases

## Coding Conventions

- Vanilla JS (ES6+) - no frameworks
- CSS custom properties for theming
- Minimalist, functional style
- No build process required
- All processing happens client-side (privacy by design)

## Common Modifications

**Adding New Reversal Modes:**
1. Add option to `#reversal` select in index.html
2. Implement algorithm function in script.js
3. Add case to `applyReversal()` switch statement

**Adding New Mirror Types:**
1. Add option to `#mirror` select in index.html
2. Define CSS class in style.css (e.g., `.mirror-rotate { transform: rotate(180deg); }`)
3. Update `setMirrorClass()` function

**Styling Changes:**
- Edit CSS custom properties in `:root` for theme adjustments
- Main colors: `--bg`, `--panel`, `--text`, `--accent`, `--accent-2`
