# Integration Architecture

## Overview

This document defines the full system architecture — how a browser extension extracts vocabulary data from Linguee/Wiktionary/Glosbe, formats it, and writes it to Anki.

---

## Architecture Decision: Direct Extension → AnkiConnect vs. Python Middleware

### Recommendation: **Direct Extension → AnkiConnect** (No Middleware) ✅

```
┌──────────────────┐      HTTP/HTML       ┌──────────────────────┐
│  Linguee.com     │ <─────────────────── │  Browser Extension    │
│  Wiktionary.org  │                      │  (MV3 Chrome Ext.)   │
│  Glosbe.com      │                      │                      │
└──────────────────┘                      │  1. Content Script   │
                                          │     - Scrapes data   │
                                          │     - Extracts vocab │
┌──────────────────┐     HTTP POST        │                      │
│  Anki Desktop    │ <─────────────────── │  2. Service Worker   │
│  + AnkiConnect   │     localhost:8765  │     - Formats HTML    │
│  (Python Add-on) │                      │     - Calls AnkiCon.  │
└──────────────────┘                      │                      │
                                          │  3. Popup UI         │
                                          │     - Deck selection  │
                                          │     - Add button      │
                                          │     - Status display  │
                                          └──────────────────────┘
```

### Why Not Python Middleware?

| Factor                  | Direct Extension                     | Python Middleware                         |
|-------------------------|--------------------------------------|-------------------------------------------|
| **Installation**        | Just the extension + AnkiConnect     | Extension + Python + dependencies         |
| **Latency**             | ~50ms (local HTTP)                   | ~100-200ms (additional hop)               |
| **Reliability**         | Fewer failure points                 | Middleware can crash independently        |
| **Cross-platform**      | Works on all Chrome/Firefox OSes     | Python setup varies by OS                 |
| **Offline LLM support** | Not possible (browser JS limited)   | Possible with local LLM                   |

### When to Add Python Middleware (Future Enhancement)

If we add LLM-powered extraction (e.g., using Ollama or an API to clean/format data), a Python desktop companion app would be justified:

```
┌──────────────────┐      HTTP/HTML       ┌──────────────────────┐     WebSocket/HTTP     ┌──────────────────────┐
│  Linguee.com     │ <─────────────────── │  Browser Extension    │ ──────────────────────>│  Python Desktop App  │
│  Wiktionary.org  │                      │  (MV3 Chrome Ext.)   │ <──────────────────────│  (LLM Middleware)     │
│  Glosbe.com      │                      │                      │                        │                      │
└──────────────────┘                      │  • Scrapes raw data  │                        │  • Ollama/Local LLM  │
                                          │  • Sends to Python   │                        │  • Cleans & formats  │
                                          └──────────────────────┘                        │  • Calls AnkiConnect │
                                                                                           └──────────────────────┘
                                                                                                     │
                                                                                            HTTP POST │ localhost:8765
                                                                                                     │
                                                                                           ┌──────────────────────┐
                                                                                           │  Anki Desktop        │
                                                                                           │  + AnkiConnect       │
                                                                                           └──────────────────────┘
```

---

## Data Flow: Word Lookup → Anki Card

### Phase 1: Word Lookup

**Trigger**: User searches/navigates to a word page on Linguee, Wiktionary, or Glosbe.

```
User visits: https://www.linguee.com/german-english/search?source=auto&query=Haus
```

The **content script** detects the page is a dictionary result and extracts structured data.

### Phase 2: Data Extraction (Content Script)

```javascript
// content.js — injected into Linguee pages
function extractLingueeData() {
  const word = document.querySelector('.exact .tag_lemma')?.textContent?.trim();
  const pos = document.querySelector('.exact .tag_type')?.textContent?.trim(); // "noun"
  const gender = document.querySelector('.exact .tag_gen')?.textContent?.trim(); // "neuter"
  
  const translations = [];
  document.querySelectorAll('.exact .translation_group').forEach(group => {
    const transWord = group.querySelector('.tag_trans a')?.textContent?.trim();
    const transPOS = group.querySelector('.tag_type')?.textContent?.trim();
    const freq = group.classList.contains('less_common') ? 'less_common' : 'common';
    
    const examples = [];
    group.querySelectorAll('.example_lines .example').forEach(ex => {
      const deSentence = ex.querySelector('.tag_s')?.textContent?.trim();
      const enSentence = ex.querySelector('.tag_t')?.textContent?.trim();
      if (deSentence && enSentence) {
        examples.push({ de: deSentence, en: enSentence });
      }
    });
    
    translations.push({ word: transWord, pos: transPOS, freq, examples });
  });
  
  return { word, pos, gender, translations };
}
```

**Extracted Data Structure**:

```json
{
  "word": "Haus",
  "pos": "noun",
  "gender": "neuter",
  "translations": [
    {
      "word": "house",
      "pos": "n",
      "freq": "common",
      "examples": [
        { "de": "Mein Haus hat drei Schlafzimmer.", "en": "My house has three bedrooms." },
        { "de": "Hinter dem Haus ist ein Hof.", "en": "There is a yard behind the house." }
      ]
    },
    {
      "word": "building",
      "pos": "n",
      "freq": "common",
      "examples": []
    },
    {
      "word": "domicile",
      "pos": "n",
      "freq": "less_common",
      "examples": [{ "de": "...", "en": "..." }]
    }
  ],
  "source": "Linguee"
}
```

### Phase 3: HTML Formatting (Service Worker)

The service worker converts extracted data into HTML fields for Anki:

```javascript
// format-card.js
function formatTranslationsHTML(translations) {
  const common = translations.filter(t => t.freq !== 'less_common');
  
  return common.map(t => `
    <div class="trans-entry">
      <div class="trans-word">
        <span class="trans-text">${escapeHTML(t.word)}</span>
        <span class="trans-pos">${t.pos || ''}</span>
      </div>
      ${t.examples.length > 0 ? `
        <div class="trans-examples">
          ${t.examples.map(ex => `
            <div class="example">
              <div class="example-de">${escapeHTML(ex.de)}</div>
              <div class="example-en">${escapeHTML(ex.en)}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('');
}

function formatLeastCommonHTML(translations) {
  const rare = translations.filter(t => t.freq === 'less_common');
  if (rare.length === 0) return '';
  
  return rare.map(t => `
    <span class="lc-item">
      <span class="lc-text">${escapeHTML(t.word)}</span>
      <span class="lc-pos">${t.pos || ''}</span>
    </span>
  `).join(' · ');
}

function escapeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
```

### Phase 4: AnkiConnect Communication (Service Worker)

```javascript
// anki-send.js
async function sendToAnki(deckName, extractedData) {
  const translationsHTML = formatTranslationsHTML(extractedData.translations);
  const leastCommonHTML = formatLeastCommonHTML(extractedData.translations);
  
  const fields = {
    Word: extractedData.word,
    POS: extractedData.pos,
    Gender: extractedData.gender || '',
    Translations: translationsHTML,
    LeastCommon: leastCommonHTML,
    Source: extractedData.source || 'Linguee',
    Notes: ''
  };

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'ADD_TO_ANKI',
      deckName,
      fields
    });
    return result;
  } catch (e) {
    return { success: false, error: e.message };
  }
}
```

### Phase 5: Card in Anki

The AnkiConnect `addNote` call places the HTML-rich fields into the note type. When the user reviews, Anki renders the card templates with `{{{Translations}}}` (triple braces preserve the HTML).

---

## Extension Manifest (MV3)

```json
{
  "manifest_version": 3,
  "name": "Linguee Anki Bot",
  "version": "1.0.0",
  "description": "Extract German-English vocabulary from Linguee, Wiktionary, and Glosbe into Anki flashcards.",
  "permissions": ["activeTab", "storage", "scripting"],
  "host_permissions": [
    "http://localhost:8765/*",
    "https://www.linguee.com/*",
    "https://*.wiktionary.org/*",
    "https://glosbe.com/*"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "background": {
    "service_worker": "background.js"
  },
  "content_scripts": [
    {
      "matches": [
        "https://www.linguee.com/*",
        "https://*.wiktionary.org/*",
        "https://glosbe.com/*"
      ],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ],
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

---

## Component Communication Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER EXTENSION                         │
│                                                                   │
│  ┌─────────────┐     Message      ┌───────────────────────────┐ │
│  │  popup.js    │ ◄────────────── │  background.js            │ │
│  │              │                 │  (Service Worker)         │ │
│  │ • Deck list  │                 │                           │ │
│  │ • Add button │                 │  • AnkiConnect client     │ │
│  │ • Settings   │                 │  • HTML formatter         │ │
│  │ • Status     │ ────────────────│  • Offline queue          │ │
│  └─────────────┘     Message      │  • Storage management     │ │
│                                     └───────────┬───────────────┘ │
│                                                 │                 │
│  ┌─────────────┐     Message      ┌─────────────┴───────────────┐ │
│  │ content.js   │ ◄────────────── │  format-card.js             │ │
│  │              │                 │                             │ │
│  │ • Linguee    │                 │  • formatTranslationsHTML() │ │
│  │   extractor  │                 │  • formatLeastCommonHTML()  │ │
│  │ • Wiktionary │                 │  • escapeHTML()             │ │
│  │   extractor  │                 └─────────────────────────────┘ │
│  │ • Glosbe    │                                                   │
│  │   extractor  │                                                   │
│  └─────────────┘                                                   │
│                                                                     │
│  ┌─────────────┐                                                   │
│  │ storage.js   │  • Save/Load user preferences                    │
│  │              │  • Save/Load offline queue                       │
│  └─────────────┘                                                   │
└─────────────────────────────────────────────────────────────────┘
         │                    ▲
         │ HTTP POST          │ JSON Response
         ▼                    │
┌─────────────────────────────────────────────────────────────────┐
│                    ANKI DESKTOP (localhost)                       │
│                                                                   │
│  ┌───────────────────┐    Python API    ┌──────────────────────┐ │
│  │  AnkiConnect       │ ◄───────────── │  Anki Core            │ │
│  │  (Add-on 2055492159)│               │                       │ │
│  │                    │               │  • Note storage       │ │
│  │  HTTP Server       │               │  • Card scheduling    │ │
│  │  Port: 8765        │               │  • Review system      │ │
│  │                    │               │  • Collection DB      │ │
│  └───────────────────┘               └──────────────────────┘ │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Experience Flow

```
1. USER VISITS LINGUEE PAGE
   ┌──────────────────────────────────────────┐
   │  Linguee: "Haus"                         │
   │  ┌──────────────────────────────────────┐ │
   │  │ Haus noun, neuter                    │ │
   │  │ 🏠 house n (often used)              │ │
   │  │   "Mein Haus hat drei Schlafzimmer." │ │
   │  │                                      │ │
   │  │ [+ Add to Anki]  ← Extension button  │ │
   │  └──────────────────────────────────────┘ │
   └──────────────────────────────────────────┘

2. USER CLICKS EXTENSION ICON
   ┌──────────────────────┐
   │  Linguee Anki Bot    │
   │                      │
   │  Word: Haus          │
   │  POS: noun · neuter  │
   │                      │
   │  Deck: [German::Voc] │ ← dropdown
   │                      │
   │  ☑ Include examples  │
   │  ☑ Include rare      │
   │                      │
   │  [ Add to Anki ]     │
   │                      │
   │  ✅ Added!           │ ← success message
   └──────────────────────┘

3. RESULT IN ANKI
   When user reviews, they see:
   
   Front:
   ┌──────────────────────┐
   │        Haus          │
   │    noun · neuter     │
   └──────────────────────┘
   
   Back:
   ┌──────────────────────┐
   │ Haus · noun · neuter │
   │ ──────────────────── │
   │ house (n)            │
   │   "Mein Haus hat..." │
   │   My house has...    │
   │ building (n)         │
   │ ════════════════════ │
   │ Least Common         │
   │ domicile · dwell.    │
   └──────────────────────┘
```

---

## Multi-Source Strategy

The extension should support extracting from multiple sources:

| Source       | URL Pattern                              | Extractor Module     | Strengths                          |
|-------------|------------------------------------------|----------------------|------------------------------------|
| **Linguee** | `linguee.com/*/search?query=*`           | `linguee-extractor.js` | Most example sentences, translations ranked by frequency |
| **Wiktionary** | `*.wiktionary.org/wiki/*`            | `wiktionary-extractor.js` | Rich metadata (etymology, IPA, conjugations) |
| **Glosbe**  | `glosbe.com/*/*?query=*`                 | `glosbe-extractor.js` | Good for less common languages, community translations |

### Source Selection Logic

```javascript
function detectSource(url) {
  if (url.includes('linguee.com')) return 'linguee';
  if (url.includes('wiktionary.org')) return 'wiktionary';
  if (url.includes('glosbe.com')) return 'glosbe';
  return 'unknown';
}

function extractData(url) {
  const source = detectSource(url);
  switch (source) {
    case 'linguee': return extractLinguee();
    case 'wiktionary': return extractWiktionary();
    case 'glosbe': return extractGlosbe();
    default: return null;
  }
}
```

### Data Normalization

All extractors should output the same normalized format:

```typescript
interface VocabData {
  word: string;           // Lemma form
  pos: string;            // Part of speech
  gender?: string;        // masculine/feminine/neuter (nouns only)
  translations: Translation[];
  source: string;         // 'linguee' | 'wiktionary' | 'glosbe'
  notes?: string;          // Extra info (plural, conjugations)
}

interface Translation {
  word: string;           // Target language word
  pos?: string;           // Target language POS
  freq: 'common' | 'less_common';  // Frequency category
  examples: Example[];
}

interface Example {
  de: string;             // Source language sentence
  en: string;             // Target language sentence
}
```

---

## Error States & Edge Cases

### Anki Not Running
- Status indicator in popup: 🔴 "Anki not connected"
- "Add to Anki" button disabled
- "Start Anki Desktop" link/button
- Auto-retry every 5 seconds when popup is open

### AnkiConnect Not Installed
- Detect via `version` API failure
- Show instructional message with install link
- Link: `https://ankiweb.net/shared/info/2055492159`

### Page Not a Dictionary Page
- Content script checks for known DOM structures
- If no dictionary data found, extension popup shows: "No vocabulary data found on this page. Navigate to a Linguee, Wiktionary, or Glosbe word page."

### Mixed Content (HTTPS → HTTP)
- Chrome blocks HTTPS pages from calling HTTP localhost
- Solution: Service workers in MV3 can make HTTP requests to localhost
- All AnkiConnect calls go through `background.js` (service worker), not content script

### Duplicate Detection
- Check `canAddNotes` before `addNote`
- Show friendly message: "Haus (noun) already exists in German::Vocabulary"
- Offer "Update existing card" option

---

## File Structure for Extension

```
linguee-anki-extension/
├── manifest.json
├── background.js           # Service worker: AnkiConnect API calls
├── content.js              # Content script: page scraping
├── content.css             # Styles for injected UI elements
├── popup.html              # Extension popup
├── popup.js                # Popup logic
├── popup.css               # Popup styles
├── anki-connect.js         # AnkiConnect client wrapper
├── format-card.js          # HTML formatting for card templates
├── extractors/
│   ├── linguee.js          # Linguee page parser
│   ├── wiktionary.js       # Wiktionary page parser
│   └── glosbe.js           # Glosbe page parser
├── storage.js              # chrome.storage wrapper
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── _locales/               # i18n (optional)
    └── en/
        └── messages.json
```

---

## Fallback: Python genanki Script

For offline/batch usage or when AnkiConnect is unavailable:

```python
# genanki_vocab.py — Standalone script for batch generation
import genanki
import json
import sys

MODEL_ID = 1607392319
DECK_ID = 2059400110

model = genanki.Model(
    MODEL_ID,
    'German Vocabulary',
    fields=[
        {'name': 'Word'}, {'name': 'POS'}, {'name': 'Gender'},
        {'name': 'Translations'}, {'name': 'LeastCommon'},
        {'name': 'Source'}, {'name': 'Notes'}
    ],
    templates=[{
        'name': 'Recognition',
        'qfmt': '<div class="word">{{Word}}</div><div class="meta"><span class="pos">{{POS}}</span>{{#Gender}}<span class="gender">{{Gender}}</span>{{/Gender}}</div>',
        'afmt': '{{FrontSide}}<hr id="answer"><div class="translations">{{{Translations}}}</div>{{#LeastCommon}}<div class="least-common">Least Common: {{{LeastCommon}}}</div>{{/LeastCommon}}'
    }],
    css=open('card-styles.css').read()
)

deck = genanki.Deck(DECK_ID, 'German::Vocabulary')

# Read JSON from stdin (piped from extension)
data = json.load(sys.stdin)
for item in data:
    note = genanki.Note(
        model=model,
        fields=[
            item.get('word', ''),
            item.get('pos', ''),
            item.get('gender', ''),
            item.get('translations', ''),
            item.get('leastCommon', ''),
            item.get('source', ''),
            item.get('notes', '')
        ]
    )
    deck.add_note(note)

genanki.Package(deck).write_to_file('german_vocab.apkg')
print(f"Created german_vocab.apkg with {len(data)} cards")
```

---

## Summary

| Layer              | Technology                        | Responsibility                                |
|--------------------|-----------------------------------|-----------------------------------------------|
| **UI**             | HTML/CSS/JS (Chrome Extension)   | Popup, settings, user feedback                |
| **Data Extraction**| Content Script (JS)              | Parse dictionary pages, normalize data       |
| **Formatting**     | JS (Service Worker)              | Convert data to Anki-compatible HTML          |
| **Storage**        | chrome.storage.local             | Preferences, offline queue                    |
| **Communication**  | HTTP POST to localhost:8765      | Send formatted data to Anki                   |
| **Anki Bridge**    | AnkiConnect (Python Add-on)      | Translate HTTP to Anki Python API             |
| **Anki Core**      | SQLite DB, Scheduler, Reviewer   | Store cards, schedule reviews                 |
| **Fallback**       | Python + genanki                 | Generate .apkg files offline/batch            |
