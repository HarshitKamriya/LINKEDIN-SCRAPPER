// Listens for button press and then executes Scraper
let submit = document.getElementById('sub');
submit.onclick = function(element) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {cmd: "extract"}, function(response) {
    });
  });
};
