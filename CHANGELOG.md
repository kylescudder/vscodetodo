# Change Log

All notable changes to the Things To Do extension will be documented in this file.

## [2.0.0] - 25/04/2022
### Changed
- Category typo fixed. This change will break all previous version, please update to 2.0.0 immediately

## [0.3.0] - 18/04/2022
### Added
- Target date field added, this allows a user to set a deadline for a ToDo.
- Added list of features to the handy Tips section
### Changed
- Redesigned/restyled just about everything.
- The additon of tailwindcss to the project allowed me to clean up and remove lots of crappy css (I'm not front end designer!)
- Changed text of Go To Rules button
- Updated CHANGELOG formatting.
### Removed
- Removed lots of old unused files/sections of files that were there from early testing days that I had not got around to cleaning.


## [0.2.6] - 26/03/2022
### Changed
- Updated packages

## [0.2.5] - 04/11/2021
### Changed
- Categories are now linked to the user that added them.
- To Dos now store categoryId rather that categoryText.

## [0.2.4] - 02/11/2021
### Added
- Added Fade In animation to most elements to hide elements popping in.

## [0.2.3] - 25/10/2021
### Changed
- Finally got around to fixing poor visibility on input fields, text colour now visible.

## [0.2.2] - 25/10/2021
### Removed
- Removed registered commands that were only used for testing.

## [0.2.1] - 23/10/2021
### Added
- `CHANGELOG.md` and `README.md` updated to fit VS Extension marketplace norms.
### Changed
- Changed project name from 'VSCodeToDo' to 'Things To Do'.
- Updated `README.md` photos
- Changed name of extension from 'VSCodeToDo' to 'ThingsToDo'

## [0.2.0] - 22/10/2021
### Added
- Categories can you be added via the front end. Yay 🥳🎉🥂

## [0.1.0]
- Added to the VS Extension Marketplace
### Changed
- Categories now have collapsed/expanded indicator

## [0.0.9] - 20/10/2021
### Changed
- Fields now use VSCode dark theme colours to make it easier to see
Removed colours from To Do lists (looked a bit crap)
- Categories are now collapsable (styling on this to come, functionality more important)
- Input fields have been reduced in size to fit in more and themeing is now using vscode style variables.

## [0.0.8] - 30/06/2021
### Changed
- Now uses hosted API rather than having to have locally run Express server
- Fixed issue with selected category now being set on load

## [0.0.7] - 25/05/2021
### Changed
- Hidden categories now re-appear without needing a reload when added to. 
- Reversed colouring statement to increase variation of category colouring.
- Converted db from Postgres to MongoDB to make hosting easier for me.
- API moved to seperate project to make hosting simpler for me.
### Removed 
- Removed unnecessary layers of directories

## [0.0.6] - 25/05/2021
### Added
- If a category has no current To Dos then it is hidden to reduce clutter.


## [0.0.5] - 25/05/2021
### Changed
- `<ul>` brought back

## [0.0.4] -22/02/2021
### Added
- Added categories for better organisation

## [0.0.3] - 22/02/2021
### Added
- To Do items are removed 30 days after being completed.

## [0.0.2] - 22/02/2021
### Changed
- Increased `font-size` and `padding-top` to improve readability

## [0.0.1] - 19/02/2021
- Initial release of my first extension.
