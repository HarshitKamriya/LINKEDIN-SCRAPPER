// Scrape from LinkedIn Recruiter profile.
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

// Determines whether a given profile is locked
function lockedProfile() {
  return new Promise ((resolve, reject) => {
    var checkExists = setInterval(async () => {
      try {
        // Uses the presence of the unlock button to determine if the profile
        // is locked
        let test_element = document.getElementsByTagName("button")[15];
        // Resolves the promise based on the test element
        if (test_element.innerText === "Unlock full profile") {
          clearInterval(checkExists);
          resolve(true);
        } else {
          clearInterval(checkExists);
          resolve(false);
        }
      } catch (e) {}}, 500);
  });
}

// Given a locked profile, unlocks it
function unlock() {
  return new Promise ((resolve, reject) => {
    var checkExists = setInterval(async () => {
      try {
        // If the test element exists, then profile is unlocked
        if ($(document).find('#topcard').find('.module-footer').find('.public-profile,  .searchable').find('a')[0]) {
          clearInterval(checkExists);
          resolve();
        // Otherwise unlock button is pressed
        } else {
          document.getElementsByTagName("button")[15].click();
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
function getDetails() {
  let unformatted_name = document.getElementsByClassName("searchable")[0].innerText;
  let job = document.getElementsByClassName("searchable")[1].innerText;
  let location = document.getElementsByClassName("location")[0].innerText;
  // Gets all enteries from the users experience section
  let all_companies = $(document).find("#profile-experience").find(".position");
  // Gets the URL link of the subject's profile
  element = $(document).find('#topcard').find('.module-footer').find('.public-profile,  .searchable').find('a')[0];
  href = element.href;
  // Splits name to first and last as well as converting to title case
  let name = formatName(unformatted_name);
  return [name[0], name[1], job, titleCase(location.split(',')[0]), href];
}

// Given a URL of a LinkedIn profile, returns the subjects's details
function getProfile() {
  return new Promise (async (resolve, reject) => {
    try {
      // If the frame is locked, unlock it
      let is_locked = await lockedProfile();
      if (is_locked) {
        reject();
      }
      // Once unlock get the details from the profile
      let details = getDetails();
      resolve(details);
    // If an error occurs, recreate the iframe with the users profile.
    } catch (e) {};
  });
}

// Runs the Scraper program
async function run() {
  // Stores the extracted profiles in html form
  let formated_profiles = '';
  try {
    profile = await getProfile();
    formated_profiles += generateTableEntry(profile[0], profile[1], profile[2],
                                            profile[3], profile[4]);
    // Generates the html
    let html = generateTable(formated_profiles);
    // Copies data to the users clipboard
    chrome.runtime.sendMessage({html: html});
    generateBanner();
    $("#status-recruiter").css("background-color","green");
    $("#status-recruiter").text("Copied to clipboard!");
  } catch (e) {
    generateBanner();
    $('#status-recruiter').text('Please unlock profile');
  }
}

// Executes the program when UI button pressed
chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    sendResponse({msg: "suc"});
    run();
});
