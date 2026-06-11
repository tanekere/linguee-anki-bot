# AnkiConnect API Documentation

## Overview

**AnkiConnect** is an Anki add-on (Python plugin) that exposes a local HTTP JSON API, enabling external programs (including browser extensions) to interact with Anki programmatically.

- **Default URL**: `http://localhost:8765`
- **Protocol**: HTTP POST with JSON body
- **Response Format**: JSON
- **Add-on ID**: `2055492159` (on AnkiWeb)
- **Repository**: `https://git.sr.ht/~foosoft/anki-connect`

---

## API Protocol

### Request Format

All requests use HTTP POST to `http://localhost:8765` with `Content-Type: application/json`:

```json
{
  "action": "actionName",
  "version": 6,
  "params": { ... },
  "key": null
}
```

| Field     | Type           | Description                                                |
|-----------|----------------|------------------------------------------------------------|
| `action`  | string         | The API action to perform (e.g., `"addNote"`, `"deckNames"`) |
| `version` | integer        | AnkiConnect API version (use `6` for current)               |
| `params`  | object         | Action-specific parameters                                  |
| `key`     | string or null | Authentication key (usually `null` for localhost)           |

### Response Format

Success:
```json
{
  "result": <action-specific result>,
  "error": null
}
```

Error:
```json
{
  "result": null,
  "error": "error description string"
}
```

---

## Core API Endpoints

### 1. `version` — Get AnkiConnect Version

Verify connectivity and get the API version.

```json
{
  "action": "version",
  "version": 6
}
```

**Response**: `{"result": 6, "error": null}`

### 2. `deckNames` — List All Decks

```json
{
  "action": "deckNames",
  "version": 6
}
```

**Response**: `{"result": ["Default", "German::Nouns", "German::Verbs"], "error": null}`

### 3. `deckNamesAndIds` — List Decks with IDs

```json
{
  "action": "deckNamesAndIds",
  "version": 6
}
```

**Response**: `{"result": {"Default": 1, "German::Nouns": 1616259200}, "error": null}`

### 4. `createDeck` — Create a New Deck

Supports hierarchical decks with `::` separator.

```json
{
  "action": "createDeck",
  "version": 6,
  "params": {
    "deck": "German::Vocabulary::Nouns"
  }
}
```

**Response**: `{"result": 1616259201, "error": null}` (returns deck ID)

### 5. `modelNames` — List Note Types

```json
{
  "action": "modelNames",
  "version": 6
}
```

**Response**: `{"result": ["Basic", "Basic (and reversed card)", "Cloze"], "error": null}`

### 6. `modelNamesAndIds` — List Note Types with IDs

```json
{
  "action": "modelNamesAndIds",
  "version": 6
}
```

### 7. `modelFieldNames` — Get Fields of a Note Type

```json
{
  "action": "modelFieldNames",
  "version": 6,
  "params": {
    "modelName": "Basic"
  }
}
```

**Response**: `{"result": ["Front", "Back"], "error": null}`

### 8. `addNote` — Add a Single Note ⭐ (PRIMARY ENDPOINT)

This is the most important endpoint for our use case.

```json
{
  "action": "addNote",
  "version": 6,
  "params": {
    "note": {
      "deckName": "German::Vocabulary",
      "modelName": "Basic",
      "fields": {
        "Front": "Haus (noun, neuter)",
        "Back": "<b>house</b> (n) — most common<br><br>Example: Mein Haus hat drei Schlafzimmer.<br><i>My house has three bedrooms.</i><br><br><b>building</b> (n)<br>Example: Das Haus ist sehr alt.<br><br><span style='color: #888;'><b>Least Common:</b><br>domicile (n) — rare<br>establishment (n) — rare</span>"
      },
      "tags": ["german", "noun"],
      "options": {
        "allowDuplicate": false,
        "duplicateScope": "deck",
        "duplicateScopeOptions": {
          "deckName": "German::Vocabulary",
          "checkChildren": false,
          "checkAllModels": false
        }
      }
    }
  }
}
```

**Success Response**: `{"result": 1677721600, "error": null}` (returns note ID)

**Duplicate Error Response**: `{"result": null, "error": "cannot create note because it is a duplicate"}`

### 9. `addNotes` — Add Multiple Notes (Batch)

Same as `addNote` but accepts an array of notes. Returns an array of note IDs (or `null` for failed entries).

```json
{
  "action": "addNotes",
  "version": 6,
  "params": {
    "notes": [
      { "deckName": "...", "modelName": "...", "fields": {...}, "tags": [...] },
      { "deckName": "...", "modelName": "...", "fields": {...}, "tags": [...] }
    ]
  }
}
```

### 10. `canAddNotes` — Check if Notes Can Be Added

Check for duplicates before adding. Returns array of `true`/`false`.

```json
{
  "action": "canAddNotes",
  "version": 6,
  "params": {
    "notes": [ ... ]
  }
}
```

**Response**: `{"result": [true, false], "error": null}` — the second note is a duplicate.

### 11. `findNotes` — Search Notes by Query

```json
{
  "action": "findNotes",
  "version": 6,
  "params": {
    "query": "deck:German::Vocabulary Haus"
  }
}
```

**Response**: `{"result": [1677721600], "error": null}` (returns array of note IDs)

### 12. `updateNoteFields` — Update Existing Note Fields

```json
{
  "action": "updateNoteFields",
  "version": 6,
  "params": {
    "note": {
      "id": 1677721600,
      "fields": {
        "Front": "Updated front content"
      }
    }
  }
}
```

### 13. `storeMediaFile` — Add Media File

Upload images or audio files to Anki's media collection.

```json
{
  "action": "storeMediaFile",
  "version": 6,
  "params": {
    "filename": "_vocab_image.jpg",
    "data": "<base64-encoded file content>"
  }
}
```

### 14. `createModel` — Create a New Note Type

We may need this to create a custom "Vocabulary" note type with our specific fields.

```json
{
  "action": "createModel",
  "version": 6,
  "params": {
    "modelName": "German Vocabulary",
    "inOrderFields": ["Word", "POS", "Gender", "Translations", "Examples", "LeastCommon", "Audio"],
    "css": ".card { font-family: arial; font-size: 20px; ... }",
    "cardTemplates": [
      {
        "Name": "Recognition",
        "Front": "{{Word}}<br><span class='pos'>{{POS}}{{#Gender}}, {{Gender}}{{/Gender}}</span>",
        "Back": "{{FrontSide}}<hr id=answer>{{Translations}}<br><br>{{#LeastCommon}}<div class='least-common'>Least Common:<br>{{LeastCommon}}</div>{{/LeastCommon}}"
      }
    ]
  }
}
```

### 15. `guiBrowse` — Open Browser

```json
{
  "action": "guiBrowse",
  "version": 6,
  "params": {
    "query": "deck:German::Vocabulary"
  }
}
```

### 16. `guiAddCards` — Open Add Cards Dialog

Pre-populate the add cards dialog in Anki's UI.

```json
{
  "action": "guiAddCards",
  "version": 6,
  "params": {
    "note": {
      "deckName": "German::Vocabulary",
      "modelName": "German Vocabulary",
      "fields": { ... }
    }
  }
}
```

### 17. `sync` — Trigger Sync

```json
{
  "action": "sync",
  "version": 6
}
```

---

## Duplicate Detection

AnkiConnect supports three duplicate scopes:

| Scope        | Description                                                                           |
|--------------|---------------------------------------------------------------------------------------|
| `"deck"`     | Check only within the specified deck (and optionally children)                        |
| `"collection"` | Check across the entire Anki collection                                             |
| `"notetype"` | Check across notes of the same note type (regardless of deck)                        |

### Examples

```json
// Strict: no duplicates in the entire collection
"options": {
  "allowDuplicate": false,
  "duplicateScope": "collection"
}

// Moderate: no duplicates in the deck and its sub-decks
"options": {
  "allowDuplicate": false,
  "duplicateScope": "deck",
  "duplicateScopeOptions": {
    "deckName": "German::Vocabulary",
    "checkChildren": true,
    "checkAllModels": false
  }
}

// Lenient: allow duplicates (always add)
"options": {
  "allowDuplicate": true
}
```

---

## Error Handling

### Common Errors

| Error Message                                    | Cause                                             | Solution                                              |
|--------------------------------------------------|---------------------------------------------------|-------------------------------------------------------|
| `"cannot create note because it is a duplicate"` | Note with same first field already exists         | Use `canAddNotes` first, or set `allowDuplicate: true` |
| `"deck was not found"`                           | Specified deck does not exist                     | Create the deck first with `createDeck`                |
| `"model was not found"`                          | Specified note type does not exist                | Create model with `createModel` or use existing        |
| `"AnkiConnect is not running"`                   | Anki is closed or AnkiConnect not installed       | Prompt user to open Anki and install AnkiConnect       |
| Connection refused                                | Anki is not running                               | Display "Please open Anki" message                     |
| CORS error                                       | Extension trying to access from non-extension ctx | Use background script (service worker) in MV3          |

### Checking AnkiConnect Availability

Before making any API calls, check connectivity:

```javascript
async function checkAnkiConnect() {
  try {
    const response = await fetch('http://localhost:8765', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'version', version: 6 })
    });
    const data = await response.json();
    return data.error === null;
  } catch (e) {
    return false; // Connection refused or timeout
  }
}
```

---

## JavaScript/TypeScript Client Library

Recommended wrapper for browser extensions:

```javascript
// anki-connect.js
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

// Convenience functions
async function getDecks() {
  return ankiInvoke('deckNames');
}

async function createDeck(deckName) {
  return ankiInvoke('createDeck', { deck: deckName });
}

async function addVocabularyCard(deckName, modelName, fields, tags = []) {
  return ankiInvoke('addNote', {
    note: {
      deckName,
      modelName,
      fields,
      tags,
      options: {
        allowDuplicate: false,
        duplicateScope: 'deck',
        duplicateScopeOptions: {
          deckName,
          checkChildren: false,
          checkAllModels: false
        }
      }
    }
  });
}

async function checkDuplicate(deckName, modelName, fields) {
  const result = await ankiInvoke('canAddNotes', {
    notes: [{ deckName, modelName, fields, tags: [] }]
  });
  return !result[0]; // true if duplicate exists
}
```

---

## Alternative: Direct Anki SQLite Access

Anki stores all data in a SQLite database at:
- **Windows**: `%APPDATA%\Anki2\User 1\collection.anki2`
- **macOS**: `~/Library/Application Support/Anki2/User 1/collection.anki2`
- **Linux**: `~/.local/share/Anki2/User 1/collection.anki2`

**Not recommended for browser extension use** because:
1. SQLite is locked while Anki is running (can corrupt database)
2. Anki maintains in-memory state that won't reflect direct DB writes
3. Requires filesystem access not available from browser extensions
4. Schema changes between Anki versions

---

## Alternative: genanki (Python Library)

[genanki](https://github.com/kerrickstaley/genanki) is a Python library for generating Anki `.apkg` files offline.

- **Use case**: Batch generation of decks without Anki running
- **How it works**: Creates `.apkg` files that can be imported into Anki
- **Relevance**: Fallback when AnkiConnect is unavailable; could be used in a Python desktop companion app

```python
import genanki

model = genanki.Model(
    1607392319,
    'German Vocabulary',
    fields=[
        {'name': 'Word'},
        {'name': 'POS'},
        {'name': 'Gender'},
        {'name': 'Translations'},
        {'name': 'Examples'},
    ],
    templates=[
        {
            'name': 'Recognition',
            'qfmt': '{{Word}}<br><span class="pos">{{POS}}, {{Gender}}</span>',
            'afmt': '{{FrontSide}}<hr id=answer>{{Translations}}',
        }
    ],
)

deck = genanki.Deck(2059400110, 'German::Vocabulary')
note = genanki.Note(
    model=model,
    fields=['Haus', 'noun', 'neuter', 'house, building', '...']
)
deck.add_note(note)

genanki.Package(deck).write_to_file('german_vocab.apkg')
```

---

## Summary: Recommended Approach

| Component              | Technology                              |
|------------------------|-----------------------------------------|
| **Primary Integration** | AnkiConnect HTTP API (`localhost:8765`) |
| **Communication**      | JSON POST from browser extension        |
| **Card Creation**      | `addNote` endpoint with HTML in fields  |
| **Deck Management**    | `createDeck`, `deckNames` endpoints      |
| **Duplicate Prevention** | `canAddNotes` check before `addNote`   |
| **Fallback**           | genanki `.apkg` file for offline/batch  |
