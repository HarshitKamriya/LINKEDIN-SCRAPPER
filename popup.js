function escapeCsv(value) {
  let text = value == null ? "" : String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function exportSavedProfiles() {
  chrome.storage.local.get(['linkedinScraperData'], function(result) {
    let records = result.linkedinScraperData || [];

    if (!records.length) {
      alert('No saved recruiter data to export.');
      return;
    }

    let header = ['First Name', 'Last Name', 'Role', 'Company', 'Location', 'Phone', 'Email', 'LinkedIn URL', 'Timestamp'];
    let rows = [header.join(',')];

    records.forEach(function(record) {
      let row = [
        escapeCsv(record.firstName),
        escapeCsv(record.lastName),
        escapeCsv(record.role),
        escapeCsv(record.company),
        escapeCsv(record.location),
        escapeCsv(record.phone),
        escapeCsv(record.email),
        escapeCsv(record.link),
        escapeCsv(record.timestamp)
      ];
      rows.push(row.join(','));
    });

    let csvContent = rows.join('\n');
    let blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    let url = URL.createObjectURL(blob);
    let link = document.createElement('a');
    link.href = url;
    link.download = 'linkedin_recruiters.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  });
}

// Listens for button press and then executes Scraper
let submit = document.getElementById('sub');
submit.onclick = function(element) {
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {cmd: "extract"}, function(response) {
    });
  });
};

let exportButton = document.getElementById('exportCsv');
exportButton.onclick = function() {
  exportSavedProfiles();
};
