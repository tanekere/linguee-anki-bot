# 07 — Implementation Order

## Overview

This document defines the build sequence with testing checkpoints. Each phase produces a working, testable increment.

## Phase 1: Service Worker — AnkiConnect Client & Profile Guard

**Goal**: A service worker that can talk to AnkiConnect and enforce the "testing" profile safeguard.

### Steps

1. **Create `manifest.json`** with minimal content_scripts (no injection yet) and service_worker registration
2. **Create `background.js`** with:
   - `ankiInvoke()` — generic AnkiConnect HTTP client
   - `checkAnkiConnect()` — version check
   - `ensureActiveProfileIsTesting()` — profile guard
   - `verifyTestingProfileExists()` — check profiles list
   - `safeAnkiWrite()` — wrapper that checks profile before any write
3. **Test**: Load extension in Chrome using the "testing" profile, open Anki Desktop with AnkiConnect, verify:
   - `version` call succeeds
   - `getActiveProfile` returns "testing"
   - `getProfiles` lists "testing"
   - `safeAnkiWrite` blocks when wrong profile is active

### Testing Checklist

- [ ] Service worker can reach AnkiConnect at localhost:8765
- [ ] `getActiveProfile` returns correct profile name
- [ ] Profile guard blocks writes when not on "testing" profile
- [ ] Profile guard allows writes when on "testing" profile
- [ ] Extension loads without errors in chrome://extensions

---

## Phase 2: Service Worker — Note Type & Deck Management

**Goal**: Create the "Linguee German Vocabulary" note type and manage decks.

### Steps

1. **Add `ensureNoteType()`** to service worker — creates model with fields and card templates
2. **Add `ensureDeck()`** — creates deck if it doesn't exist
3. **Add `getDecks()`** — lists available decks
4. **Add `checkDuplicate()`** — uses `findNotes` to check for Word+POS matches
5. **Add note type CSS and templates** (from 04-anki-integration.md)
6. **Test**: Verify note type creation in Anki, deck list retrieval

### Testing Checklist

- [ ] "Linguee German Vocabulary" note type is created with 8 fields
- [ ] Front template renders Word + POS + Gender correctly
- [ ] Back template renders TranslationsHTML correctly
- [ ] Deck creation works under "testing" profile
- [ ] `deckNames` returns expected decks
- [ ] Duplicate detection finds existing notes by Word+POS

---

## Phase 3: Content Script — DOM Extraction

**Goal**: Parse a Linguee page and extract structured WordEntry data.

### Steps

1. **Create `content.js`** with:
   - `detectLingueePage()` — URL pattern matching
   - `extractWordEntries()` — main extraction function
   - `extractSingleEntry(exactDiv)` — parse one `.exact` div
   - `extractTranslation(transEl)` — parse one translation
   - `extractExamples(exampleLinesEl)` — parse example pairs
   - `extractInexactTranslations(groupEl)` — parse less-common translations
2. **Create `content.css`** with minimal styles (just for testing visibility)
3. **Test**: Open Linguee page for "Haus", verify extraction in DevTools console

### Testing Checklist

- [ ] "Haus" (noun) extracts correctly: word, pos, gender, plural
- [ ] "laufen" (verb) extracts correctly: word, pos, conjugations
- [ ] "schön" (adjective) extracts correctly
- [ ] Common translations are extracted with POS and examples
- [ ] Less common translations are extracted and marked `isCommon: false`
- [ ] "(often used)" tag is detected
- [ ] Example sentence pairs are correctly extracted (source + target)
- [ ] Multiple `.exact` divs on one page each produce separate entries

### Key Test Words

| Word | What it tests |
|------|--------------|
| `Haus` | Noun with gender, plural, common + less common translations, examples |
| `laufen` | Verb with conjugations, many translations |
| `schön` | Multiple senses (adjective + adverb) |
| `sich erinnern` | Reflexive verb |
| `auf|machen` | Separable verb |
| `fuer` | Umlaut handling |

---

## Phase 4: Content Script — Button Injection

**Goal**: Inject "Add to Anki" buttons on Linguee pages.

### Steps

1. **Add `injectAddButtons(entries)`** to content.js
2. **Add button CSS** to content.css (all states: idle, adding, added, error, disabled, duplicate)
3. **Add click handler** that sends `ADD_TO_ANKI` message to service worker
4. **Add button state management** (idle → adding → added/error/duplicate)
5. **Add status polling** — check AnkiConnect status every 10 seconds
6. **Add toast notification system** — `showToast()` function

### Testing Checklist

- [ ] Buttons appear next to each `.exact` entry on Linguee pages
- [ ] Buttons show correct text for each state
- [ ] Click on button sends correct message to service worker
- [ ] Button states update correctly (adding → added, adding → error)
- [ ] Disabled state shown when Anki not connected
- [ ] Toast notifications appear for success/error
- [ ] Buttons don't re-inject on page navigation (MutationObserver or guard)

---

## Phase 5: Service Worker — Add Note Integration

**Goal**: Wire up the full flow from button click → AnkiConnect addNote.

### Steps

1. **Add `addEntryToAnki(entry, deckName)`** to service worker — full flow with all checks
2. **Add `formatTranslationsHTML()`** — convert translations to Anki field HTML
3. **Add `formatLeastCommonHTML()`** — convert less-common translations
4. **Add `formatFormsHTML()`** — format plural/conjugation info
5. **Add message handler** for `ADD_TO_ANKI` from content script
6. **Add message handler** for `GET_STATUS` and `GET_DECKS` from popup
7. **Add offline queue** — `queueForLater()` and `processOfflineQueue()`

### Testing Checklist

- [ ] Clicking "Add to Anki" for "Haus" creates a card in Anki
- [ ] Card front shows "Haus" with "noun · neuter" and "plural: Häuser"
- [ ] Card back shows translations in correct order (common, then less common)
- [ ] Example sentences render correctly with styling
- [ ] "often used" badge shows for tagged translations
- [ ] Less common section appears when applicable
- [ ] Duplicate detection prevents adding the same word twice
- [ ] Wrong profile → error message shown on button
- [ ] Anki not running → card queued offline
- [ ] Queue processes when Anki reconnects
- [ ] Night mode (Anki dark theme) renders correctly

---

## Phase 6: Popup UI

**Goal**: Functional popup for deck selection and status display.

### Steps

1. **Create `popup/popup.html`** — main layout with status, deck selector, stats
2. **Create `popup/popup.css`** — popup styling
3. **Create `popup/popup.js`** — popup logic
4. **Wire up deck selection** — GET_DECKS, SET_DECK messages
5. **Add deck creation UI** — CREATE_DECK message
6. **Add queue processing** — PROCESS_QUEUE button
7. **Add status display** — connection status, profile indicator

### Testing Checklist

- [ ] Popup opens and shows current status
- [ ] Deck selector lists available decks
- [ ] Deck selector defaults to last-used deck
- [ ] Creating a new deck works
- [ ] Queue count updates correctly
- [ ] Process Queue button works
- [ ] Error states display correctly (wrong profile, disconnected)
- [ ] Check Again button refreshes AnkiConnect status

---

## Phase 7: Polish & Edge Cases

**Goal**: Handle edge cases, improve UX, and prepare for release.

### Steps

1. **Handle multi-sense words** — "schön" (adj) and "schön" (adv) should produce separate cards
2. **Handle "no results" pages** — show "No vocabulary data" message
3. **Handle network errors** — retry logic with exponential backoff
4. **Handle AnkiConnect CORS config** — add `webCorsOriginList` note
5. **Normalize whitespace** — `textContent.trim().replace(/\s+/g, ' ')` on all extracted fields
6. **Handle page navigation** (SPA-like behavior) — Linguee may update URL without full reload; detect this and re-inject buttons
7. **Add confirmation dialog** for "Add to Anki" when deck context is unclear
8. **Add right-click context menu** for alternative selection (optional)
9. **Icon design** — create icon-16.png, icon-48.png, icon-128.png
10. **Comprehensive error messages** — user-friendly text for all failure scenarios

### Testing Checklist

- [ ] Multi-sense words create separate cards for each `.exact` div
- [ ] "No results" pages show appropriate message
- [ ] Network errors are handled gracefully
- [ ] Whitespace normalization works on all text fields
- [ ] Page navigation (back/forward) re-injects buttons
- [ ] Icons display correctly in Chrome toolbar and extensions page
- [ ] All error messages are user-friendly
- [ ] Extension works on both search and translation URL patterns

---

## Phase 8: Testing Profile Safeguard — Comprehensive Test

**Goal**: Verify that the "testing" profile safeguard works in all scenarios.

### Test Matrix

| Scenario | Profile | Expected Behavior |
|----------|---------|-------------------|
| Anki not running | N/A | Button shows "No Anki", cards queued |
| AnkiConnect not installed | N/A | Button shows "No Anki", cards queued |
| Profile = "testing" | testing | Everything works |
| Profile = "User" (default) | User | Button shows "Wrong Profile", cards NOT queued |
| Profile = "testing" but user switches mid-session | testing → User | Next add attempt shows "Wrong Profile" |
| "testing" profile doesn't exist | N/A | Popup shows setup guide, no operations allowed |
| Multiple `.exact` entries on one page | testing | Each entry gets its own button and card |
| Rapid clicks on same button | testing | Second click does nothing while first is processing |

### Automated Test Commands

```bash
# Verify AnkiConnect is reachable
curl -sS localhost:8765 -d '{"action":"version","version":6}'

# Verify profile
curl -sS localhost:8765 -d '{"action":"getActiveProfile","version":6}'

# List profiles
curl -sS localhost:8765 -d '{"action":"getProfiles","version":6}'

# Verify note type
curl -sS localhost:8765 -d '{"action":"modelNames","version":6}'

# Verify deck creation
curl -sS localhost:8765 -d '{"action":"createDeck","version":6,"params":{"deck":"testing--German::Vocabulary"}}'

# List decks
curl -sS localhost:8765 -d '{"action":"deckNames","version":6}'

# Test adding a card
curl -sS localhost:8765 -d '{"action":"addNote","version":6,"params":{"note":{"deckName":"testing--German::Vocabulary","modelName":"Linguee German Vocabulary","fields":{"Word":"Haus","POS":"noun","Gender":"neuter","TranslationsHTML":"<div class=\"trans-entry\"><span class=\"trans-word\">house</span><span class=\"trans-pos\">n</span></div>","LeastCommonHTML":"","FormsHTML":"Plural: Häuser","SourceURL":"https://www.linguee.com/german-english/search?source=auto&query=Haus","Notes":""},"tags":["linguee","noun","source:linguee"]}}}'
```

---

## Development Environment Setup

1. **Open Chrome** with the "testing" profile
2. **Enable Developer Mode** in `chrome://extensions`
3. **Load extension** as "Unpacked" from the project directory
4. **Open Anki Desktop** with AnkiConnect installed
5. **Create "testing" profile** in Anki: File → Switch Profile → Add
6. **Switch to "testing" profile** in Anki
7. **Navigate to** `https://www.linguee.com/german-english/search?source=auto&query=Haus`
8. **Open DevTools** (F12) to inspect content script and service worker logs

### Chrome Profile Specifics

Since we must ONLY use the "testing" Chrome profile:
- Open `chrome://profilemanager` or use the profile switcher in Chrome settings
- Create a new profile named "testing"
- Use this profile exclusively for extension development and testing
- NEVER test in your personal/production Chrome profile

### AnkiConnect CORS Configuration

For the extension to work, AnkiConnect must accept requests from the Chrome extension. This is usually automatic for `localhost:8765` requests from browser extensions. However, if CORS issues arise:

1. Open Anki
2. Go to Tools → Add-ons → AnkiConnect → Config
3. Add to `webCorsOriginList`:
```json
{
  "webCorsOriginList": [
    "chrome-extension://*"
  ]
}
```
4. Restart Anki