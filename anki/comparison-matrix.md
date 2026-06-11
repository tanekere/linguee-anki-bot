# Comparison Matrix: Linguee vs Wiktionary vs Glosbe

## Feature Comparison

| Feature | Linguee | Wiktionary | Glosbe |
|---------|---------|-----------|--------|
| **Part of speech** | ✅ Yes — labeled in search results (noun, verb, etc.) | ✅ Yes — section heading (Noun, Verb, Adjective, etc.) | ✅ Yes — explicitly labeled (noun, verb, adjective, adverb) |
| **Gender** | ✅ Yes — shown for German nouns (n, m, f) in entries | ✅ Yes — in headword line (e.g., "Haus n") — needs parsing | ✅ Yes — explicitly labeled (neuter, masculine, feminine) |
| **Translation frequency ranking** | ✅ **Yes** — translations grouped by frequency (most common first) | ❌ **No** — definitions ordered by convention, not frequency | ✅ **Yes** — explicit "top translations" and "less frequent translations" |
| **Example sentences per translation** | ✅ Yes — each translation sense has example sentences | ⚠️ Partial — examples per definition, but only one definition per sense | ⚠️ Partial — examples for top translations, sparse for less frequent ones |
| **Number of translations** | ★★★★☆ — Comprehensive, often 5-15 per word | ★★★☆☆ — 1-10 definitions per word; limited to main senses | ★★★★★ — Very comprehensive (40-120+ per word) |
| **API availability** | ❌ No — must web scrape | ✅ **Yes** — REST API (free, no key) | ❌ No — must web scrape |
| **Python library support** | ❌ No official — custom scraping needed | ✅ **Yes** — wiktextract, wiktionaryparser, REST API | ❌ No — custom scraping needed |
| **Scraping difficulty** | ★★★★☆ — Heavy JS rendering, Cloudflare, complex DOM | ★☆☆☆☆ — Clean REST API, no scraping needed | ★★★★★ — Cloudflare challenge, dynamic JS, no API |
| **Data completeness** | ★★★★★ — Rich bilingual data with context | ★★★☆☆ — Good but monolingual, no frequency data | ★★★★★ — Rich bilingual data with frequency ranking |
| **Rate limiting / access** | ★★★★☆ — Aggressive Cloudflare, may block scrapers | ★☆☆☆☆ — Open API, generous limits | ★★★★☆ — Cloudflare, likely aggressive rate limiting |
| **Data consistency** | ★★★★★ — Professional, consistent formatting | ★★★☆☆ — Community-edited, varies by entry | ★★★★☆ — Generally consistent but crowd-sourced |
| **Pronunciation (IPA)** | ✅ Yes — IPA shown in entries | ✅ Yes — IPA, audio files, rhymes | ❌ No — Not systematically provided |
| **Inflection tables** | ❌ No — Only basic forms shown | ✅ Yes — Full declension/conjugation tables | ⚠️ Partial — Declension mentioned, not comprehensive |
| **Derived terms / related words** | ❌ No | ✅ Yes — Comprehensive derived terms, hyponyms, etc. | ⚠️ Partial — Related phrases section |
| **Source attribution** | ✅ Yes — Professional translations from EU documents | ✅ Yes — Community-edited with references | ✅ Yes — Sources cited per example |
| **Cost** | Free (web) | Free (web + API) | Free (web) |

## Scoring Summary

| Source | Overall Score | Best For |
|--------|-------------|----------|
| **Linguee** | 7.5/10 | High-quality example sentences, professional translations, frequency-ranked |
| **Wiktionary** | 6.5/10 | Structured data via API, pronunciation, inflection tables, BUT no frequency ranking |
| **Glosbe** | 6.0/10 | Best frequency-ranked translations, BUT no API and Cloudflare barrier |

## Critical Analysis for Anki Card Generation

### The Ideal Source Would Have:
1. **Frequency-ranked translations** — so the most common meaning appears first on the card
2. **Part of speech** — to categorize cards (noun, verb, adjective)
3. **Gender** — essential for German nouns
4. **Example sentences per translation** — for context and learning
5. **Easy API access** — for reliable, scalable data extraction

### Reality Check:

| Requirement | Linguee | Wiktionary | Glosbe |
|-------------|---------|-----------|--------|
| Frequency-ranked translations | ✅ | ❌ | ✅ |
| Part of speech | ✅ | ✅ | ✅ |
| Gender | ✅ | ✅ (parse needed) | ✅ |
| Examples per translation | ✅ | ✅ (per definition) | ⚠️ (top only) |
| Easy API access | ❌ | ✅ | ❌ |

### Key Insight: No Single Source is Perfect

- **Linguee** has the best data quality for our use case (frequency-ranked translations + examples) but requires heavy scraping
- **Wiktionary** is the easiest to access (clean REST API) but lacks frequency ranking — the #1 most important feature for Anki cards
- **Glosbe** has frequency-ranked translations but is nearly as hard to scrape as Linguee, with worse example sentence coverage

## Recommendation Structure

### Primary Recommendation: Hybrid Approach

1. **Use Wiktionary REST API** as the **primary source** for:
   - Part of speech
   - Gender (parsed from HTML/raw page)
   - Pronunciation (IPA)
   - Inflection tables (for advanced cards)

2. **Use Linguee** (existing scraper) as the **translation source** for:
   - Frequency-ranked translations
   - Example sentences per translation

3. **Use Glosbe** as a **fallback** only if:
   - Linguee scraping fails for a particular word
   - Need additional translation coverage beyond Linguee's results

### Why This Hybrid:
- Wiktionary API is **reliable and free** — use it for structural data that doesn't change
- Linguee provides the **frequency-ranked translations** that are the core of Anki cards
- Glosbe can fill gaps when Linguee coverage is insufficient
- This avoids over-reliance on any single scraping target
