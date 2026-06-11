# Developer Info — Linguee → Anki

## Quick Start

### Chrome (development)
1. Go to `chrome://extensions`, enable **Developer Mode**
2. Click **Load unpacked** → select the `code/` directory
3. Navigate to a Linguee page (e.g., `https://www.linguee.com/german-english/search?query=Haus`)
4. Buttons appear next to each dictionary entry

### Firefox (testing)
```sh
npm run build:firefox
```
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `dist/firefox/manifest.json`
4. Navigate to a Linguee page

---

## Build Pipeline

```
manifests/chrome.json ──┐
manifests/firefox.json ─┤
                         ├── build.js ──→ dist/chrome/  (Chrome Web Store)
background.js ──────────┤               └─→ dist/firefox/ (Firefox AMO)
content.js ─────────────┤
content.css ────────────┤
popup/ ─────────────────┤
icons/ ─────────────────┘
```

### Commands

| Command | Output |
|---------|--------|
| `npm run build` | Both `dist/chrome/` and `dist/firefox/` |
| `npm run build:chrome` | `dist/chrome/` only |
| `npm run build:firefox` | `dist/firefox/` only |

The build is a zero-dependency file-copy script. No webpack, no bundler — the source files are plain JS and are identical for both browsers.

### What differs per browser

| | Chrome | Firefox |
|---|---|---|
| Manifest source | `manifests/chrome.json` | `manifests/firefox.json` |
| Background key | `service_worker` | `scripts` |
| `browser_specific_settings` | absent | `gecko.id` + `strict_min_version` |
| Background context | Service Worker | Event Page |

Everything else — source files, popup, icons, permissions, content scripts — is identical.

---

## Publishing

### Chrome Web Store
```sh
npm run build:chrome
```
Zip the contents of `dist/chrome/` (the files themselves, not the folder) and upload at [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole).

### Firefox Add-ons (AMO)
```sh
npm run build:firefox
```
Zip the contents of `dist/firefox/` and upload at [Firefox Add-on Developer Hub](https://addons.mozilla.org/developers/).

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Chrome MV3 Extension                   │
│                                                          │
│  content.js (Linguee page)     background.js (SW/EP)     │
│  ├─ extractWordEntries()       ├─ ankiInvoke()           │
│  ├─ injectAddButtons()         ├─ safeAnkiWrite()        │
│  └─ click → sendMessage()      ├─ ensureNoteType()       │
│              │                  ├─ formatTranslationsHTML │
│              │                  └─ addEntryToAnki()       │
│              │                         │                  │
│  popup/      │                 fetch() │ localhost:8765   │
│  ├─ deck selector              ┌───────┘                  │
│  ├─ status indicator           │                          │
│  └─ queue control              ▼                          │
│                        ┌──────────────┐                  │
│                        │  AnkiConnect  │                  │
│                        │  (Anki addon) │                  │
│                        └──────────────┘                  │
└──────────────────────────────────────────────────────────┘
```

### AnkiConnect endpoints used

| Endpoint | Purpose |
|----------|---------|
| `version` | Connectivity check |
| `getActiveProfile` | Enforce "testing" profile only |
| `getProfiles` | Check if "testing" profile exists |
| `deckNames` | Populate deck selector |
| `createDeck` | Auto-create deck |
| `modelNames` | Check note type exists |
| `createModel` | Create "Linguee German Vocabulary" model |
| `addNote` | Create flashcard |
| `canAddNotes` | Duplicate check |
| `findNotes` | Advanced duplicate search |

### Profile safeguard

All Anki write operations are gated through `safeAnkiWrite()` which calls `ensureActiveProfileIsTesting()`. If the active Anki profile is not "testing", the operation is rejected with an error message. The safeguard runs in the service worker — content scripts and popup never call AnkiConnect directly.

---

## Note Type: "Linguee German Vocabulary"

| Field | Description |
|-------|-------------|
| `Word` | German headword (e.g., "Haus") |
| `POS` | Part of speech ("noun", "verb", etc.) |
| `Gender` | "masculine", "feminine", "neuter", or empty |
| `TranslationsHTML` | Common translations with examples (pre-formatted HTML) |
| `LeastCommonHTML` | Less common translations (pre-formatted HTML) |
| `FormsHTML` | Plural / conjugations (pre-formatted HTML) |
| `SourceURL` | Linguee page URL |
| `Notes` | User-editable (initially empty) |

---

## Test Words

Use these to verify extraction across word types:

| Word | Type | What to check |
|------|------|--------------|
| `Haus` | Noun | Gender, plural, common + less common, examples, "often used" badge |
| `laufen` | Verb | Per-translation conjugations, multiple `.lemma` in one `.exact` |
| `See` | Multi-sense | 2 `.exact` divs, 5 total entries (verb/adj senses + masculine/feminine) |
| `schön` | Adjective | No gender/forms, adjective translations |

---

## Directory Layout

```
code/
├── manifest.json              # DEV manifest (Chrome-compatible)
├── manifests/
│   ├── chrome.json            # Chrome: service_worker
│   └── firefox.json           # Firefox: scripts + gecko
├── background.js              # Service worker / event page
├── content.js                 # Content script
├── content.css                # Injected button styles
├── popup/
│   ├── popup.html
│   ├── popup.css
│   └── popup.js
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── build.js                   # Build script
├── package.json               # npm config
└── dist/                      # Build output (gitignored)
    ├── chrome/
    └── firefox/
```
