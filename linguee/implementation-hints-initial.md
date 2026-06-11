# Linguee DOM Parsing Hints (Content Script Perspective)

## Why Content Scripts Work Well Here

Linguee search results are **server-rendered static HTML**. When the user is on a page like:

```
https://www.linguee.com/german-english/search?source=auto&query=Haus
```

A content script injected into the page can extract all dictionary data directly from the DOM using `document.querySelectorAll(...)`. No HTTP fetching, no API keys, no rate limit concerns — the data is already in the page the user is viewing.

---

## Key DOM Landmarks

### Entry container: `.exact`

Each `.exact` div represents one lemma or grammatical sense. A single word like "schön" produces two `.exact` divs (one for adjective, one for adverb). A simple word like "Haus" produces one. The content script should iterate all `.exact` divs on the page and extract data from each.

### Headword area: `.tag_lemma`

Contains a combined text string like `"Haus  noun, neuter"` or `"laufen  verb"`. The word, POS, and gender need to be parsed out of this text. The format varies by word type:
- Noun: `"WORD  noun, GENDER"` (gender: masculine/feminine/neuter)
- Verb: `"WORD  verb"`
- Adjective: `"WORD  adjective"`
- Adverb: `"WORD  adverb"`

### POS abbreviation: `.tag_type`

Shows the abbreviated POS for translations (e.g., `n`, `v`, `adj`, `adv`, `nt` for neuter noun). Helpful for displaying alongside each translation.

### Verb conjugations: `.tag_forms`

When present, shows inflected forms like `"(ran, run)"` or `"(walked, walked)"`. Only appears for verbs. Worth capturing for display in the `Notes` field or alongside conjugations data.

### Frequency tag: `.tag_usage`

Shows usage notes like `"often used"` on the most frequent translations. A good signal for determining which translations belong in the "Common" vs "Less Common" sections of the card.

---

## Translation Extraction

### Common translations: `.translation`

Each `.translation` block contains:
- A `.dictLink` element — the translation word (e.g., "house")
- An optional `.tag_type` — abbreviated POS
- An optional `.tag_usage` — frequency note
- Nested `.example_lines` — example sentence pairs

Examples are paired: German sentence followed by English sentence. Each pair lives in an `.example_lines` container; the two lines are typically in `.tag_s` (source) and `.tag_t` (target) elements.

### Less common translations: `.inexact`

The collapsed "less common:" section is a `.inexact` container. Inside it, translations appear as flat `.singleline` entries — no example sentences, just the word and sometimes a POS tag. These are good candidates for the card's "Least Common" field in a compact dot-separated list.

### Compound phrases: `.examples` / `.example`

Below the dictionary entry, a section shows compound phrases (e.g., "großes Haus → large mansion"). These are parseable separately and could be offered as optional additional cards.

---

## Data Shape to Target

Aim to extract something like this from each `.exact` div:

```
{
  word: "Haus",
  pos: "noun",
  gender: "neuter",        // null for non-nouns
  plural: "Häuser",        // null if not shown
  conjugations: null,       // verb forms if applicable
  translations: [
    {
      text: "house",
      pos: "n",
      isCommon: true,       // based on position (before "less common") or .tag_usage
      usageNote: "often used",
      examples: [
        { source: "Mein Haus hat drei Schlafzimmer.", target: "My house has three bedrooms." }
      ]
    },
    // ... more common translations ...
    // ... less common translations (isCommon: false, no examples) ...
  ],
  compoundPhrases: [
    { source: "großes Haus", sourcePos: "nt", target: "large mansion", targetPos: "n" }
  ]
}
```

---

## Selector Strategy: Be Flexible

DOM structures change. Suggestions for resilient selectors:

- Prefer **class-based selectors** over positional/nth-child selectors
- Use `querySelector` with fallbacks — try the known class first, fall back to broader selectors
- For the "less common" boundary, detect it by the presence of `.inexact` or `.group_line` rather than counting translations
- Treat missing optional fields (gender, conjugations, examples) gracefully — return `null` or empty arrays

---

## Edge Cases Worth Noting

### Multi-sense words

Words like "schön" (adjective + adverb) and "See" (der See = lake, die See = sea) produce multiple `.exact` divs. Each should become its own Anki card, since the POS and translations differ. Consider labeling them "Sense 1/2" or using the POS as a differentiator.

### Reflexive and separable verbs

"sich erinnern" or "auf|machen" — Linguee shows these with the particle. The headword may include "sich" or the `|` separator. Parse accordingly; consider storing the base verb and particle separately.

### Non-breaking spaces and whitespace

Linguee often uses `&nbsp;` and other special whitespace characters. The content script should normalize text: trim, collapse multiple spaces, replace non-breaking spaces with regular spaces.

### Umlauts and special characters

German characters (ä, ö, ü, ß) come through correctly from the DOM. No special encoding needed when reading via JavaScript's `textContent`.

### Capitalization

German nouns are capitalized; Linguee search is case-insensitive. Cross-reference lookups (e.g., finding duplicates in Anki) should be case-insensitive for the Word field.

### "No results" pages

If the user navigates to a Linguee page with no dictionary results (e.g., a misspelled word), the content script should detect the absence of `.exact` divs and report "No vocabulary data found" rather than failing silently.

---

## Performance Considerations

- Content script extraction happens synchronously on page load — keep it fast (milliseconds, not seconds)
- Avoid iterating the entire document; scope queries to `.exact` containers
- Cache the extracted data in a variable so the popup can request it without re-parsing
- For pages with many `.exact` divs (rare), extraction should still complete in under ~100ms

---

## Testing Strategy Hints

- **Noun**: "Haus" — validates gender, plural, multi-translation, examples
- **Verb**: "laufen" — validates verb POS, conjugations, no gender
- **Adjective**: "schön" — validates adjective POS, no gender
- **Multi-sense**: "schön" — validates multiple `.exact` extraction
- **Umlaut**: "schön", "für", "können" — validates encoding
- **Compound**: "zu Hause" — validates multi-word headword parsing
