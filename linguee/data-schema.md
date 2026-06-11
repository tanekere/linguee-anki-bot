# Linguee Data Schema

## Overview
This document defines the exact data fields extractable from Linguee search results, their types, and how they map to the DOM.

---

## Root Object: `WordEntry`

Complete dictionary entry for a word lookup.

```json
{
  "word": "Haus",
  "part_of_speech": "noun",
  "gender": "neuter",
  "plural": "Häuser",
  "source_lang": "de",
  "target_lang": "en",
  "translations": [
    {
      "text": "house",
      "part_of_speech": "n",
      "is_common": true,
      "usage_note": "often used",
      "examples": [
        {
          "source": "Mein Haus hat drei Schlafzimmer und eine große Küche.",
          "target": "My house has three bedrooms and a large kitchen."
        },
        {
          "source": "Hinter dem Haus ist ein Hof.",
          "target": "There is a yard behind the house."
        }
      ]
    }
  ]
}
```

---

## Field Reference

### `WordEntry` (top-level)

| Field | Type | Required | Source (CSS) | Description |
|-------|------|----------|-------------|-------------|
| `word` | `string` | ✅ | `.tag_lemma` (first word) | The headword in source language |
| `part_of_speech` | `string` | ✅ | `.tag_lemma` / `.tag_wordtype` | Full POS: `"noun"`, `"verb"`, `"adjective"`, `"adverb"` |
| `gender` | `string` ⏐ `null` | ❌ | `.tag_wordtype` (parsed) | Grammatical gender: `"masculine"`, `"feminine"`, `"neuter"`, `"plural"`; `null` for non-nouns |
| `plural` | `string` ⏐ `null` | ❌ | `.tag_lemma` (parenthesized) | Plural form, e.g., `"Häuser"`; `null` if not shown |
| `source_lang` | `string` | ✅ | URL/inferred | Source language code: `"de"`, `"en"`, `"fr"`, etc. |
| `target_lang` | `string` | ✅ | URL/inferred | Target language code: `"en"`, `"de"`, `"fr"`, etc. |
| `translations` | `Translation[]` | ✅ | `.translation` divs | List of translations, ranked by frequency |

### `Translation`

| Field | Type | Required | Source (CSS) | Description |
|-------|------|----------|-------------|-------------|
| `text` | `string` | ✅ | `.dictLink` text | The translation word/phrase |
| `part_of_speech` | `string` ⏐ `null` | ❌ | `.tag_type` | Abbreviated POS: `"n"`, `"v"`, `"adj"`, `"adv"`, `"nt"` (neuter), etc. |
| `is_common` | `boolean` | ✅ | `.tag_usage` / container | `true` for top/frequent translations; `false` for "less common" |
| `usage_note` | `string` ⏐ `null` | ❌ | `.tag_usage` | Usage frequency note: `"often used"`, `null` |
| `examples` | `ExamplePair[]` | ✅ | `.example_lines` | Example sentence pairs (0-2 per translation) |
| `verb_forms` | `string[]` ⏐ `null` | ❌ | `.tag_forms` | For verbs: conjugation forms shown, e.g., `["ran", "run"]` |

### `ExamplePair`

| Field | Type | Required | Source (CSS) | Description |
|-------|------|----------|-------------|-------------|
| `source` | `string` | ✅ | `.tag_s` or first `.example_lines` line | Sentence in source language with bolded headword |
| `target` | `string` | ✅ | `.tag_t` or second `.example_lines` line | Sentence in target language with bolded translation |

---

## Field Values by Word Type

### Nouns
```json
{
  "word": "Haus",
  "part_of_speech": "noun",
  "gender": "neuter",
  "plural": "Häuser",
  "translations": [
    {"text": "house", "part_of_speech": "n", "is_common": true},
    {"text": "building", "part_of_speech": "n", "is_common": true},
    {"text": "home", "part_of_speech": "n", "is_common": true},
    {"text": "domicile", "part_of_speech": "n", "is_common": true},
    {"text": "establishment", "part_of_speech": "n", "is_common": false},
    {"text": "dwelling", "part_of_speech": "n", "is_common": false},
    {"text": "household", "part_of_speech": "n", "is_common": false},
    {"text": "shell", "part_of_speech": "n", "is_common": false}
  ]
}
```

### Verbs
```json
{
  "word": "laufen",
  "part_of_speech": "verb",
  "gender": null,
  "plural": null,
  "translations": [
    {
      "text": "run",
      "part_of_speech": "v",
      "is_common": true,
      "verb_forms": ["ran", "run"],
      "examples": [
        {
          "source": "Ich musste heute Morgen richtig schnell laufen, um den Bus noch zu erwischen.",
          "target": "I had to run really fast to catch the bus this morning."
        }
      ]
    },
    {"text": "walk", "part_of_speech": "v", "is_common": true},
    {"text": "work", "part_of_speech": "v", "is_common": true},
    {"text": "go", "part_of_speech": "v", "is_common": true},
    {"text": "operate", "part_of_speech": "v", "is_common": false},
    {"text": "race", "part_of_speech": "v", "is_common": false}
  ]
}
```

### Adjectives
```json
{
  "word": "schön",
  "part_of_speech": "adjective",
  "gender": null,
  "plural": null,
  "translations": [
    {"text": "beautiful", "part_of_speech": "adj", "is_common": true},
    {"text": "good", "part_of_speech": "adj", "is_common": true},
    {"text": "nice", "part_of_speech": "adj", "is_common": true},
    {"text": "attractive", "part_of_speech": "adj", "is_common": true},
    {"text": "handsome", "part_of_speech": "adj", "is_common": false},
    {"text": "beauteous", "part_of_speech": "adj", "is_common": false},
    {"text": "pulchritudinous", "part_of_speech": "adj", "is_common": false}
  ]
}
```

### Adverbs
```json
{
  "word": "schön",
  "part_of_speech": "adverb",
  "translations": [
    {"text": "nicely", "part_of_speech": "adv", "is_common": true},
    {"text": "beautifully", "part_of_speech": "adv", "is_common": false},
    {"text": "well", "part_of_speech": "adv", "is_common": false}
  ]
}
```

---

## POS Abbreviation Mapping

| `.tag_type` value | Full POS | Description |
|-------------------|----------|-------------|
| `n` | noun | Generic noun |
| `nt` | noun, neuter | Neuter noun |
| `m` | noun, masculine | Masculine noun |
| `f` | noun, feminine | Feminine noun |
| `pl` | noun, plural | Plural noun |
| `v` | verb | Generic verb |
| `adj` | adjective | Adjective |
| `adv` | adverb | Adverb |
| `prep` | preposition | Preposition |
| `conj` | conjunction | Conjunction |
| `pron` | pronoun | Pronoun |
| `num` | numeral | Number |

---

## Multi-Sense Words

Some words appear as multiple `.exact` divs (one per grammatical sense):

```json
[
  {
    "word": "schön",
    "part_of_speech": "adjective",
    "translations": [ ... ]
  },
  {
    "word": "schön",
    "part_of_speech": "adverb",
    "translations": [ ... ]
  }
]
```

Each sense is a separate `WordEntry` object in the results array.

---

## Compound Phrases Section

The "Examples:" section contains compound phrases and their translations:

```json
{
  "compound_phrases": [
    {
      "source": "großes Haus",
      "source_pos": "nt",
      "target": "large mansion",
      "target_pos": "n"
    },
    {
      "source": "schönes Haus",
      "source_pos": "nt",
      "target": "nice house",
      "target_pos": "n"
    }
  ]
}
```

These are parseable from `.examples` → `.lemma` + `.translation` pairs.

---

## External Sources Section

The "External sources (not reviewed)" section contains bilingual text snippets from the web. Each entry has:
- `source`: German text snippet (truncated, with `[...]`)
- `target`: English text snippet (truncated, with `[...]`)
- `url`: Source website URL

This data is **not part of the core dictionary** and can be excluded for Anki flashcard creation (too noisy, not reviewed for accuracy).

---

## JSON Schema (for validation)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["word", "part_of_speech", "translations"],
  "properties": {
    "word": {"type": "string"},
    "part_of_speech": {"type": "string", "enum": ["noun", "verb", "adjective", "adverb", "preposition", "conjunction", "pronoun"]},
    "gender": {"type": ["string", "null"], "enum": ["masculine", "feminine", "neuter", "plural", null]},
    "plural": {"type": ["string", "null"]},
    "source_lang": {"type": "string", "default": "de"},
    "target_lang": {"type": "string", "default": "en"},
    "translations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["text", "is_common", "examples"],
        "properties": {
          "text": {"type": "string"},
          "part_of_speech": {"type": ["string", "null"]},
          "is_common": {"type": "boolean"},
          "usage_note": {"type": ["string", "null"]},
          "verb_forms": {"type": ["array", "null"], "items": {"type": "string"}},
          "examples": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["source", "target"],
              "properties": {
                "source": {"type": "string"},
                "target": {"type": "string"}
              }
            }
          }
        }
      }
    }
  }
}
```
