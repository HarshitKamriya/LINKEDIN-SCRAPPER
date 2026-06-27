// Renders html and copies it to the clipboard
// Source: https://stackoverflow.com/questions/34191780/javascript-
//         copy-string-to-clipboard-as-text-html
function copyFormatted (html) {
  var container = document.createElement('div')
  container.innerHTML = html
  var activeSheets = Array.prototype.slice.call(document.styleSheets)
    .filter(function (sheet) {
      return !sheet.disabled
    })
  document.body.appendChild(container)
  window.getSelection().removeAllRanges()
  var range = document.createRange()
  range.selectNode(container)
  window.getSelection().addRange(range)
  document.execCommand('copy')
  for (var i = 0; i < activeSheets.length; i++)
    activeSheets[i].disabled = true
  document.execCommand('copy')
  for (var i = 0; i < activeSheets.length; i++)
    activeSheets[i].disabled = false
  document.body.removeChild(container)
}

// Listens for html
chrome.runtime.onMessage.addListener(function(message) {
      copyFormatted(message.html);
});
