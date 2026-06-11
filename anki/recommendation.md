# Recommendation: Best Dictionary Sources for Anki Card Generation

## Executive Summary

After thorough research of Wiktionary, Glosbe, and Linguee as data sources for German-English Anki flashcard generation, **no single source meets all requirements perfectly**. The recommended approach is a **hybrid strategy** using multiple sources for different data components.

## Core Requirements & Best Source Per Requirement

| Requirement | Best Source | Why |
|-------------|------------|-----|
| **Part of speech** | Wiktionary API | Clean, structured, reliable, free API |
| **Gender** | Wiktionary API (HTML) | Parsable from headword line; always present for nouns |
| **Translation frequency ranking** | Linguee | Best frequency-ranked bilingual data; professional translations |
| **Example sentences per translation** | Linguee | Rich examples from EU documents; source-attributed |
| **Pronunciation (IPA)** | Wiktionary API | IPA + audio files; most comprehensive |
| **Inflection tables** | Wiktionary API | Full declension/conjugation for German words |

## Final Recommended Architecture

### Three-Source Hybrid Approach

```
┌─────────────────────────────────────────────────────────────┐
│                    Anki Card Generator                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐   Structural Data (POS, Gender, IPA)  │
│  │   Wiktionary API  │───────────────────────┐               │
│  │  (Primary Source)  │                       │               │
│  └──────────────────┘                       ▼               │
│                                    ┌──────────────────┐     │
│  ┌──────────────────┐   Translations │                  │     │
│  │     Linguee      │──(frequency)──▶│  Anki Card Data  │     │
│  │  (Primary Source)  │   + Examples  │                  │     │
│  └──────────────────┘               ▲                   │     │
│                                       │                   │     │
│  ┌──────────────────┐   Fallback      │                   │     │
│  │     Glosbe       │──Translations──┘                   │     │
│  │  (Fallback Only)  │                                    │     │
│  └──────────────────┘               └──────────────────┘     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Source Roles:

#### 1. Wiktionary REST API — Structural Data Provider
**Use for**: Part of speech, gender, IPA pronunciation, inflection tables

**Why**:
- Clean REST API — no scraping needed
- Free and open, no rate limit concerns
- Always returns structured JSON
- Reliable and consistent (Wikimedia infrastructure)
- Gender data easy to parse from HTML headword line

**Limitations**:
- No frequency-ranked translations — this is the critical gap
- Definitions are monolingual (one English gloss per sense), not a ranked list of synonyms

**Endpoints to use**:
- `GET /api/rest_v1/page/definition/{word}` — for part of speech and definitions
- `GET /api/rest_v1/page/html/{word}` — for gender extraction from headword line

#### 2. Linguee — Translation & Example Provider
**Use for**: Frequency-ranked translations, example sentences per translation

**Why**:
- **The only source with properly frequency-ranked translations** (most important for Anki)
- Rich, professionally translated example sentences from EU documents
- Each translation sense has its own examples
- High data quality and consistency

**Challenges**:
- Requires web scraping (Cloudflare protection)
- Existing project already has a Linguee scraper — leverage this
- Need robust rate limiting and error handling

#### 3. Glosbe — Optional Fallback
**Use for**: Additional translation coverage when Linguee fails

**Why**:
- Also has frequency-ranked translations (top + less frequent)
- Very comprehensive translation coverage (40-120+ per word)
- Explicit part of speech and gender labels

**Challenges**:
- No public API — scraping required
- Cloudflare protection (same difficulty as Linguee)
- Less reliable than Linguee for example sentences
- **Recommendation**: Only implement if Linguee coverage is insufficient

## Implementation Priority

### Phase 1: Core Pipeline (MVP)
1. **Wiktionary API integration** — fetch POS, gender, IPA
2. **Linguee scraper** (existing) — fetch translations and examples
3. **Merge and generate Anki cards**

### Phase 2: Enhancements
1. Add Wiktionary inflection tables to cards
2. Add pronunciation audio (where available)
3. Implement caching to minimize API calls

### Phase 3: Resilience (Optional)
1. Add Glosbe scraper as fallback
2. Add retry logic and exponential backoff
3. Consider pre-processing batch of words and storing results

## What NOT to Do

### ❌ Don't use Wiktionary alone for translations
Wiktionary does not provide frequency-ranked translations. Its English definitions are useful but don't tell you whether "house" or "building" is the more common translation of "Haus".

### ❌ Don't use Glosbe as primary source
Glosbe has the same scraping challenges as Linguee but worse example sentence quality. It adds complexity without proportional benefit.

### ❌ Don't skip frequency ranking
For Anki cards, showing the most common translation first is **critical** for effective learning. Without frequency ranking, a student might learn "mansion" or "domicile" as the primary translation of "Haus" instead of "house".

## Data Quality Comparison (Real Example: "Haus")

| Source | Top Translation | Additional Translations | Example Sentence |
|--------|----------------|------------------------|-------------------|
| **Linguee** | house (most frequent) | home, building, premises, residence, property, place, household, facility, venue, establishment | "Das Haus wurde 1920 gebaut." → "The house was built in 1920." |
| **Wiktionary** | house | home, theatre | "In dem Haus haben wir mal gewohnt." → "We used to live in that house." |
| **Glosbe** | house | home, building, household, family, domestic, domicile, dwelling... (40+ more) | "Als ich ankam, verschwanden sie aus dem Haus." → "When I arrived, they cleared out of the house." |

**Winner**: Linguee — best balance of frequency-ranked translations and quality examples.

## Technical Risk Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Linguee blocks scraper | 🟡 Medium | Implement exponential backoff, rotate user agents, use cloudscraper |
| Linguee changes HTML | 🟡 Medium | Monitor for changes, use semantic selectors over positional ones |
| Wiktionary API rate limit | 🟢 Low | Cache results, Wikimedia has generous limits |
| Wiktionary API changes | 🟢 Low | Wikimedia APIs are versioned and stable |
| Glosbe blocks scraper | 🔴 High | Only use as optional fallback; don't depend on it |

## Final Verdict

**Primary recommendation**: Wiktionary API + Linguee scraper hybrid

This gives us:
- ✅ Reliable structural data (POS, gender, IPA) from Wiktionary's free API
- ✅ Frequency-ranked translations from Linguee
- ✅ Quality example sentences from Linguee
- ✅ Comprehensive inflection data from Wiktionary
- ✅ Minimal scraping risk (only one scraping target)

The Wiktionary API provides everything that doesn't need frequency data, while Linguee fills the critical gap of providing the most common translations first — which is essential for effective language learning flashcards.
