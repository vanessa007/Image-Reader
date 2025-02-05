// Saves options to chrome.storage
function saveOptions() {
  const apiKey = document.getElementById('apiKey').value;
  chrome.storage.sync.set(
    { apiKey: apiKey },
    function() {
      // Update status to let user know options were saved.
      const status = document.getElementById('status');
      status.textContent = 'Options saved.';
      status.style.display = 'block';
      status.className = 'success';
      setTimeout(function() {
        status.style.display = 'none';
      }, 2000);
    }
  );
}

// Restores select box and checkbox state using the preferences
// stored in chrome.storage.
function restoreOptions() {
  chrome.storage.sync.get(
    { apiKey: '' }, // default value
    function(items) {
      document.getElementById('apiKey').value = items.apiKey;
    }
  );
}

document.addEventListener('DOMContentLoaded', restoreOptions);
document.getElementById('save').addEventListener('click', saveOptions);
