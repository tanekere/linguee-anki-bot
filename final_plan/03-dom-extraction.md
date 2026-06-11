# 03 — DOM Extraction (Content Script)

## Overview

The content script is injected into Linguee pages and performs two critical functions:
1. **Extracts structured vocabulary data** from the page DOM
2. **Injects "Add to Anki" buttons** next to each word entry

This document covers the exact DOM structure as verified through live inspection and the extraction algorithm.

## Verified DOM Structure (from live inspection)

### Top-Level Structure

```
<div class="exact">                              ← One per lemma (word + POS combination)
  <div class="lemma featured" wt="...">
    <div>
      <h2 class="line lemma_desc" lid="DE:Haus29372">
        <span class="tag_lemma">
          <a class="dictLink" href="...">Haus</a>          ← The word
          <a class="audio" ...>🔊</a>                       ← Audio button
          <span class="tag_wordtype">noun, non-breaking-neuter</span>  ← POS + gender
        </span>
        <span class="tag_forms forms_plural">               ← Plural (for nouns)
          (plural: <a class="formLink" href="...">Häuser</a>)
        </span>
        <span class="tag_forms forms_verb">                 ← Conjugations (for verbs)
          (<a class="formLink">ran</a>, <a class="formLink">run</a>)
        </span>
        <span class="dash">—</span>
      </h2>
      <div class="lemma_content">
        <div class="meaninggroup sortablemg" gid="0">
          <div class="translation_lines">
            <!-- Common translations here -->
            <div class="translation sortablemg featured">  ← Featured/common translation
              <h3 class="translation_desc">
                <span class="tag_trans" lid="...">
                  <a class="dictLink featured" href="...">house</a>  ← Translation word
                  <span class="tag_type" title="noun">n</span>        ← POS abbreviation
                  <a class="audio" ...>🔊</a>
                </span>
                <span class="tag_c usedveryoften">(often used)</span>  ← Frequency label
              </h3>
              <div class="example_lines">
                <div class="example line" sid="...">
                  <span class="tag_e">
                    <span class="tag_s">Mein Haus hat drei Schlafzimmer...</span>  ← DE sentence
                    <span class="dash">—</span>
                    <span class="tag_t">My house has three bedrooms...</span>      ← EN sentence
                  </span>
                </div>
              </div>
            </div>
            <!-- More featured translations: building, home, domicile -->
            
            <div class="translation_group">              ← Less common section
              <span class="notascommon">less common:</span>  ← Divider label
              <div class="line group_line translation_group_line">
                <div class="translation sortablemg translation_first">
                  <span class="tag_trans">
                    <a class="dictLink" href="...">establishment</a>
                    <span class="tag_type" title="noun">n</span>
                  </span>
                </div>
                <span>·</span>                              ← Dot separator between inexact
                <div class="translation sortablemg">
                  <span class="tag_trans">
                    <a class="dictLink">dwelling</a>
                    <span class="tag_type" title="noun">n</span>
                  </span>
                </div>
                <span>·</span>
                <!-- household, shell, etc. -->
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- After .exact, the "Examples:" section -->
<div class="inexact">                                ← Compound phrase examples
  <h3>Examples:</h3>
  <div class="lemma singleline" wt="...">
    <h2 class="line lemma_desc">
      <span class="tag_lemma">
        <a class="dictLink" href="...">großes Haus</a>
        <span class="tag_type" title="noun, neuter">nt</span>
      </span>
      <span class="dash">—</span>
    </h2>
    <div class="lemma_content">
      <div class="translation_lines">
        <div class="translation_group">
          <div class="line group_line translation_group_line">
            <div class="translation sortablemg translation_first">
              <a class="dictLink">large mansion</a>
              <span class="tag_type" title="noun">n</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <!-- More compound phrases... -->
</div>
```

### Key Structural Insights from Live Inspection

1. **`.exact` contains `.lemma.featured`** — The main word entry
2. **`.translation_lines` is the container** for translations (both common and less common)
3. **`.translation.featured`** = common/important translations
4. **`.translation_group`** = less common translations container
5. **`.notascommon`** = the "less common:" label
6. **`.tag_c.usedveryoften`** = "(often used)" frequency label
7. **`.tag_wordtype`** = "noun, neuter" (full POS+gender string)
8. **`.tag_type[title]`** = abbreviated POS with full form in title attribute (e.g., `title="noun"` → `n` displayed)
9. **`.tag_forms.forms_plural`** = "(plural: Häuser)" for nouns
10. **`.tag_forms.forms_verb`** = "(ran, run)" for verbs
11. **Example sentences** use `.tag_s` for source and `.tag_t` for target, inside `.example` divs within `.example_lines`
12. **Audio buttons** have `onclick` handlers with MP3 URLs

## Extraction Algorithm

```javascript
// content.js

/**
 * Main entry point: parse all word entries on the page
 */
function extractWordEntries() {
  const exactDivs = document.querySelectorAll('.exact');
  const entries = [];
  
  for (const exactDiv of exactDivs) {
    const entry = extractSingleEntry(exactDiv);
    if (entry) entries.push(entry);
  }
  
  return entries;
}

/**
 * Extract data from a single .exact div
 */
function extractSingleEntry(exactDiv) {
  // === 1. HEADWORD ===
  const lemmaEl = exactDiv.querySelector('.lemma, .lemma.featured');
  if (!lemmaEl) return null;
  
  const tagLemmaEl = lemmaEl.querySelector('.tag_lemma');
  const dictLinkEl = tagLemmaEl?.querySelector('.dictLink');
  const word = dictLinkEl?.textContent.trim() || '';
  
  // === 2. POS AND GENDER ===
  const tagWordtypeEl = lemmaEl.querySelector('.tag_wordtype');
  const wordtypeText = tagWordtypeEl?.textContent.trim() || '';  // "noun, neuter" or "verb"
  
  let pos = '';
  let gender = '';
  if (wordtypeText) {
    const parts = wordtypeText.split(',').map(s => s.trim());
    pos = parts[0] || '';  // "noun", "verb", "adjective"
    if (parts.length > 1) {
      gender = parts[1];  // "neuter", "masculine", "feminine"
    }
  }
  
  // === 3. FORMS (plural/conjugations) ===
  const formsElements = lemmaEl.querySelectorAll('.tag_forms');
  const forms = { plural: null, conjugations: null };
  
  for (const formEl of formsElements) {
    const formText = formEl.textContent.trim();
    if (formEl.classList.contains('forms_plural')) {
      // Extract plural form: "(plural: Häuser)" → "Häuser"
      const match = formText.match(/plural:\s*(.+)/);
      forms.plural = match ? match[1].trim() : formText;
    } else if (formEl.classList.contains('forms_verb')) {
      // Extract conjugations: "(ran, run)" → ["ran", "run"]
      const match = formText.match(/\((.+)\)/);
      if (match) {
        forms.conjugations = match[1].split(',').map(s => s.trim());
      }
    }
  }
  
  // === 4. TRANSLATIONS ===
  const translationLines = exactDiv.querySelector('.translation_lines');
  if (!translationLines) return null;
  
  const commonTranslations = [];
  const leastCommonTranslations = [];
  let inLeastCommonSection = false;
  
  const children = Array.from(translationLines.children);
  
  for (const child of children) {
    if (child.classList.contains('translation_group')) {
      // We've hit the "less common" boundary
      inLeastCommonSection = true;
      // Extract inexact translations from this group
      const inexactTranslations = extractInexactTranslations(child);
      leastCommonTranslations.push(...inexactTranslations);
    } else if (child.classList.contains('translation')) {
      // Regular translation
      const trans = extractTranslation(child);
      if (trans) {
        if (inLeastCommonSection) {
          leastCommonTranslations.push(trans);
        } else {
          commonTranslations.push(trans);
        }
      }
    }
  }
  
  // === 5. SOURCE URL ===
  const sourceURL = window.location.href;
  
  return {
    word,
    pos,
    gender,
    forms,
    commonTranslations,
    leastCommonTranslations,
    sourceURL
  };
}

/**
 * Extract a single featured/common translation
 */
function extractTranslation(transEl) {
  const dictLink = transEl.querySelector('.dictLink');
  const tagTypeEl = transEl.querySelector('.tag_type');
  const tagCEl = transEl.querySelector('.tag_c');
  
  const text = dictLink?.textContent.trim() || '';
  const pos = tagTypeEl?.textContent.trim() || 
              tagTypeEl?.getAttribute('title') || '';
  
  // Frequency indicator
  let usageNote = '';
  if (tagCEl) {
    usageNote = tagCEl.textContent.trim();
    // e.g., "(often used)" or "[prov.]"
  }
  
  // Check if "often used"
  const isOftenUsed = tagCEl?.classList.contains('usedveryoften') || false;
  
  // Extract examples
  const examples = [];
  const exampleLines = transEl.querySelectorAll('.example_lines');
  for (const el of exampleLines) {
    const example = extractExamples(el);
    examples.push(...example);
  }
  
  return {
    text,
    pos,
    usageNote,
    isOftenUsed,
    isCommon: true,
    examples
  };
}

/**
 * Extract example sentence pairs from .example_lines
 */
function extractExamples(exampleLinesEl) {
  const examples = [];
  const exampleDivs = exampleLinesEl.querySelectorAll('.example');
  
  for (const exDiv of exampleDivs) {
    const tagSList = exDiv.querySelectorAll('.tag_s');
    const tagTList = exDiv.querySelectorAll('.tag_t');
    
    // Each example line has one source and one target
    for (let i = 0; i < tagSList.length; i++) {
      const source = tagSList[i]?.textContent.trim() || '';
      const target = tagTList[i]?.textContent.trim() || '';
      if (source && target) {
        examples.push({ source, target });
      }
    }
  }
  
  return examples;
}

/**
 * Extract inexact/less-common translations from a .translation_group
 */
function extractInexactTranslations(groupEl) {
  const translations = [];
  const transDivs = groupEl.querySelectorAll('.translation');
  
  for (const transDiv of transDivs) {
    const dictLink = transDiv.querySelector('.dictLink');
    const tagTypeEl = transDiv.querySelector('.tag_type');
    
    translations.push({
      text: dictLink?.textContent.trim() || '',
      pos: tagTypeEl?.textContent.trim() || tagTypeEl?.getAttribute('title') || '',
      usageNote: '',
      isOftenUsed: false,
      isCommon: false,
      examples: []
    });
  }
  
  return translations;
}

/**
 * Extract compound phrases from the "Examples:" section (.inexact area)
 * These are phrases like "großes Haus → large mansion"
 */
function extractCompoundPhrases() {
  const phrases = [];
  const inexactDiv = document.querySelector('.inexact');
  if (!inexactDiv) return phrases;
  
  const singlelines = inexactDiv.querySelectorAll('.lemma.singleline');
  for (const sl of singlelines) {
    const tagLemma = sl.querySelector('.tag_lemma');
    const dictLink = tagLemma?.querySelector('.dictLink');
    const tagType = tagLemma?.querySelector('.tag_type');
    
    const sourcePhrase = dictLink?.textContent.trim() || '';
    const sourcePOS = tagType?.getAttribute('title') || tagType?.textContent.trim() || '';
    
    // Target phrase
    const targetDictLink = sl.querySelector('.translation .dictLink');
    const targetType = sl.querySelector('.translation .tag_type');
    const targetPhrase = targetDictLink?.textContent.trim() || '';
    const targetPOS = targetType?.getAttribute('title') || targetType?.textContent.trim() || '';
    
    if (sourcePhrase && targetPhrase) {
      phrases.push({
        source: sourcePhrase,
        sourcePOS,
        target: targetPhrase,
        targetPOS
      });
    }
  }
  
  return phrases;
}
```

## Button Injection Strategy

### Where to inject buttons

Inject one "Add to Anki" button immediately after each `.lemma_desc` heading inside each `.exact` div. This places the button right next to the word, before the translations start.

```javascript
function injectAddButtons(entries) {
  const exactDivs = document.querySelectorAll('.exact');
  
  exactDivs.forEach((exactDiv, index) => {
    const entry = entries[index];
    if (!entry) return;
    
    const lemmaDesc = exactDiv.querySelector('.lemma_desc');
    if (!lemmaDesc) return;
    
    // Create the button
    const btn = document.createElement('button');
    btn.className = 'linguee-anki-btn';
    btn.dataset.entryIndex = index;
    btn.textContent = '➕ Add to Anki';
    btn.title = `Add "${entry.word}" to Anki`;
    
    // Insert after the lemma_desc heading
    lemmaDesc.insertAdjacentElement('afterend', btn);
  });
}
```

### Button Styling (content.css)

```css
.linguee-anki-btn {
  display: inline-block;
  margin: 4px 0 8px 0;
  padding: 4px 12px;
  font-size: 13px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #fff;
  background: #3498db;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s, transform 0.1s;
  z-index: 9999;
}

.linguee-anki-btn:hover {
  background: #2980b9;
  transform: translateY(-1px);
}

.linguee-anki-btn:active {
  transform: translateY(0);
}

.linguee-anki-btn.adding {
  background: #f39c12;
  cursor: wait;
}

.linguee-anki-btn.added {
  background: #27ae60;
  cursor: default;
}

.linguee-anki-btn.error {
  background: #e74c3c;
  cursor: default;
}

.linguee-anki-btn.duplicate {
  background: #f39c12;
  cursor: default;
}

.linguee-anki-btn.disabled {
  background: #95a5a6;
  cursor: not-allowed;
  opacity: 0.7;
}

.linguee-anki-btn.disabled:hover {
  background: #95a5a6;
  transform: none;
}
```

## Click Handler

```javascript
// In content.js
document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('linguee-anki-btn')) return;
  
  const btn = e.target;
  if (btn.classList.contains('adding') || btn.classList.contains('added') || btn.classList.contains('disabled')) return;
  
  const entryIndex = parseInt(btn.dataset.entryIndex);
  const entry = extractedEntries[entryIndex];
  
  if (!entry) return;
  
  btn.classList.add('adding');
  btn.textContent = '⏳ Adding...';
  
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ADD_TO_ANKI',
      data: entry
    });
    
    if (response.success) {
      btn.classList.remove('adding');
      btn.classList.add('added');
      btn.textContent = '✅ Added';
    } else if (response.error === 'duplicate') {
      btn.classList.remove('adding');
      btn.classList.add('duplicate');
      btn.textContent = '⚠️ Exists';
    } else if (response.error === 'wrong_profile') {
      btn.classList.remove('adding');
      btn.classList.add('error');
      btn.textContent = '❌ Wrong Profile';
      btn.title = response.message;
    } else {
      btn.classList.remove('adding');
      btn.classList.add('error');
      btn.textContent = '❌ Error';
      btn.title = response.message || 'Unknown error';
    }
  } catch (err) {
    btn.classList.remove('adding');
    btn.classList.add('error');
    btn.textContent = '❌ Failed';
    btn.title = err.message;
  }
});
```

## Edge Cases

| Edge Case | Handling |
|-----------|----------|
| Multiple `.exact` divs (e.g., "schön" = adj + adv) | Each gets its own button and card; POS differentiates |
| No `.exact` divs on page | Don't inject buttons; show "No vocabulary data" message |
| `display:none` on less common | Content script can still query these elements |
| Audio URLs in `.audio` | Optional: could be stored for future audio support |
| `·` separators in less common | Ignored during extraction; each word gets its own entry |
| Compound phrases in `.inexact` | Offered as a separate "Add phrase" button (future feature) |
| Non-breaking spaces in `.tag_wordtype` | Normalize with `.replace(/\s+/g, ' ').trim()` |
| Page not a dictionary result | Content script checks for `.exact` divs before injection |