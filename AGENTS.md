# AGENTS.md

## Project

Browser extension (Chrome MV3) that scrapes vocabulary from Linguee pages and adds flashcards to Anki via AnkiConnect. Built with plain JS (no framework yet). Early stage — no source code yet, research docs only.

## Critical Constraint

**ONLY use the "testing" Chrome profile for development. NEVER switch to another profile.** This prevents polluting a personal/production browser profile with extension side effects.

## Skills to Use

- **chrome-extensions** — For all extension development: manifest, content scripts, service workers, popup, permissions, publishing. Load it when creating or modifying any extension code.
- **anki-connect** — For all Anki interaction: creating decks, adding notes, checking duplicates, note types. Load it when integrating with AnkiConnect API.

## Chrome DevTools MCP

Configured in `opencode.json`. Use it to:
- Inspect Linguee DOM when building the content script extractor
- Test extension popup rendering
- Debug content script injection on live pages
- Verify AnkiConnect responses in the browser

## Architecture

```
Content Script (Linguee page DOM)
  → extracts word data via querySelector
  → sends to Service Worker via chrome.runtime.sendMessage

Service Worker (background.js)
  → formats HTML for Anki fields
  → calls AnkiConnect at localhost:8765
  → manages offline queue in chrome.storage.local

Popup (popup.html/js)
  → deck selector, "Add to Anki" button, status display
  → communicates with service worker
```

Key architectural decisions (from research):
- No Python middleware — extension talks to AnkiConnect directly
- Content script reads DOM directly (Linguee is server-rendered HTML, no hidden API)
- AnkiConnect calls must happen in service worker, not content script (MV3 mixed-content rules)
- Note type: custom "German Vocabulary" model with fields Word, POS, Gender, Translations, LeastCommon, Source, Notes

## Research Docs

- `implementation-hints-initial.md` — Architecture hints, AnkiConnect integration, card design, extension structure
- `linguee/implementation-hints-initial.md` — DOM parsing strategy, CSS selectors, edge cases
- `linguee/structure-analysis.md` — Linguee DOM structure (`.exact`, `.tag_lemma`, `.translation`, `.inexact`, etc.)
- `linguee/data-schema.md` — Extractable data fields and JSON schema
- `anki/ankiconnect-api.md` — Full AnkiConnect API reference with JS examples
- `anki/integration-architecture.md` — Data flow, manifest, file structure, UX flow
- `anki/card-html-design.md` — Card template HTML/CSS (including dark mode)
- `anki/deck-management.md` — Deck creation, duplicate detection, offline queue
- `anki/browser-extensions.md` — Survey of existing Anki browser extensions
- `linguee/scraping-feasibility.md` — Why static DOM scraping works (no Selenium needed)

## AnkiConnect

- Runs at `http://localhost:8765`
- Requires Anki desktop to be open + AnkiConnect add-on installed (code: 2055492159)
- API version 6, JSON POST requests
- Key endpoints: `version`, `deckNames`, `createDeck`, `createModel`, `addNote`, `canAddNotes`, `findNotes`
- Always check `error` field in responses before using `result`

## Linguee DOM Selectors

Stable CSS classes for data extraction:
- `.exact` — entry container (one per lemma)
- `.tag_lemma` — combined word + POS + gender text
- `.tag_type` — abbreviated POS (n, v, adj, adv)
- `.tag_forms` — verb conjugations
- `.tag_usage` — frequency ("often used")
- `.translation` — individual translation block
- `.dictLink` — translation word link
- `.example_lines` — paired example sentences
- `.inexact` — less common translations (hidden but present in DOM)
- `.singleline` — single-line lesser translations

## Git

The `.gitignore` still has Python entries from an earlier planning phase. These are harmless but irrelevant now.