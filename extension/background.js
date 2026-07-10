chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-to-rt',
    title: 'Save selection to ResearchTogether',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'capture-to-rt' && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, { type: 'CAPTURE', text: info.selectionText });
  }
});
