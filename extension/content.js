// ResearchTogether browser extension — content script
(function () {
  let popup = null;

  document.addEventListener('mouseup', (e) => {
    const sel = window.getSelection();
    const text = sel?.toString().trim();
    if (!text || text.length < 3) {
      removePopup();
      return;
    }

    const range = sel.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    showPopup(rect, text);
  });

  function showPopup(rect, text) {
    removePopup();
    popup = document.createElement('div');
    popup.id = 'rt-capture-popup';
    popup.innerHTML = `
      <button id="rt-capture-btn">Save to ResearchTogether</button>
    `;
    popup.style.cssText = `
      position: fixed;
      left: ${rect.left + rect.width / 2}px;
      top: ${rect.top - 40 + window.scrollY}px;
      transform: translateX(-50%);
      z-index: 999999;
      background: #6366f1;
      border-radius: 12px;
      padding: 2px;
      box-shadow: 0 4px 12px rgba(99,102,241,0.4);
      font-family: Inter, system-ui, sans-serif;
    `;
    const btn = popup.querySelector('#rt-capture-btn');
    btn.style.cssText = `
      background: #6366f1;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    `;
    btn.addEventListener('click', () => captureHighlight(text));
    document.body.appendChild(popup);
  }

  function removePopup() {
    if (popup) { popup.remove(); popup = null; }
  }

  async function captureHighlight(text) {
    const data = await chrome.storage.local.get(['projectId', 'serverUrl']);
    if (!data.projectId) {
      alert('Set your project ID in the extension popup first.');
      return;
    }
    const serverUrl = data.serverUrl || 'http://localhost:3001';
    try {
      const res = await fetch(`${serverUrl}/api/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: data.projectId,
          url: window.location.href,
          title: document.title,
          highlightText: text,
          pageTitle: document.title,
        }),
      });
      if (res.ok) {
        const btn = popup?.querySelector('#rt-capture-btn');
        if (btn) { btn.textContent = 'Saved!'; btn.style.background = '#10b981'; }
        setTimeout(removePopup, 1500);
      }
    } catch (err) {
      alert('Capture failed. Is the server running?');
    }
  }

  document.addEventListener('mousedown', (e) => {
    if (popup && !popup.contains(e.target)) removePopup();
  });
})();
