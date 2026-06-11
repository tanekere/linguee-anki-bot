document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const profileWarning = document.getElementById('profile-warning');
  const profileWarningText = document.getElementById('profile-warning-text');
  const mainContent = document.getElementById('main-content');
  const deckSelect = document.getElementById('deck-select');
  const cardsAdded = document.getElementById('cards-added');
  const queueCount = document.getElementById('queue-count');
  const createDeckForm = document.getElementById('create-deck-form');
  const newDeckName = document.getElementById('new-deck-name');

  async function updateStatus() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_STATUS' });
      if (response.connected && response.profile === 'testing') {
        statusDot.className = 'status-dot connected';
        statusText.textContent = 'testing';
        profileWarning.classList.add('hidden');
        mainContent.classList.remove('hidden');
      } else if (response.connected && response.profile !== 'testing') {
        statusDot.className = 'status-dot error';
        statusText.textContent = response.profile || '?';
        profileWarningText.textContent =
          response.profile
            ? `Anki is using profile "${response.profile}". Switch to "testing" (File > Switch Profile).`
            : 'Could not determine active profile. Ensure "testing" profile is active in Anki.';
        profileWarning.classList.remove('hidden');
        mainContent.classList.add('hidden');
      } else {
        statusDot.className = 'status-dot disconnected';
        statusText.textContent = 'Not connected';
        profileWarning.classList.add('hidden');
        mainContent.classList.remove('hidden');
      }
    } catch {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = 'Error';
    }
  }

  async function loadDecks() {
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

  await updateStatus();
  await loadDecks();
  await updateStats();

  deckSelect.addEventListener('change', async () => {
    await chrome.runtime.sendMessage({
      action: 'SET_DECK',
      deckName: deckSelect.value
    });
  });

  document.getElementById('btn-check-connection').addEventListener('click', async () => {
    await updateStatus();
    await loadDecks();
    await updateStats();
  });

  document.getElementById('btn-check-again').addEventListener('click', async () => {
    await updateStatus();
    await loadDecks();
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

    const deckName = name.startsWith('testing--') ? name : `testing--${name}`;

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'CREATE_DECK',
        deckName
      });
      if (response.success) {
        createDeckForm.classList.add('hidden');
        newDeckName.value = '';
        await loadDecks();
        deckSelect.value = deckName;
        await chrome.runtime.sendMessage({
          action: 'SET_DECK',
          deckName
        });
      } else if (response.error === 'duplicate') {
        deckSelect.value = deckName;
        await chrome.runtime.sendMessage({
          action: 'SET_DECK',
          deckName
        });
        createDeckForm.classList.add('hidden');
        newDeckName.value = '';
      } else {
        alert(response.message || 'Failed to create deck');
      }
    } catch (e) {
      alert('Error: ' + e.message);
    }
  });

  document.getElementById('btn-process-queue').addEventListener('click', async () => {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'PROCESS_QUEUE' });
      if (response.remaining === -1) {
        alert(response.error || 'Cannot process queue - check Anki profile');
      } else {
        alert(`Processed ${response.processed} cards. ${response.remaining} remaining.`);
      }
      await updateStats();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  });
});
