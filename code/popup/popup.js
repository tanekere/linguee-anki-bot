document.addEventListener('DOMContentLoaded', async () => {
  const statusDot = document.getElementById('status-dot');
  const statusText = document.getElementById('status-text');
  const mainContent = document.getElementById('main-content');
  const profileSelect = document.getElementById('profile-select');
  const deckSection = document.getElementById('deck-section');
  const deckSelect = document.getElementById('deck-select');
  const btnShowCreate = document.getElementById('btn-show-create');
  const cardsAdded = document.getElementById('cards-added');
  const queueCount = document.getElementById('queue-count');
  const createDeckForm = document.getElementById('create-deck-form');
  const newDeckName = document.getElementById('new-deck-name');

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

  async function loadProfiles() {
    profileSelect.disabled = true;
    profileSelect.innerHTML = '<option value="">Loading profiles...</option>';
    try {
      const response = await chrome.runtime.sendMessage({ action: 'GET_PROFILES' });
      if (!response.connected) {
        profileSelect.innerHTML = '<option value="">Not connected</option>';
        return;
      }
      const { selectedProfile } = await chrome.storage.local.get('selectedProfile');
      profileSelect.innerHTML = '<option value="">-- Select profile --</option>';
      response.profiles.forEach(p => {
        const option = document.createElement('option');
        option.value = p;
        option.textContent = p;
        if (p === response.activeProfile && !selectedProfile) option.selected = true;
        if (p === selectedProfile) option.selected = true;
        profileSelect.appendChild(option);
      });
      profileSelect.disabled = false;

      const { selectedProfile: saved } = await chrome.storage.local.get('selectedProfile');
      if (saved && response.profiles.includes(saved)) {
        await loadDecks();
      } else if (response.activeProfile) {
        await chrome.storage.local.set({ selectedProfile: response.activeProfile });
        profileSelect.value = response.activeProfile;
        await loadDecks();
      } else {
        disableDeckSection();
      }
    } catch {
      profileSelect.innerHTML = '<option value="">Error loading</option>';
      disableDeckSection();
    }
  }

  function enableDeckSection() {
    deckSelect.disabled = false;
    btnShowCreate.disabled = false;
  }

  function disableDeckSection() {
    deckSelect.disabled = true;
    deckSelect.innerHTML = '<option value="">Select profile first</option>';
    btnShowCreate.disabled = true;
  }

  async function loadDecks() {
    enableDeckSection();
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
  await loadProfiles();
  await updateStats();

  profileSelect.addEventListener('change', async () => {
    const profileName = profileSelect.value;
    if (!profileName) {
      await chrome.storage.local.remove('selectedProfile');
      await chrome.storage.local.remove('selectedDeck');
      disableDeckSection();
      return;
    }
    await chrome.storage.local.set({ selectedProfile: profileName });
    await loadDecks();
  });

  deckSelect.addEventListener('change', async () => {
    await chrome.storage.local.set({ selectedDeck: deckSelect.value });
  });

  document.getElementById('btn-check-connection').addEventListener('click', async () => {
    await updateStatus();
    await loadProfiles();
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
        alert(response.error || 'Cannot process queue - check Anki connection');
      } else {
        alert(`Processed ${response.processed} cards. ${response.remaining} remaining.`);
      }
      await updateStats();
    } catch (e) {
      alert('Error: ' + e.message);
    }
  });
});