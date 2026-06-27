chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === 'COPY_HTML') {
    try {
      const container = document.createElement('div');
      container.innerHTML = message.html;
      document.body.appendChild(container);
      const range = document.createRange();
      range.selectNode(container);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(container);
      sendResponse({ ok: true });
    } catch (error) {
      sendResponse({ ok: false, error: error.message });
    }
  }
  return true;
});
