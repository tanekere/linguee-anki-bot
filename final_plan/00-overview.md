# Linguee-Anki-Bot — Implementation Plan Overview

## Project Summary

A Chrome MV3 browser extension that scrapes vocabulary data from Linguee dictionary pages and adds flashcards to Anki via AnkiConnect. The extension injects "Add to Anki" buttons directly into the Linguee page DOM next to each word entry, and provides a popup for deck selection. **All Anki operations are restricted to a profile named "testing"** to prevent accidental modification of production decks.

## Key Design Principles

1. **DOM-injection UX**: Buttons appear inline on Linguee pages next to each `.exact` entry — no separate UI needed for word selection
2. **Fidelity to Linguee layout**: Cards replicate the same visual ordering and grouping (common translations → less common → examples)
3. **Testing-profile safeguard**: Hardcoded restriction that only allows operations within the "testing" Anki profile
4. **No middleware**: Direct extension → AnkiConnect communication (service worker makes HTTP calls to localhost:8765)
5. **MV3 compliance**: Service worker for background ops, content script for DOM, popup for configuration

## Plan Documents

| Document | Description |
|----------|-------------|
| [01-architecture.md](01-architecture.md) | System architecture, data flow, component responsibilities |
| [02-testing-profile-safeguard.md](02-testing-profile-safeguard.md) | Detailed safeguard design to restrict Anki access to "testing" profile only |
| [03-dom-extraction.md](03-dom-extraction.md) | Content script DOM parsing strategy with verified selectors from live inspection |
| [04-anki-integration.md](04-anki-integration.md) | AnkiConnect integration, note type, deck management, card templates |
| [05-extension-ui.md](05-extension-ui.md) | UI design: injected buttons, popup, status indicators, notifications |
| [06-file-structure.md](06-file-structure.md) | Complete file structure and manifest |
| [07-implementation-order.md](07-implementation-order.md) | Step-by-step build sequence with testing checkpoints |

## Quick Reference: Verified DOM Selectors

From live inspection of `linguee.com`:

| Selector | What it contains | Verified |
|----------|-----------------|----------|
| `.exact` | Entry container (one per lemma) | ✅ |
| `.lemma.featured` | Featured lemma section | ✅ |
| `.lemma_desc` | Word + POS + gender heading (`h2`) | ✅ |
| `.tag_lemma` | Combined word + POS/gender text | ✅ |
| `.tag_wordtype` | Detailed POS string ("noun, neuter") | ✅ |
| `.tag_type[title]` | Abbreviated POS from `title` attr ("noun", "verb") | ✅ |
| `.tag_forms` | Inflected forms ("(ran, run)", "(plural: Häuser)") | ✅ |
| `.tag_forms.forms_verb` | Verb conjugations specifically | ✅ |
| `.tag_forms.forms_plural` | Plural form specifically | ✅ |
| `.tag_c.usedveryoften` | Frequency indicator "(often used)" | ✅ |
| `.notascommon` | "less common:" label | ✅ |
| `.translation.featured` | Common/featured translation | ✅ |
| `.translation.translation_first` | First item in a group | ✅ |
| `.translation_group` | Group of less-common translations | ✅ |
| `.dictLink` | Translation word link | ✅ |
| `.dictLink.featured` | Featured/common translation link | ✅ |
| `.example_lines` | Example sentence container | ✅ |
| `.tag_s` | Source-language sentence text | ✅ |
| `.tag_t` | Target-language sentence text | ✅ |
| `.dash` | Separator between source and target | ✅ |
| `.audio` | Audio playback button with MP3 URL | ✅ |
| `.formLink` | Inflected form link (in tag_forms) | ✅ |

## Quick Reference: Anki Note Type

**Model name**: `Linguee German Vocabulary`

| Field | Content |
|-------|---------|
| `Word` | German headword (e.g., "Haus") |
| `POS` | Part of speech (e.g., "noun") |
| `Gender` | Grammatical gender (e.g., "neuter"; empty for non-nouns) |
| `TranslationsHTML` | Common translations + examples (pre-formatted HTML) |
| `LeastCommonHTML` | Less common translations (pre-formatted HTML; may be empty) |
| `FormsHTML` | Inflection info (plural for nouns, conjugations for verbs; HTML) |
| `SourceURL` | Linguee page URL |
| `Notes` | Additional notes (user-editable; initially empty) |

## Quick Reference: AnkiConnect Endpoints Used

| Endpoint | Purpose |
|----------|---------|
| `version` | Check connectivity |
| `getProfiles` | List Anki profiles (for "testing" safeguard) |
| `getActiveProfile` | Get currently active profile |
| `loadProfile` | Switch to "testing" profile if needed |
| `deckNames` | List available decks |
| `createDeck` | Create a deck under "testing" profile |
| `modelNames` | Check if our note type exists |
| `createModel` | Create "Linguee German Vocabulary" note type |
| `addNote` | Add a flashcard |
| `canAddNotes` | Duplicate check |
| `findNotes` | Advanced duplicate search |

## AnkiConnect Profile Note

AnkiConnect's `getProfiles` and `loadProfile` APIs require the user to have configured Anki with multiple profiles. The "testing" profile must be created by the user in Anki Desktop before using the extension. The extension will verify the profile exists and is active before any write operations.