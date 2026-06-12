document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const mainContent = document.getElementById('main-content');
  const deckSelect = document.getElementById('deck-select');
  const btnShowCreate = document.getElementById('btn-show-create');
  const cardsAdded = document.getElementById('cards-added');
  const queueCount = document.getElementById('queue-count');
  const createDeckForm = document.getElementById('create-deck-form');
  const newDeckName = document.getElementById('new-deck-name');
  const feedbackEl = document.getElementById('popup-feedback');
  const ankiUrlInput = document.getElementById('anki-url');

  function showFeedback(message, type) {
    feedbackEl.textContent = message;
    feedbackEl.className = 'popup-feedback popup-feedback-' + type;
    feedbackEl.classList.remove('hidden');
    clearTimeout(feedbackEl._timer);
    feedbackEl._timer = setTimeout(() => {
      feedbackEl.classList.add('hidden');
    }, 4000);
  }

  async function updateStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
      if (response.connected) {
        statusDot.className = 'status-dot connected';
        statusText.textContent = response.profile || 'Connected';
        mainContent.classList.remove('hidden');
        return response;
      } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Not connected';
        mainContent.classList.add('hidden');
        return null;
      }
    } catch {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Error';
      mainContent.classList.add('hidden');
      return null;
    }
  }

  async function loadDecks() {
    deckSelect.disabled = false;
    btnShowCreate.disabled = false;
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_DECKS' });
      const { selectedDeck } = await chrome.storage.local.get('selectedDeck');

      deckSelect.innerHTML = '<option value="">-- Select deck --</option>';
      if (response.decks && response.decks.length > 0) {
        response.decks.forEach(deck => {
          const option = document.createElement('option');
          option.value = deck;
          option.textContent = deck;
          if (deck === selectedDeck) option.selected = true;
          deckSelect.appendChild(option);
        });
      }
    } catch {
      deckSelect.innerHTML = '<option value="">Failed to load</option>';
    }
  }

  async function updateStats() {
    const { cardsAddedCount = 0 } = await chrome.storage.local.get('cardsAddedCount');
    const { offlineQueue = [] } = await chrome.storage.local.get('offlineQueue');
    cardsAdded.textContent = String(cardsAddedCount);
    queueCount.textContent = String(offlineQueue.length);
  }

  async function loadAnkiUrl() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_ANKI_URL' });
      ankiUrlInput.value = response.url || response.defaultUrl;
    } catch {
      ankiUrlInput.value = 'http://localhost:8765';
    }
  }

  await updateStatus();
  await loadDecks();
  await updateStats();
  await loadAnkiUrl();

  deckSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ selectedDeck: deckSelect.value });
  });

  document.getElementById('btn-check-connection').addEventListener('click', async () => {
    await updateStatus();
    await loadDecks();
    await updateStats();
  });

  document.getElementById('btn-show-create').addEventListener('click', () => {
    createDeckForm.classList.remove('hidden');
  });

  document.getElementById('btn-cancel-create').addEventListener('click', () => {
    createDeckForm.classList.add('hidden');
    newDeckName.value = '';
  });

  document.getElementById('btn-confirm-create').addEventListener('click', async () => {
    const name = newDeckName.value.trim();
    if (!name) return;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'CREATE_DECK',
        deckName: name
      });
      if (response.success) {
        createDeckForm.classList.add('hidden');
        newDeckName.value = '';
        await loadDecks();
        deckSelect.value = name;
        await chrome.storage.local.set({ selectedDeck: name });
      } else if (response.error === 'duplicate') {
        deckSelect.value = name;
        await chrome.storage.local.set({ selectedDeck: name });
        createDeckForm.classList.add('hidden');
        newDeckName.value = '';
      } else {
        showFeedback(response.message || 'Failed to create deck', 'error');
      }
    } catch (e) {
      showFeedback('Error: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-process-queue').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'PROCESS_QUEUE' });
      if (response.remaining === -1) {
        showFeedback(response.error || 'Cannot process queue - check Anki connection', 'error');
      } else {
        showFeedback(`Processed ${response.processed} cards. ${response.remaining} remaining.`, 'success');
      }
      await updateStats();
    } catch (e) {
      showFeedback('Error: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-save-url').addEventListener('click', async () => {
    const url = ankiUrlInput.value.trim();
    if (!url) {
      showFeedback('URL cannot be empty', 'error');
      return;
    }
    try {
      const response = await chrome.runtime.sendMessage({ action: 'SET_ANKI_URL', url });
      if (response.success) {
        showFeedback('AnkiConnect URL saved', 'success');
        await updateStatus();
      } else {
        showFeedback('Failed to save URL', 'error');
      }
    } catch (e) {
      showFeedback('Error: ' + e.message, 'error');
    }
  });

  document.getElementById('btn-reset-url').addEventListener('click', async () => {
    try {
      await chrome.storage.local.remove('ankiUrl');
      ankiUrlInput.value = 'http://localhost:8765';
      showFeedback('AnkiConnect URL reset to default', 'success');
      await updateStatus();
    } catch (e) {
      showFeedback('Error: ' + e.message, 'error');
    }
  });
});