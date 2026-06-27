async function ensureOffscreenDocument() {
  const hasDocument = await chrome.offscreen.hasDocument().catch(() => false);
  if (!hasDocument) {
    await chrome.offscreen.createDocument({
      url: chrome.runtime.getURL('offscreen.html'),
      reasons: ['CLIPBOARD'],
      justification: 'Copy scraped HTML to the clipboard.'
    });
  }
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
  if (!message || !message.html) {
    return false;
  }

  (async function () {
    try {
      await ensureOffscreenDocument();
      const response = await chrome.runtime.sendMessage({
        type: 'COPY_HTML',
        html: message.html
      });
      sendResponse(response);
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  })();

  return true;
});
