# Scraper for LinkedIn Recruiter
Scraper is a Chrome extension which is designed to extract profile information from LinkedIn Recruiter. 

It has the ability to extract profiles from two sources:

• A LinkedIn Recruiter search result  
• A LinkedIn Recruiter profile page

## What does it extract?
For a given profile, Scraper extracts the following:  
• First Name  
• Last Name  
• Job Title  
• Location  
• LinkedIn profile URL  

The data extracted slightly differs between a search result and a profile page.   

### Similarities:  
• First & Last name: Scraper assumes that the first word is the first name and the remaining word/words are the last name.  
• Job Title: When no filters have been applied on a search, the job title is assumed to be in the headline of the profile.  
• Location: When no filters have been applied on a search, the location is obtained from the profile information section.  
• URL: This is obtained by retrieving the link pointed to by the “Public Profile” hyperlink.  

### Differences:
• Job Title: When a company has been added to the “Current companies” filter,
Scraper will use this company to see if there is a match between the companies the subject’s listed in their experience and the company filtered for. If there is and the subject presently works there, then this company is used.  
• Location: If the job title is updated, Scraper looks to see if the entry also includes a location; if it does then this location is used.  

### Limitations:
• First & Last name: Scraper assumes the first word of the name is their first name, however, if they’ve included a title (e.g Dr.), then Scraper assumes this is their first name.  
• Job Title: A subject’s headline often isn’t their job title. Also, when a
company is included in the “Current company” filter, if the subject has a
slightly different variant of the company name, it may not be picked up.  
• If a search result returns multiple pages, Scraper only extracts data from the
visible page (i.e it won’t extract data from page 2 also).

## How does it work?
• For each entry, Scraper injects an iframe into the search result page which
loads the subject’s profile. Scraper then scrapes the data from the iframe,
deletes the iframe and moves on to the next subject.  
• Scraper works on locked and unlocked profiles. Scraper detects if a profile is
locked and if this is the case, it presses the “Unlock full profile” button,
waits for the unlocked profile to load and then scrapes the data as usual.

## How do I get the extracted data and what format is it in?  
• Once extracted, the data is copied to your clipboard.  
• Data is in table form, allowing it to be copied into a spreadsheet (e.g. Google Sheets). 

## Problems
• If progress ceases, try reloading the page and running Scraper again. You can
also try refreshing the extension by visiting chrome://extensions. If this
doesn’t work you’ve likely come across a scenario unaccounted for by Scraper;
you’ll likely have to resort to manually opening individual profiles and using
Scraper there.  
• Note: The more locked profiles contained within a search result, the longer it will take due to more time being required to unlock and scrape.

Installation & Usage
1. Open Chrome and navigate to chrome://extensions
2. Enable “Developer Mode”, and press “Load Unpacked"
3. Navigate to the “Scraper” file and press “Select”
4. Navigate to LinkedIn Recruiter, press the L and then press “Scrape Page”
6. Scraper will start to run and its status will be indicated by the red banner
7. Wait for the banner to turn green, this means Scraper is complete and the extracted data can be pasted
8. Paste the data into a spreadsheet

Scraper can also be used on individual LinkedIn Recruiter profiles.

## Notes  
• If LinkedIn redesign their Recruiter site, this extension will become obsolete.  
• I hold no responsibility for any damage caused by this extension nor do I hold
responsibility for any violation of LinkedIn's terms and conditions by the use of this extension.
