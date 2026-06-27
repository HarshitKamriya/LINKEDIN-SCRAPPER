// Scrape from LinkedIn Recruiter search result.
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

function generateFrame(url) {
  var frame = document.createElement('iframe');
  frame.src = url;
  frame.style.display = 'none';
  frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-forms');
  document.body.appendChild(frame);
  return frame;
}

function cleanText(value) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

function getText(doc, selectors, fallback) {
  for (let selector of selectors) {
    try {
      const element = doc.querySelector(selector);
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

function findProfileContainers() {
  const preferred = Array.from(document.querySelectorAll('.top-card-info, .entity-result, .search-result__result, .artdeco-list__item'));
  if (preferred.length) {
    return preferred;
  }

  return Array.from(document.querySelectorAll('a[href*="/in/"], a[href*="/pub/"]'))
    .map(function(link) {
      return link.closest('li, article, div, section');
    })
    .filter(Boolean);
}

function findProfileLink(container) {
  const linkElement = container.querySelector('a[href*="/in/"], a[href*="/pub/"], .search-result-profile-link');
  if (!linkElement) {
    return '';
  }
  return linkElement.href || '';
}

function urlError(frame) {
  try {
    const frame_doc = frame.contentWindow.document;
    if ($(frame_doc).find("p:contains(We're sorry, an unanticipated error occurred)").length) {
      return true;
    }
  } catch (e) {}
  return false;
}

function hasUnlockButton(frame_doc) {
  try {
    const buttons = Array.from(frame_doc.querySelectorAll('button, a'));
    return buttons.some(function(el) {
      const text = cleanText(el.innerText || el.textContent || '');
      return /unlock/i.test(text);
    });
  } catch (e) {
    return false;
  }
}

function lockedProfile(frame) {
  return new Promise(function(resolve) {
    const startedAt = Date.now();
    const check = function() {
      try {
        if (urlError(frame)) {
          resolve(false);
          return;
        }
        const frame_doc = frame.contentWindow.document;
        const hasProfileContent = Boolean(
          getText(frame_doc, ['h1', '.top-card-layout__title', '.pv-text-details__left-panel h1', '.text-heading-xlarge'], '') ||
          frame_doc.querySelector('main, body')
        );
        if (hasProfileContent) {
          resolve(hasUnlockButton(frame_doc));
          return;
        }
      } catch (e) {}

      if (Date.now() - startedAt > 15000) {
        resolve(false);
        return;
      }
      setTimeout(check, 500);
    };
    check();
  });
}

function unlock(frame) {
  return new Promise(function(resolve) {
    const startedAt = Date.now();
    const check = function() {
      try {
        if (urlError(frame)) {
          resolve();
          return;
        }
        const frame_doc = frame.contentWindow.document;
        const button = Array.from(frame_doc.querySelectorAll('button, a')).find(function(el) {
          const text = cleanText(el.innerText || el.textContent || '');
          return /unlock/i.test(text);
        });
        if (button) {
          button.click();
        }
      } catch (e) {}

      if (Date.now() - startedAt > 12000) {
        resolve();
        return;
      }
      setTimeout(check, 2000);
    };
    check();
  });
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

function extractPhone(frame_doc) {
  try {
    const telLink = $(frame_doc).find("a[href^='tel:']").first().attr('href');
    if (telLink) {
      return telLink.replace(/^tel:/i, '').trim();
    }
  } catch (e) {}

  try {
    const text = $(frame_doc).find('body').text();
    const match = text.match(/(\+?\d[\d\s().-]{7,}\d)/);
    if (match) {
      return match[1].trim();
    }
  } catch (e) {}

  return '';
}

function extractEmail(frame_doc) {
  try {
    const mailtoLink = $(frame_doc).find("a[href^='mailto:']").first().attr('href');
    if (mailtoLink) {
      return mailtoLink.replace(/^mailto:/i, '').trim();
    }
  } catch (e) {}

  try {
    const text = $(frame_doc).find('body').text();
    const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (match) {
      return match[0].trim();
    }
  } catch (e) {}

  return '';
}

function getDetails(frame) {
  const frame_doc = frame.contentWindow.document;
  const rawName = getText(frame_doc, ['h1', '.top-card-layout__title', '.pv-text-details__left-panel h1', '.text-heading-xlarge'], '');
  const job = getText(frame_doc, ['.top-card-layout__headline', '.text-body-medium', '.pv-entity__summary-info h2', '.jobs-search__title', 'h2'], '');
  const location = getText(frame_doc, ['.top-card-layout__first-subline', '.pv-text-details__left-panel .text-body-small', '.location', '.text-body-small'], '');
  const company = getText(frame_doc, ['.top-card-layout__second-subline a', '.pv-entity__secondary-title', '.experience-item__subtitle', '.profile-section-card__title'], '');
  const phone = extractPhone(frame_doc);
  const email = extractEmail(frame_doc);

  let href = '';
  try {
    href = frame.contentWindow.location.href;
  } catch (e) {}

  if (!href) {
    try {
      href = $(frame_doc).find('a[href*="/in/"]').first().attr('href') || '';
    } catch (e) {}
  }

  const name = formatName(rawName);
  return [name[0], name[1], job, company, titleCase(location.split(',')[0]), phone, email, href];
}

function getProfile(url) {
  return new Promise(function(resolve) {
    let frame = generateFrame(url);
    let attempts = 0;

    const tryRead = async function() {
      try {
        attempts += 1;
        const is_locked = await lockedProfile(frame);
        if (is_locked) {
          await unlock(frame);
        }
        const details = getDetails(frame);
        frame.remove();
        resolve(details);
      } catch (e) {
        if (attempts >= 3) {
          frame.remove();
          resolve(['', '', '', '', '', '', '', url || '']);
          return;
        }
        setTimeout(tryRead, 1000);
      }
    };

    tryRead();
  });
}

async function run() {
  const containers = findProfileContainers();
  const number_of_profiles = containers.length;
  let formated_profiles = '';
  generateBanner();

  for (let i = 0; i < number_of_profiles; i++) {
    const container = containers[i];
    const link = findProfileLink(container);

    if (!link || /not linked/i.test(container.innerText || '')) {
      continue;
    }

    $('#status-recruiter').text('Scraped ' + (i + 1) + '/' + number_of_profiles);
    const profile = await getProfile(link);
    saveProfileRecord(profile);
    formated_profiles += generateTableEntry(profile[0], profile[1], profile[2], profile[3], profile[4], profile[5], profile[6], profile[7]);
  }

  let html = generateTable(formated_profiles);
  chrome.runtime.sendMessage({html: html});
  generateBanner();
  $('#status-recruiter').css('background-color', 'green');
  $('#status-recruiter').text('Copied to clipboard!');
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  sendResponse({msg: 'suc'});
  run();
});
