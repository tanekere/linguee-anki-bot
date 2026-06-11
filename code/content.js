function normalizeText(text) {
  return (text || '').replace(/\s+/g, ' ').trim();
}

function extractExamples(exampleLinesEl) {
  const examples = [];
  const exampleDivs = exampleLinesEl.querySelectorAll('.example');
  for (const exDiv of exampleDivs) {
    const tagSList = exDiv.querySelectorAll('.tag_s');
    const tagTList = exDiv.querySelectorAll('.tag_t');
    for (let i = 0; i < tagSList.length; i++) {
      const source = normalizeText(tagSList[i]?.textContent || '');
      const target = normalizeText(tagTList[i]?.textContent || '');
      if (source && target) {
        examples.push({ source, target });
      }
    }
  }
  return examples;
}

function extractTranslation(transEl) {
  const dictLink = transEl.querySelector('.dictLink');
  const tagTypeEl = transEl.querySelector('.tag_type');
  const tagCEl = transEl.querySelector('.tag_c');

  const text = normalizeText(dictLink?.textContent || '');
  if (!text) return null;

  const pos = normalizeText(tagTypeEl?.textContent || tagTypeEl?.getAttribute('title') || '');
  let usageNote = '';
  if (tagCEl) {
    usageNote = normalizeText(tagCEl.textContent);
  }
  const isOftenUsed = tagCEl?.classList.contains('usedveryoften') || false;

  const tagFormsEl = transEl.querySelector('.tag_forms');
  let verbForms = null;
  if (tagFormsEl) {
    const ft = normalizeText(tagFormsEl.textContent);
    const m = ft.match(/\((.+?)\)/);
    if (m) verbForms = m[1].split(',').map(s => s.trim());
  }

  const examples = [];
  const exampleLines = transEl.querySelectorAll('.example_lines');
  for (const el of exampleLines) {
    examples.push(...extractExamples(el));
  }

  return { text, pos, usageNote, isOftenUsed, verbForms, isCommon: true, examples };
}

function extractInexactTranslations(groupEl) {
  const translations = [];
  const transDivs = groupEl.querySelectorAll('.translation');
  for (const transDiv of transDivs) {
    const dictLink = transDiv.querySelector('.dictLink');
    const tagTypeEl = transDiv.querySelector('.tag_type');
    const text = normalizeText(dictLink?.textContent || '');
    if (!text) continue;
    translations.push({
      text,
      pos: normalizeText(tagTypeEl?.textContent || tagTypeEl?.getAttribute('title') || ''),
      usageNote: '',
      isOftenUsed: false,
      isCommon: false,
      examples: []
    });
  }
  return translations;
}

function extractEntryFromLemma(lemmaEl) {
  const tagLemmaEl = lemmaEl.querySelector('.tag_lemma');
  const dictLinkEl = tagLemmaEl?.querySelector('.dictLink');
  const word = normalizeText(dictLinkEl?.textContent || '');
  if (!word) return null;

  const tagWordtypeEl = lemmaEl.querySelector('.tag_wordtype');
  const wordtypeText = normalizeText(tagWordtypeEl?.textContent || '');
  let pos = '';
  let gender = '';
  if (wordtypeText) {
    const parts = wordtypeText.split(',').map(s => s.trim());
    pos = parts[0] || '';
    if (parts.length > 1) {
      gender = parts[1];
    }
  }

  const forms = { plural: null, conjugations: null };
  const lemmaDesc = lemmaEl.querySelector('.lemma_desc');
  const formsElements = lemmaDesc ? lemmaDesc.querySelectorAll(':scope > .tag_forms') : [];
  for (const formEl of formsElements) {
    const formText = normalizeText(formEl.textContent);
    if (formEl.classList.contains('forms_plural')) {
      const match = formText.match(/plural:\s*(.+?)\)?$/);
      forms.plural = match ? match[1].trim().replace(/\)$/, '') : formText.replace(/[()]/g, '');
    } else if (formEl.classList.contains('forms_verb')) {
      const match = formText.match(/\((.+?)\)/);
      if (match) {
        forms.conjugations = match[1].split(',').map(s => s.trim());
      }
    }
  }

  const translationLines = lemmaEl.querySelector('.translation_lines');
  if (!translationLines) return null;

  const commonTranslations = [];
  const leastCommonTranslations = [];
  let inLeastCommonSection = false;

  const children = Array.from(translationLines.children);
  for (const child of children) {
    if (child.classList.contains('translation_group')) {
      inLeastCommonSection = true;
      const inexact = extractInexactTranslations(child);
      leastCommonTranslations.push(...inexact);
    } else if (child.classList.contains('translation')) {
      const trans = extractTranslation(child);
      if (trans) {
        if (inLeastCommonSection) {
          trans.isCommon = false;
          leastCommonTranslations.push(trans);
        } else {
          commonTranslations.push(trans);
        }
      }
    }
  }

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

function extractWordEntries() {
  const entries = [];
  const exactDivs = document.querySelectorAll('.exact');

  for (const exactDiv of exactDivs) {
    const lemmaEls = exactDiv.querySelectorAll(':scope > .lemma, :scope > .lemma.featured');
    for (const lemmaEl of lemmaEls) {
      const entry = extractEntryFromLemma(lemmaEl);
      entries.push(entry || null);
    }
  }

  return entries;
}

function showToast(message, type = 'info', duration = 3000) {
  let container = document.getElementById('linguee-anki-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'linguee-anki-toast-container';
    container.style.cssText =
      'position:fixed;top:20px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `linguee-anki-toast linguee-anki-toast-${type}`;
  toast.textContent = message;
  toast.style.cssText =
    'padding:12px 20px;border-radius:8px;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:white;box-shadow:0 2px 8px rgba(0,0,0,0.2);transition:opacity 0.3s;max-width:350px;';

  switch (type) {
    case 'success': toast.style.backgroundColor = '#27ae60'; break;
    case 'error': toast.style.backgroundColor = '#e74c3c'; break;
    case 'warning': toast.style.backgroundColor = '#f39c12'; break;
    case 'info': default: toast.style.backgroundColor = '#3498db';
  }

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

let ankiStatus = { connected: false, profile: null, deck: null };

function updateButtonStates() {
  const buttons = document.querySelectorAll('.linguee-anki-btn');
  buttons.forEach(btn => {
    if (btn.classList.contains('added') || btn.classList.contains('duplicate')) return;

    if (!ankiStatus.connected) {
      btn.className = 'linguee-anki-btn disabled';
      btn.textContent = 'No Anki';
      btn.title = 'Anki is not connected. Open Anki Desktop with AnkiConnect.';
    } else if (ankiStatus.profile && ankiStatus.profile !== 'testing') {
      btn.className = 'linguee-anki-btn disabled';
      btn.textContent = 'Wrong Profile';
      btn.title = `Anki profile "${ankiStatus.profile}" is active. Switch to "testing".`;
    } else {
      btn.className = 'linguee-anki-btn idle';
      btn.textContent = '+ Add to Anki';
      btn.title = `Add to deck: ${ankiStatus.deck || 'Not set'}`;
    }
  });
}

async function checkAnkiStatus() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'CHECK_ANKI_STATUS' });
    ankiStatus = response;
    updateButtonStates();
  } catch {
    ankiStatus = { connected: false, profile: null, deck: null };
    updateButtonStates();
  }
}

document.addEventListener('click', async (e) => {
  if (!e.target.classList.contains('linguee-anki-btn')) return;

  const btn = e.target;
  if (btn.classList.contains('adding') || btn.classList.contains('added') || btn.classList.contains('disabled')) return;

  const entryIndex = parseInt(btn.dataset.entryIndex);
  const entry = entries[entryIndex];
  if (!entry) return;

  btn.classList.remove('idle');
  btn.classList.add('adding');
  btn.textContent = 'Adding...';
  btn.disabled = true;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'ADD_TO_ANKI',
      entry
    });

    btn.disabled = false;

    if (response.success) {
      btn.classList.remove('adding');
      btn.classList.add('added');
      btn.textContent = 'Added';
      btn.title = `"${entry.word}" added to Anki`;
      showToast(`"${entry.word}" added to Anki!`, 'success');
    } else if (response.error === 'duplicate') {
      btn.classList.remove('adding');
      btn.classList.add('duplicate');
      btn.textContent = 'Exists';
      btn.title = `"${entry.word}" already exists in deck`;
      showToast(`"${entry.word}" already exists in deck`, 'warning');
    } else if (response.error === 'wrong_profile' || response.error === 'profile_missing') {
      btn.classList.remove('adding');
      btn.classList.add('error');
      btn.textContent = 'Error';
      btn.title = response.message;
      showToast(response.message, 'error');
    } else if (response.queued) {
      btn.classList.remove('adding');
      btn.classList.add('queued');
      btn.textContent = 'Queued';
      btn.title = 'Saved for later - Anki not reachable';
      showToast('Anki not reachable. Card saved for later.', 'warning');
    } else {
      btn.classList.remove('adding');
      btn.classList.add('error');
      btn.textContent = 'Error';
      btn.title = response.message || 'Unknown error';
      showToast(response.message || 'Failed to add card', 'error');
    }
  } catch (err) {
    btn.disabled = false;
    btn.classList.remove('adding');
    btn.classList.add('error');
    btn.textContent = 'Error';
    btn.title = err.message;
    showToast('Error: ' + err.message, 'error');
  }
});

let entries = [];

function injectForAll(exactDivs, entryList) {
  const list = entryList || entries;
  let entryIndex = 0;

  const divs = exactDivs || document.querySelectorAll('.exact');
  divs.forEach((exactDiv) => {
    const lemmaEls = exactDiv.querySelectorAll(':scope > .lemma, :scope > .lemma.featured');
    lemmaEls.forEach((lemmaEl) => {
      if (lemmaEl.querySelector('.linguee-anki-btn')) return;
      const entry = list[entryIndex];
      if (!entry) { entryIndex++; return; }

      const lemmaDesc = lemmaEl.querySelector('.lemma_desc');
      if (!lemmaDesc) { entryIndex++; return; }

      const btnContainer = document.createElement('div');
      btnContainer.className = 'linguee-anki-btn-container';

      const btn = document.createElement('button');
      btn.className = 'linguee-anki-btn idle';
      btn.dataset.entryIndex = String(entryIndex);
      btn.dataset.word = entry.word;
      btn.dataset.pos = entry.pos;
      btn.textContent = '+ Add to Anki';
      btn.title = `Add "${entry.word}" (${entry.pos}) to Anki`;

      btnContainer.appendChild(btn);
      lemmaDesc.after(btnContainer);
      entryIndex++;
    });
  });
}

function init() {
  entries = extractWordEntries();
  if (entries.length > 0) {
    const hasValid = entries.some(e => e !== null);
    if (hasValid) {
      injectForAll(null, entries);
      checkAnkiStatus();
      setInterval(checkAnkiStatus, 15000);
    }
  }
}

function observeDOM() {
  const observer = new MutationObserver((mutations) => {
    let shouldRescan = false;
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1) {
          if (node.classList && node.classList.contains('exact')) {
            shouldRescan = true;
            break;
          }
          if (node.querySelectorAll && node.querySelectorAll('.exact').length > 0) {
            shouldRescan = true;
            break;
          }
        }
      }
      if (shouldRescan) break;
    }
    if (shouldRescan) {
      entries = extractWordEntries();
      injectForAll(null, entries);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(init, 500);
  setTimeout(init, 2000);
  observeDOM();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(init, 500);
    setTimeout(init, 2000);
    observeDOM();
  });
}
