# 04 — Anki Integration

## Overview

The service worker handles all AnkiConnect communication. This document covers:
- AnkiConnect API usage patterns
- Note type definition
- Card template HTML/CSS (mirroring Linguee's visual format)
- Deck management
- Duplicate detection
- Offline queue

## AnkiConnect Client

```javascript
// background.js — AnkiConnect client

const ANKI_URL = 'http://localhost:8765';

async function ankiInvoke(action, params = {}) {
  const response = await fetch(ANKI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, version: 6, params })
  });
  const data = await response.json();
  if (data.error) {
    throw new Error(`AnkiConnect error: ${data.error}`);
  }
  return data.result;
}
```

## Note Type: "Linguee German Vocabulary"

### Fields

| Field | Type | Purpose | Example |
|-------|------|---------|---------|
| `Word` | Plain text | German headword (front of card) | `Haus` |
| `POS` | Plain text | Part of speech | `noun` |
| `Gender` | Plain text | Grammatical gender (empty for non-nouns) | `neuter` |
| `TranslationsHTML` | HTML | Common translations + examples (pre-formatted) | See below |
| `LeastCommonHTML` | HTML | Less common translations (may be empty) | See below |
| `FormsHTML` | HTML | Inflections: plural for nouns, conjugations for verbs | `(plural: Häuser)` |
| `SourceURL` | Plain text | Linguee page URL | `https://www.linguee.com/...` |
| `Notes` | Plain text | User notes (initially empty) | `` |

### Why pre-formatted HTML fields?

Using `{{{TripleBraces}}}` in Anki templates renders raw HTML. This lets us replicate Linguee's visual format exactly:
- Translation grouping (common → less common divider)
- Example sentences with indentation
- Frequency badges ("often used")
- POS labels
- The exact same ordering as Linguee

### Note Type Creation via AnkiConnect

```javascript
const NOTE_TYPE_NAME = 'Linguee German Vocabulary';

const NOTE_TYPE_CSS = `
.card {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 18px;
  text-align: center;
  color: #1a1a1a;
  background-color: #ffffff;
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.word {
  font-size: 42px;
  font-weight: 700;
  color: #1d3557;
  margin-bottom: 8px;
  letter-spacing: -0.5px;
}

.word-meta {
  font-size: 16px;
  color: #6c757d;
  margin-bottom: 4px;
}

.word-meta .pos {
  font-style: italic;
}

.word-meta .gender {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  margin-left: 6px;
  color: #fff;
}

.gender-masculine { background-color: #3498db; }
.gender-feminine  { background-color: #e74c3c; }
.gender-neuter    { background-color: #2ecc71; }
.gender-plural    { background-color: #9b59b6; }

.word-forms {
  font-size: 14px;
  color: #868e96;
  margin-top: 6px;
  font-style: italic;
}

hr#answer {
  border: none;
  border-top: 2px solid #e9ecef;
  margin: 16px 0;
}

/* === Translations section === */
.translations-section {
  text-align: left;
}

/* Common translations */
.trans-entry {
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.trans-entry:last-of-type {
  border-bottom: none;
}

.trans-header {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.trans-word {
  font-size: 20px;
  font-weight: 600;
  color: #1d3557;
}

.trans-pos {
  font-size: 14px;
  color: #6c757d;
  font-style: italic;
}

.trans-freq {
  font-size: 12px;
  color: #27ae60;
  font-weight: 500;
  background: #e8f8f0;
  padding: 1px 6px;
  border-radius: 8px;
}

/* Example sentences */
.trans-examples {
  margin-top: 4px;
  margin-left: 16px;
}

.example-pair {
  margin-bottom: 6px;
  padding: 6px 10px;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 3px solid #457b9d;
}

.example-source {
  font-size: 14px;
  color: #34495e;
  font-style: italic;
}

.example-target {
  font-size: 13px;
  color: #6c757d;
  margin-top: 2px;
}

/* Less common section */
.least-common-section {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 2px dashed #dcdde1;
}

.least-common-header {
  font-size: 14px;
  font-weight: 600;
  color: #95a5a6;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.least-common-list {
  font-size: 15px;
  color: #7f8c8d;
  line-height: 1.8;
}

.lc-item {
  white-space: nowrap;
}

.lc-word {
  color: #555;
  font-weight: 500;
}

.lc-pos {
  font-size: 12px;
  font-style: italic;
  color: #adb5bd;
  margin-left: 2px;
}

.lc-separator {
  margin: 0 6px;
  color: #ccc;
}

/* Source */
.source {
  margin-top: 14px;
  font-size: 11px;
  color: #adb5bd;
  text-align: right;
}

/* === Night Mode (Anki Dark Theme) === */
.nightMode .card {
  background-color: #1e1e2e;
  color: #cdd6f4;
}

.nightMode .word {
  color: #cdd6f4;
}

.nightMode .word-meta {
  color: #9399b2;
}

.nightMode .trans-word {
  color: #cdd6f4;
}

.nightMode .trans-pos {
  color: #9399b2;
}

.nightMode .example-pair {
  background-color: #313244;
  border-left-color: #89b4fa;
}

.nightMode .example-source {
  color: #cdd6f4;
}

.nightMode .example-target {
  color: #9399b2;
}

.nightMode hr#answer {
  border-top-color: #45475a;
}

.nightMode .trans-entry {
  border-bottom-color: #45475a;
}

.nightMode .least-common-section {
  border-top-color: #45475a;
}

.nightMode .least-common-header {
  color: #6c7086;
}

.nightMode .least-common-list {
  color: #6c7086;
}

.nightMode .lc-word {
  color: #9399b2;
}

.nightMode .source {
  color: #585b70;
}

.nightMode .gender-masculine { background-color: #1e66f5; }
.nightMode .gender-feminine  { background-color: #d20f39; }
.nightMode .gender-neuter    { background-color: #40a02b; }
.nightMode .gender-plural    { background-color: #8839ef; }
`;

const NOTE_TYPE_FRONT_TEMPLATE = `
<div class="word">{{Word}}</div>
<div class="word-meta">
  <span class="pos">{{POS}}</span>
  {{#Gender}}<span class="gender gender-{{Gender}}">{{Gender}}</span>{{/Gender}}
</div>
{{#FormsHTML}}
<div class="word-forms">{{{FormsHTML}}}</div>
{{/FormsHTML}}
`;

const NOTE_TYPE_BACK_TEMPLATE = `
{{FrontSide}}

<hr id="answer">

<div class="translations-section">
  {{{TranslationsHTML}}}
</div>

{{#LeastCommonHTML}}
<div class="least-common-section">
  <div class="least-common-header">Less Common</div>
  <div class="least-common-list">
    {{{LeastCommonHTML}}}
  </div>
</div>
{{/LeastCommonHTML}}

{{#SourceURL}}
<div class="source">Source: <a href="{{SourceURL}}">Linguee</a></div>
{{/SourceURL}}
`;
```

### Creating the Note Type

```javascript
async function ensureNoteType() {
  const models = await ankiInvoke('modelNames');
  if (models.includes(NOTE_TYPE_NAME)) {
    return; // Already exists
  }
  
  await ankiInvoke('createModel', {
    modelName: NOTE_TYPE_NAME,
    inOrderFields: [
      'Word', 'POS', 'Gender', 'TranslationsHTML',
      'LeastCommonHTML', 'FormsHTML', 'SourceURL', 'Notes'
    ],
    css: NOTE_TYPE_CSS,
    cardTemplates: [{
      Name: 'Recognition',
      Front: NOTE_TYPE_FRONT_TEMPLATE,
      Back: NOTE_TYPE_BACK_TEMPLATE
    }]
  });
}
```

## Card HTML Formatting

The service worker converts extracted WordEntry data into Anki-compatible HTML for the `TranslationsHTML` and `LeastCommonHTML` fields.

### Translation HTML Format

The HTML mirrors Linguee's visual layout: translations in order, with POS labels and example sentences inline.

```javascript
// background.js — Card formatting

function escapeHTML(str) {
  const div = document.createElement('div');  // Note: must use alternative in service worker
  // In service worker (no DOM), use manual escaping:
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTranslationsHTML(translations) {
  return translations
    .filter(t => t.isCommon)  // Only common translations in this field
    .map(t => {
      let html = '<div class="trans-entry">';
      html += '<div class="trans-header">';
      html += `<span class="trans-word">${escapeHTML(t.text)}</span>`;
      
      if (t.pos) {
        html += `<span class="trans-pos">${escapeHTML(t.pos)}</span>`;
      }
      
      if (t.isOftenUsed) {
        html += '<span class="trans-freq">often used</span>';
      }
      
      html += '</div>';  // close trans-header
      
      // Example sentences
      if (t.examples && t.examples.length > 0) {
        html += '<div class="trans-examples">';
        for (const ex of t.examples) {
          html += '<div class="example-pair">';
          html += `<div class="example-source">${escapeHTML(ex.source)}</div>`;
          html += `<div class="example-target">${escapeHTML(ex.target)}</div>`;
          html += '</div>';
        }
        html += '</div>';  // close trans-examples
      }
      
      html += '</div>';  // close trans-entry
      return html;
    })
    .join('\n');
}

function formatLeastCommonHTML(translations) {
  const leastCommon = translations.filter(t => !t.isCommon);
  if (leastCommon.length === 0) return '';
  
  return leastCommon
    .map((t, i) => {
      let html = `<span class="lc-item">`;
      html += `<span class="lc-word">${escapeHTML(t.text)}</span>`;
      if (t.pos) {
        html += `<span class="lc-pos">${escapeHTML(t.pos)}</span>`;
      }
      html += '</span>';
      
      // Add separator between items
      if (i < leastCommon.length - 1) {
        html += '<span class="lc-separator">·</span>';
      }
      
      return html;
    })
    .join('\n');
}

function formatFormsHTML(forms) {
  const parts = [];
  if (forms.plural) {
    parts.push(`Plural: ${escapeHTML(forms.plural)}`);
  }
  if (forms.conjugations) {
    parts.push(`Past: ${escapeHTML(forms.conjugations.join(', '))}`);
  }
  return parts.join(' · ');
}
```

## Adding a Card: Complete Flow

```javascript
async function addEntryToAnki(entry, deckName) {
  // 1. Profile safeguard check
  const profileCheck = await ensureActiveProfileIsTesting();
  if (!profileCheck.ok) {
    return { success: false, error: profileCheck.error, message: profileCheck.message };
  }
  
  // 2. Ensure note type exists
  await ensureNoteType();
  
  // 3. Ensure deck exists
  await ensureDeck(deckName);
  
  // 4. Build field values
  // Combine common and least-common into one array for processing
  const allTranslations = [...entry.commonTranslations, ...entry.leastCommonTranslations];
  
  const fields = {
    Word: entry.word,
    POS: entry.pos,
    Gender: entry.gender || '',
    TranslationsHTML: formatTranslationsHTML(allTranslations),
    LeastCommonHTML: formatLeastCommonHTML(allTranslations),
    FormsHTML: formatFormsHTML(entry.forms),
    SourceURL: entry.sourceURL || '',
    Notes: ''
  };
  
  // 5. Duplicate check (Word + POS in same deck)
  const isDuplicate = await checkDuplicate(deckName, entry.word, entry.pos);
  if (isDuplicate) {
    return {
      success: false,
      error: 'duplicate',
      message: `"${entry.word}" (${entry.pos}) already exists in deck "${deckName}"`
    };
  }
  
  // 6. Add the note
  try {
    const noteId = await ankiInvoke('addNote', {
      note: {
        deckName,
        modelName: NOTE_TYPE_NAME,
        fields,
        tags: ['linguee', entry.pos, `source:linguee`],
        options: {
          allowDuplicate: false,
          duplicateScope: 'deck',
          duplicateScopeOptions: {
            deckName,
            checkChildren: true,
            checkAllModels: false
          }
        }
      }
    });
    
    return { success: true, noteId };
  } catch (e) {
    return { success: false, error: 'add_failed', message: e.message };
  }
}
```

## Duplicate Detection

```javascript
async function checkDuplicate(deckName, word, pos) {
  // Search for existing notes with same Word and POS in the target deck
  const query = `"deck:${deckName}" "Word:${word}" "POS:${pos}"`;
  try {
    const noteIds = await ankiInvoke('findNotes', { query });
    return noteIds.length > 0;
  } catch (e) {
    // If search fails, don't block — let addNote handle it
    return false;
  }
}
```

## Offline Queue

When AnkiConnect is unreachable or the wrong profile is active, cards are queued locally:

```javascript
async function queueForLater(entry, deckName) {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  offlineQueue.push({
    entry,
    deckName,
    timestamp: Date.now(),
    attempts: 0
  });
  await chrome.storage.local.set({ offlineQueue });
}

async function processOfflineQueue() {
  const profileCheck = await ensureActiveProfileIsTesting();
  if (!profileCheck.ok) return { processed: 0, remaining: -1 };
  
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  const remaining = [];
  let processed = 0;
  
  for (const item of offlineQueue) {
    const result = await addEntryToAnki(item.entry, item.deckName);
    if (result.success) {
      processed++;
    } else if (result.error === 'duplicate') {
      processed++;  // Already in Anki, count as success
    } else {
      item.attempts++;
      if (item.attempts < 5) {
        remaining.push(item);
      }
      // After 5 failed attempts, discard
    }
  }
  
  await chrome.storage.local.set({ offlineQueue: remaining });
  return { processed, remaining: remaining.length };
}
```

## Profile Safeguard Integration

See [02-testing-profile-safeguard.md](02-testing-profile-safeguard.md) for detailed implementation. The key function:

```javascript
async function ensureActiveProfileIsTesting() {
  try {
    // Step 1: Check connectivity
    await ankiInvoke('version');
    
    // Step 2: Get active profile
    const activeProfile = await ankiInvoke('getActiveProfile');
    
    // Step 3: Check if it's "testing"
    if (activeProfile === 'testing') {
      return { ok: true };
    }
    
    // Step 4: Check if "testing" profile even exists
    const profiles = await ankiInvoke('getProfiles');
    if (!profiles.includes('testing')) {
      return {
        ok: false,
        error: 'profile_missing',
        message: 'The "testing" profile does not exist in Anki. Please create it: File → Switch Profile → Add Profile → name it "testing".'
      };
    }
    
    // Step 5: Wrong profile is active
    return {
      ok: false,
      error: 'wrong_profile',
      activeProfile,
      message: `Anki is using profile "${activeProfile}", not "testing". Please switch: File → Switch Profile → select "testing".`
    };
  } catch (e) {
    return {
      ok: false,
      error: 'anki_unreachable',
      message: 'Anki is not running or AnkiConnect is not installed. Please open Anki Desktop with AnkiConnect.'
    };
  }
}
```