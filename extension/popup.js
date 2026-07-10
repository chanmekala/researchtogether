document.getElementById('save').addEventListener('click', async () => {
  const projectId = document.getElementById('projectId').value.trim();
  const serverUrl = document.getElementById('serverUrl').value.trim();
  await chrome.storage.local.set({ projectId, serverUrl });
  document.getElementById('status').textContent = 'Settings saved!';
  setTimeout(() => { document.getElementById('status').textContent = ''; }, 2000);
});

chrome.storage.local.get(['projectId', 'serverUrl'], (data) => {
  if (data.projectId) document.getElementById('projectId').value = data.projectId;
  if (data.serverUrl) document.getElementById('serverUrl').value = data.serverUrl;
});
