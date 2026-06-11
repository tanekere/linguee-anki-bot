# Anki Deck Management

## Overview

This document covers how to programmatically create, manage, and add cards to Anki decks via AnkiConnect. Topics include deck hierarchy, duplicate prevention, note type management, and error handling strategies.

---

## Deck Hierarchy

Anki uses `::` as a path separator for hierarchical decks (subdecks).

### Examples

| Deck Name                          | Structure                                          |
|------------------------------------|----------------------------------------------------|
| `German`                           | Top-level deck                                      |
| `German::Nouns`                    | Sub-deck under German                               |
| `German::Nouns::Common`            | Sub-sub-deck                                        |
| `German::Vocabulary::A1`           | Two levels deep                                      |
| `Languages::German::Food`          | Multi-level hierarchy                                |

### Creating Hierarchical Decks

```javascript
// Create parent
await ankiInvoke('createDeck', { deck: 'German' });

// Create child — AnkiConnect handles intermediate levels automatically
await ankiInvoke('createDeck', { deck: 'German::Vocabulary::Nouns' });
// This creates German, German::Vocabulary, AND German::Vocabulary::Nouns
```

### Listing Decks

```javascript
// Flat list
const decks = await ankiInvoke('deckNames');
// Returns: ["Default", "German", "German::Vocabulary", "German::Vocabulary::Nouns"]

// With IDs
const deckMap = await ankiInvoke('deckNamesAndIds');
// Returns: {"Default": 1, "German": 1234567890, "German::Vocabulary": 1234567891, ...}
```

---

## Complete Workflow: User-Selected Deck

### 1. Get Available Decks

```javascript
async function getAvailableDecks() {
  try {
    const decks = await ankiInvoke('deckNames');
    return decks;
  } catch (e) {
    return []; // Anki not running or AnkiConnect not installed
  }
}
```

### 2. Present Deck Selection UI

The extension should:
- Show a dropdown of existing decks
- Allow typing a new deck name (which will be auto-created)
- Persist the user's choice in `chrome.storage.local`

```javascript
// Save user preference
await chrome.storage.local.set({ selectedDeck: 'German::Vocabulary' });

// Load user preference
const { selectedDeck } = await chrome.storage.local.get('selectedDeck');
```

### 3. Ensure Deck Exists Before Adding Cards

```javascript
async function ensureDeck(deckName) {
  const decks = await ankiInvoke('deckNames');
  if (!decks.includes(deckName)) {
    await ankiInvoke('createDeck', { deck: deckName });
  }
}
```

---

## Adding Cards to a Deck

### Single Card Addition

```javascript
async function addCardToDeck(deckName, modelName, fields, tags = []) {
  // Ensure deck exists
  await ensureDeck(deckName);

  // Check for duplicates first
  const canAdd = await ankiInvoke('canAddNotes', {
    notes: [{ deckName, modelName, fields, tags }]
  });

  if (!canAdd[0]) {
    return { success: false, error: 'duplicate' };
  }

  // Add the note
  const noteId = await ankiInvoke('addNote', {
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
          checkChildren: true,
          checkAllModels: false
        }
      }
    }
  });

  return { success: true, noteId };
}
```

### Batch Card Addition (e.g., Linguee results page)

When extracting multiple words from a page or from a bulk import:

```javascript
async function addCardsBatch(deckName, modelName, notesData) {
  await ensureDeck(deckName);

  // Prepare notes
  const notes = notesData.map(data => ({
    deckName,
    modelName,
    fields: data.fields,
    tags: data.tags || [],
    options: {
      allowDuplicate: false,
      duplicateScope: 'deck',
      duplicateScopeOptions: {
        deckName,
        checkChildren: true,
        checkAllModels: false
      }
    }
  }));

  // Check which can be added
  const canAddResults = await ankiInvoke('canAddNotes', { notes });
  
  // Filter out duplicates
  const newNotes = notes.filter((_, i) => canAddResults[i]);
  const skippedCount = notes.length - newNotes.length;

  // Add non-duplicates
  let addedCount = 0;
  if (newNotes.length > 0) {
    const results = await ankiInvoke('addNotes', { notes: newNotes });
    addedCount = results.filter(r => r !== null).length;
  }

  return { added: addedCount, skipped: skippedCount };
}
```

---

## Duplicate Prevention Strategies

### Strategy 1: Check First Field Match (Default)

Anki's default duplicate detection checks if the **first field** of the note type matches an existing note in the same deck.

For our vocabulary note type, the first field is `Word`. So a duplicate would be detected if `Haus` already exists in the deck.

**Pros**: Simple, fast  
**Cons**: Can't add the same word twice even with different POS (e.g., "laufen" as verb vs. "Laufen" as noun)

### Strategy 2: Custom Query Check

Use `findNotes` to search with a more specific query:

```javascript
async function findExistingNote(deckName, word, pos) {
  const query = `"deck:${deckName}" "Word:${word}" "POS:${pos}"`;
  const noteIds = await ankiInvoke('findNotes', { query });
  return noteIds.length > 0 ? noteIds[0] : null;
}
```

### Strategy 3: Allow Duplicates with Different POS

```javascript
async function addCardAllowSameWordDifferentPOS(deckName, modelName, fields) {
  // Check if exact same word+POS combo exists
  const query = `"deck:${deckName}" "Word:${fields.Word}" "POS:${fields.POS}"`;
  const existing = await ankiInvoke('findNotes', { query });
  
  if (existing.length > 0) {
    return { success: false, error: 'duplicate', existingNoteId: existing[0] };
  }

  const noteId = await ankiInvoke('addNote', {
    note: {
      deckName,
      modelName,
      fields,
      options: { allowDuplicate: true } // Bypass default duplicate check
    }
  });

  return { success: true, noteId };
}
```

### Recommended Strategy for Our Use Case

We should allow the **same word with different POS** (e.g., "laufen" verb and "Laufen" noun) but prevent **exact duplicates**:

```javascript
async function smartAddCard(deckName, fields) {
  // Custom duplicate check: same word AND same POS
  const query = `"deck:${deckName}" "Word:${fields.Word}" "POS:${fields.POS}"`;
  const existing = await ankiInvoke('findNotes', { query });

  if (existing.length > 0) {
    return {
      success: false,
      error: 'duplicate',
      message: `"${fields.Word}" (${fields.POS}) already exists in deck "${deckName}"`
    };
  }

  const noteId = await ankiInvoke('addNote', {
    note: {
      deckName,
      modelName: 'German Vocabulary',
      fields,
      options: { allowDuplicate: true }
    }
  });

  return { success: true, noteId };
}
```

---

## Note Type (Model) Management

### Checking for Note Type Existence

```javascript
async function ensureModel(modelName) {
  const models = await ankiInvoke('modelNames');
  if (!models.includes(modelName)) {
    // Create the "German Vocabulary" note type
    await ankiInvoke('createModel', {
      modelName: modelName,
      inOrderFields: ['Word', 'POS', 'Gender', 'Translations', 'LeastCommon', 'Source', 'Notes'],
      css: `/* full CSS */`,
      cardTemplates: [
        {
          Name: 'Recognition',
          Front: `...`,
          Back: `...`
        }
      ]
    });
  }
}
```

### Updating an Existing Note

When re-extracting a word that already exists (e.g., user wants to refresh data from a different source):

```javascript
async function updateExistingNote(noteId, newFields) {
  await ankiInvoke('updateNoteFields', {
    note: {
      id: noteId,
      fields: newFields
    }
  });
}
```

---

## Error Handling Matrix

| Scenario                              | Detection Method                                     | User Feedback                                    | Recovery                                        |
|---------------------------------------|------------------------------------------------------|--------------------------------------------------|-------------------------------------------------|
| Anki not running                      | `fetch()` throws `TypeError: Failed to fetch`        | "Please open Anki Desktop"                       | Retry button; poll until Anki is available     |
| AnkiConnect not installed             | `version` returns error or connection refused       | "Please install AnkiConnect add-on"              | Link to AnkiConnect install page                |
| Duplicate note                        | `addNote` returns "cannot create note..." error      | "This word already exists in your deck"          | Offer to update existing note or skip           |
| Deck doesn't exist                    | `addNote` returns "deck was not found"               | Auto-create deck (or prompt user)                | Call `createDeck` then retry `addNote`          |
| Note type doesn't exist               | `addNote` returns "model was not found"              | Auto-create note type (or prompt)                | Call `createModel` then retry                   |
| Invalid field name                    | `addNote` returns error about unknown field          | Log error; fix field mapping                     | Check `modelFieldNames` to validate             |
| Network timeout                       | `fetch()` timeout (e.g., Anki frozen)                | "Communication with Anki timed out"              | Retry with exponential backoff                  |

### Graceful Degradation

When AnkiConnect is unavailable, the extension should:

1. **Display a clear status indicator** (red dot = disconnected, green dot = connected)
2. **Save card data locally** (in `chrome.storage.local`) as a queue
3. **Auto-retry** when Anki becomes available
4. **Offer "Export as .apkg"** as a fallback (requires a companion Python script)

```javascript
// Save for later when Anki is unavailable
async function saveOffline(fields) {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  offlineQueue.push({
    fields,
    timestamp: Date.now(),
    deckName: await getSelectedDeck()
  });
  await chrome.storage.local.set({ offlineQueue });
}

// Process queue when Anki reconnects
async function processOfflineQueue() {
  const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
  const remaining = [];
  
  for (const item of offlineQueue) {
    const result = await smartAddCard(item.deckName, item.fields);
    if (!result.success) {
      remaining.push(item);
    }
  }
  
  await chrome.storage.local.set({ offlineQueue: remaining });
  return { processed: offlineQueue.length - remaining.length, remaining: remaining.length };
}
```

---

## Tagging Strategy

Tags help organize cards across decks. Recommended tags for our vocabulary cards:

```javascript
const defaultTags = [
  'german',                           // Language
  fields.POS,                         // noun, verb, adj, adv
  `source:${fields.Source}`,         // source:linguee, source:wiktionary
  `level:${fields.Gender || 'na'}`   // Could be extended for CEFR levels
];
```

Example tagged cards:
- `Haus` → tags: `german`, `noun`, `source:linguee`, `neuter`
- `laufen` → tags: `german`, `verb`, `source:linguee`

---

## Bulk Import from Linguee Search Results

When the user searches a word on Linguee, multiple related terms appear (e.g., "großes Haus", "schönes Haus"). We should:

1. Offer to add the **main word** automatically
2. Show a **list of related terms** with checkboxes for selective addition
3. **Batch add** selected terms

```javascript
async function addRelatedTerms(mainWord, relatedTerms, deckName) {
  const results = [];
  for (const term of relatedTerms) {
    const fields = {
      Word: term.word,
      POS: term.pos,
      Gender: term.gender || '',
      Translations: term.translationsHtml,
      LeastCommon: term.leastCommonHtml || '',
      Source: 'Linguee',
      Notes: term.notes || ''
    };
    const result = await smartAddCard(deckName, fields);
    results.push({ term: term.word, ...result });
  }
  return results;
}
```

---

## Summary: deck-management.js Module

```javascript
// deck-management.js — Complete module for Anki deck operations

export async function getDecks() { /* ... */ }
export async function createDeck(name) { /* ... */ }
export async function ensureDeck(name) { /* ... */ }
export async function ensureModel(name) { /* ... */ }
export async function addCard(deckName, fields) { /* ... */ }
export async function addCardsBatch(deckName, notesData) { /* ... */ }
export async function checkDuplicate(deckName, word, pos) { /* ... */ }
export async function updateCard(noteId, fields) { /* ... */ }
export async function findCardsInDeck(deckName, query) { /* ... */ }
export function isAnkiAvailable() { /* ... */ }
export async function getSelectedDeck() { /* ... */ }
export async function setSelectedDeck(name) { /* ... */ }
```
