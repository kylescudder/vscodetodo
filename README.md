# vscodetodo README

 Another to do list extension for VSCode

## Features

A short to do list that allows users to track what they have done for a given piece of work. You know what a to do list is. Come on.

For example if there is an image subfolder under your extension project workspace:

![a to do list](https://i.imgur.com/9bDCkFt.png\ "Pretty basic stuff")

Now with categories!
![categories](https://i.imgur.com/25fsRUi.png\ "Now with categories!")

To Do items grouped together by category
![grouped by categories](https://i.imgur.com/SNJZtm6.png\ "Grouped by their categories")

After 30 days of being completed, To Do items are removed to reduce clutter over long periods of time.

<!-- > Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->

## Requirements

1) VS Code 1.53.0
1) A GitHub login
1) Things to do

<!-- ## Extension Settings
 -->


<!-- For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something -->

## Known Issues

Currently the issues are:

1) Input field not saving when moving away from tab.
1) Design of list needs work

## Release Notes

### 0.0.1

Initial release of my first extension.

### 0.0.2

Increased `font-size` and `padding-top` to improve readability

### 0.0.3

To Do items are removed 30 days after being completed.

### 0.0.4

Added categories for better organisation

### 0.0.5

`<ul>` brought back

### 0.0.6

If a category has no current To Dos then it is hidden to reduce clutter.

### 0.0.7

Hidden categories now re-appear without needing a reload when added to. 
Reversed colouring statement to increase variation of category colouring.
Converted db from Postgres to MongoDB to make hosting easier for me.
API moved to seperate project to make hosting simpler for me.
Removed unnecessary layers of directories

### 0.0.8

Now uses hosted API rather than having to have locally run Express server
Fixed issue with selected categorie now being set on load

### 0.0.9

Fields now use VSCode dark theme colours to make it easier to see
Removed colours from ToDo lists (looked a bit crap)
Categories are now collapsable (styling on this to come, functionality more important)
Input fields have been reduced in size to fit in more and themeing is now using vscode style variables.

pls be nice ☺
