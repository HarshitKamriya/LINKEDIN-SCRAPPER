// Scrape from LinkedIn Recruiter profile.
// Created by Harshit Kamriya.

function generateTable(html_to_insert) {
  return `
   <html>
    <title>Recruiter Scraper</title>
    <style>
      table {border-collapse: collapse; table-layout:fixed;}
      table, th, td {font-family: "Arial"; font-size: 13px; font-weight: normal;
                     text-align: left;}
    </style>
  <table>
  ${html_to_insert}
  </table>
  </html>`;
}

function generateTableEntry(first, last, role, company, location, phone, email, link) {
  return `
  <tr>
    <th>${first}</th>
    <th>${last}</th>
    <th>${role}</th>
    <th>${company}</th>
    <th>${location}</th>
    <th>${phone}</th>
    <th>${email}</th>
    <th>${link}</th>
  </tr>`;
}

function saveProfileRecord(profileData) {
  let record = {
    firstName: profileData[0],
    lastName: profileData[1],
    role: profileData[2],
    company: profileData[3],
    location: profileData[4],
    phone: profileData[5],
    email: profileData[6],
    link: profileData[7],
    timestamp: new Date().toISOString()
  };

  chrome.storage.local.get(['linkedinScraperData'], function(result) {
    let savedData = result.linkedinScraperData || [];
    let alreadyExists = savedData.some(function(existing) {
      return existing.link === record.link;
    });

    if (!alreadyExists) {
      savedData.push(record);
      chrome.storage.local.set({linkedinScraperData: savedData});
    }
  });
}

function generateBanner() {
  if ($("#status-recruiter").length) {
    $("#status-recruiter").css("background-color", "red");
  } else {
    $("body").append(`
      <p id='status-recruiter' style='top: 0; width:100%; color:white;
         background-color:red; position:fixed; text-align:center;
         z-index: 1000;'></p>
    `);
  }
}

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getText(selectors, fallback) {
  for (let selector of selectors) {
    try {
      const element = document.querySelector(selector);
      if (element) {
        const text = cleanText(element.innerText || element.textContent || '');
        if (text) {
          return text;
        }
      }
    } catch (e) {}
  }
  return fallback || '';
}

function titleCase(str) {
  if (str === undefined || str === null) {
    return '';
  }
  str = String(str).toLowerCase().split(' ');
  let final = [];
  for (let word of str) {
    if (word) {
      final.push(word.charAt(0).toUpperCase() + word.slice(1));
    } else {
      final.push('');
    }
  }
  return final.join(' ');
}

function formatName(name) {
  let separated;
  try {
    separated = String(name).replace(/\s+/, '\x01').split('\x01');
  } catch (e) {
    separated = [name, ''];
  }
  return [titleCase(separated[0]), titleCase(separated[1] || '')];
}

function extractPhone() {
  try {
    const telLink = $("a[href^='tel:']").first().attr('href');
    if (telLink) {
      return telLink.replace(/^tel:/i, '').trim();
    }
  } catch (e) {}

  try {
    const text = $('body').text();
    const match = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {}

  return '';
}

function extractEmail() {
  try {
    const mailtoLink = $("a[href^='mailto:']").first().attr('href');
    if (mailtoLink) {
      return mailtoLink.replace(/^mailto:/i, '').trim();
    }
  } catch (e) {}

  try {
    const text = $('body').text();
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) {
      return match[0].trim();
    }
  } catch (e) {}

  return '';
}

function hasUnlockButton() {
  try {
    const buttons = Array.from(document.querySelectorAll('button, a'));
    return buttons.some(function(el) {
      const text = cleanText(el.innerText || el.textContent || '');
      return /unlock/i.test(text);
    });
  } catch (e) {
    return false;
  }
}

function lockedProfile() {
  return new Promise(function(resolve) {
    const startedAt = Date.now();
    const check = function() {
      const hasProfileContent = Boolean(getText(['h1', '.top-card-layout__title', '.pv-text-details__left-panel h1', '.text-heading-xlarge'], ''));
      if (hasProfileContent) {
        resolve(hasUnlockButton());
        return;
      }
      if (Date.now() - startedAt > 10000) {
        resolve(false);
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

function unlock() {
  return new Promise(function(resolve) {
    const startedAt = Date.now();
    const check = function() {
      try {
        const button = Array.from(document.querySelectorAll('button, a')).find(function(el) {
          const text = cleanText(el.innerText || el.textContent || '');
          return /unlock/i.test(text);
        });
        if (button) {
          button.click();
        }
      } catch (e) {}

      if (Date.now() - startedAt > 8000) {
        resolve();
        return;
      }
      setTimeout(check, 2000);
    };
    check();
  });
}

function getDetails() {
  const unformattedName = getText(['h1', '.top-card-layout__title', '.pv-text-details__left-panel h1', '.text-heading-xlarge'], '');
  const job = getText(['.top-card-layout__headline', '.text-body-medium', '.pv-entity__summary-info h2', '.jobs-search__title', 'h2'], '');
  const location = getText(['.top-card-layout__first-subline', '.pv-text-details__left-panel .text-body-small', '.location', '.text-body-small'], '');
  const company = getText(['.top-card-layout__second-subline a', '.pv-entity__secondary-title', '.experience-item__subtitle', '.profile-section-card__title'], '');
  const phone = extractPhone();
  const email = extractEmail();
  let href = window.location.href;
  const name = formatName(unformattedName);
  return [name[0], name[1], job, company, titleCase(location.split(',')[0]), phone, email, href];
}

function getProfile() {
  return new Promise(function(resolve) {
    (async function() {
      try {
        const is_locked = await lockedProfile();
        if (is_locked) {
          await unlock();
        }
        const details = getDetails();
        resolve(details);
      } catch (e) {
        resolve(['', '', '', '', '', '', '', window.location.href]);
      }
    })();
  });
}

async function run() {
  let formated_profiles = '';
  try {
    const profile = await getProfile();
    saveProfileRecord(profile);
    formated_profiles += generateTableEntry(profile[0], profile[1], profile[2], profile[3], profile[4], profile[5], profile[6], profile[7]);
    const html = generateTable(formated_profiles);
    chrome.runtime.sendMessage({html: html});
    generateBanner();
    $('#status-recruiter').css('background-color', 'green');
    $('#status-recruiter').text('Copied to clipboard!');
  } catch (e) {
    generateBanner();
    $('#status-recruiter').text('Please unlock profile');
  }
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  sendResponse({msg: 'suc'});
  run();
});
