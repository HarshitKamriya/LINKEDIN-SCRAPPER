// Scrape from LinkedIn Recruiter search result.
// Created by David Golding - September 2019.

// Creates a table which includes the extracted profiles
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

// Inserts a given profile into table format
function generateTableEntry(first, last, role, location, link) {
  return `
  <tr>
    <th>${first}</th>
    <th>${last}</th>
    <th>${role}</th>
    <th>${location}</th>
    <th>${link}</th>
  </tr>`;
}

// Injects a banner into the webpage to show the status of Scraper
function generateBanner() {
  // If the banner exists update the color, otherwise generate it
  if ($("#status-recruiter").length) {
    $("#status-recruiter").css("background-color","red");
  } else {
    $("body").append(`
      <p id='status-recruiter'; style='top: 0; width:100%; color:white;
         background-color:red; position:fixed; text-align:center;
         z-index: 1000;'></p>
    `);
  };
}

// Creates an iframe which the profile is loaded in
function generateFrame(url) {
  var frame = document.createElement('iframe');
  frame.src = url;
  frame.style = "display: none;";
  document.body.appendChild(frame);
  return frame;
}

// Determines if an error page has been loaded by the iframe
function urlError(frame) {
  let frame_doc = frame.contentWindow.document;
  if ($(frame_doc).find("p:contains(We're sorry, an unanticipated error occurred)").length) {
    return true;
  };
  return false;
}

// Determines whether a given profile is locked
function lockedProfile(frame) {
  return new Promise ((resolve, reject) => {
    var checkExists = setInterval(async () => {
      try {
        // Ensures the error page hasn't been loaded
        if (urlError(frame)) {
          reject();
        }
        // Uses the presence of the unlock button to determine if the profile
        // is locked. The recruiting activity element is the last element to
        // load, therefore, in order to get accurate results, the check is
        // carried out once the slowest element is loaded
        let frame_doc = frame.contentWindow.document;
        if ($(frame_doc).find("h2:contains(Recruiting Activity)").length) {
          if ($(frame_doc).find("button:contains(Unlock full profile)").length) {
            clearInterval(checkExists);
            resolve(true);
          } else {
            clearInterval(checkExists);
            resolve(false);
          }
        }
      } catch (e) {}}, 300);
  });
}

// Given a locked profile, unlocks it
function unlock(frame) {
  return new Promise ((resolve, reject) => {
    var checkExists = setInterval(async () => {
      try {
        let frame_doc = frame.contentWindow.document;
        if (urlError(frame)) {
          reject();
        }
        // If the test element exists, then profile is unlocked
        if ($(frame_doc).find("h2:contains(Recruiting Activity)").length) {
          if ($(frame_doc).find("a:contains(Public Profile)").length) {
            clearInterval(checkExists);
            resolve();
          // Otherwise the unlock button is pressed
          } else {
            $(frame_doc).find("button:contains(Unlock full profile)")[0].click();
          }
        }
      } catch (e) {}}, 2000);
    });
}

// Converts a string to title case
function titleCase(str){
  if (str === undefined) {
    return "";
  }
  // Converts string to a lower case and puts it into an array
   str = str.toLowerCase().split(' ');
   let final = [];
    // For each word in the string makes the first letter upper case
    for(let  word of str){
      if (word) {
        final.push(word.charAt(0).toUpperCase()+ word.slice(1));
      } else {
        final.push('');
      }
    }
  return final.join(' ')
}

// Given a string, converts to title case and returns a 2 element array
// with the first word as the first element and the remaining words as the
// second
function formatName(name) {
  let nameSeperated;
  try {
    nameSeperated = name.replace(/\s+/, '\x01').split('\x01');
  } catch (e) {
    nameSeperated = [name, ""];
  }
  return [titleCase(nameSeperated[0]),titleCase(nameSeperated[1])];
}

// Given an unlocked LinkedIn profile, returns the first name, last name,  job,
// location and LinkedIn URL for the user
function getDetails(frame) {
  let frame_doc = frame.contentWindow.document;
  let unformatted_name = frame_doc.getElementsByClassName("searchable")[0].innerText;
  let job = frame_doc.getElementsByClassName("searchable")[1].innerText;
  let location = frame_doc.getElementsByClassName("location")[0].innerText;
  // Gets the target company from the search page
  let company = document.getElementById("facet-currentCompany").childNodes[0].childNodes[2].childNodes[0].title;
  // Gets all enteries from the users experience section
  let all_companies = $(frame_doc).find("#profile-experience").find(".position");
  // Attempts to get a more accurate job title by checking experience
  // entries to see if there is a match for the target company
  for (let comp of all_companies) {
    try {
      // The period that the subject worked at the company
      let date = comp.childNodes[0].childNodes[2].childNodes[0].data.split(" ");
      // Company found on user's profile
      let found_company = comp.getElementsByTagName("a")[1].innerText.toLowerCase();
      // Target company includes company on profile
      let c1 = company.toLowerCase().includes(found_company);
      // Profile company includes target company
      let c2 = found_company.includes(company.toLowerCase());
      // Check if c1 or c2 true and the target presently works there
      if ((c1||c2) && date[date.length - 1] === "Present") {
        job = comp.getElementsByClassName("position-header")[0].childNodes[0].innerText;
        // If there is a location for this updated job then location updated
        try {
          location = comp.getElementsByClassName("location")[0].innerText;
        } catch (d) {};
        break;
      };
    } catch (d) {};
  };
  // Gets the URL link of the subject's profile
  element = $(frame_doc).find("a:contains(Public Profile)")[0];
  href = element.href;
  // Splits name to first and last as well as converting to title case
  let name = formatName(unformatted_name);
  return [name[0], name[1], job, titleCase(location.split(',')[0]), href];
}

// Given a URL of a LinkedIn profile, returns the subjects's details
function getProfile(url) {
  return new Promise (async (resolve, reject) => {
    let frame = generateFrame(url);
    var frame_doc = () => {return frame.contentWindow.document};
    try {
      // If the frame is locked, unlock it
      let is_locked = await lockedProfile(frame);
      if (is_locked) {
        await unlock(frame);
      }
      // Once unlock get the details from the profile
      let details = getDetails(frame);
      frame.remove();
      resolve(details);
    // If an error occurs, recreate the iframe with the users profile.
    } catch (e) {
      frame.remove();
      resolve(getProfile(url));
    };
  });
}

// Runs the Scraper program
async function run() {
  // Extracts the profiles from the search results
  let profiles = $(".top-card-info");
  // Sets the maximum number of profiles based on the extracted data
  let number_of_profiles = profiles.length;
  // Stores the extracted profiles in html form
  let formated_profiles = '';
  generateBanner();
  // Itterates through each profile to extract the data
  for (var i=0; i<number_of_profiles; i++) {
    // If the profile is unlinked, then there is no profile attached so
    // no data can be retrieved
    if ($(profiles[i]).find("abbr:contains(not linked)").length === 0) {
      $('#status-recruiter').text('Scraped '+i+'/'+number_of_profiles);
      let url = $(profiles[i]).find(".search-result-profile-link")[0];
      profile = await getProfile(url);
      formated_profiles += generateTableEntry(profile[0], profile[1], profile[2],
                                              profile[3], profile[4]);
    }
  }
  // Generates the html
  let html = generateTable(formated_profiles);
  // Copies data to the users clipboard
  chrome.runtime.sendMessage({html: html});
  generateBanner();
  $("#status-recruiter").css("background-color","green");
  $("#status-recruiter").text("Copied to clipboard!");
}

// Executes the program when UI button pressed
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    sendResponse({msg: "suc"});
    run();
});
