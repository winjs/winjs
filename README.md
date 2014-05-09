Windows Library for JavaScript (WinJS)
=====
 [![Build Status](https://travis-ci.org/winjs/winjs.svg?branch=master)](https://travis-ci.org/winjs/winjs)
 
This project is actively developed by the WinJS developers working for Microsoft Open Technologies, in collaboration with the community of open source developers. Together we are dedicated to creating the best possible solution for HTML/JS/CSS application development.

WinJS is a set of JavaScript toolkits that allow developers to build applications using HTML/JS/CSS technology forged with the following principles in mind:

* Provide developers with a distinctive set of UI controls with high polish and performance with fundamental support for touch, mouse, keyboard and accessibility
* Provide developers with a cohesive set of components and utilities to build the scaffolding and infrastructure of their applications

This is a first step for the WinJS project and there is still a lot of work that needs to be done. So please check out the [roadmap](https://github.com/winjs/winjs/wiki/Roadmap) to see where the project is headed or participate by [contributing](https://github.com/winjs/winjs/wiki/Contribute) along the way.

# Contribute
There are many ways to [contribute](https://github.com/winjs/winjs/blob/master/CONTRIBUTING.md) to the project.

You can contribute by reviewing and sending feedback on code checkins, suggesting and trying out new features as they are implemented, submitting bugs and helping us verify fixes as they are checked in, as well as submitting code fixes or code contributions of your own.

Note that all code submissions will be rigorously reviewed and tested by the team, and only those that meet an extremely high bar for both quality and design/roadmap appropriateness will be merged into the source.

# Roadmap
The source code on this repo is under active development that will be part of our next release. For details on our planned features and future direction, please refer to our [roadmap](https://github.com/winjs/winjs/wiki/Roadmap).

# Build WinJS
In order to build WinJS, ensure that you have [git](http://git-scm.com/downloads) and [Node.js](http://nodejs.org/download/) installed.

Clone a copy of the master WinJS git repo:
```
git clone https://github.com/winjs/winjs.git
```

Change to the `winjs` directory:
```
cd winjs
```

Install the [grunt command-line interface](https://github.com/gruntjs/grunt-cli) globally:
```
npm install -g grunt-cli
```

Grunt dependencies are installed separately in each cloned git repo. Install the dependencies with:
```
npm install
```

Run the following and the WinJS JavaScript and CSS files will be put in the `bin` directory:
```
grunt
```

> **Note:** You may need to use sudo (for OSX, *nix, BSD etc) or run your command shell as Administrator (for Windows) to install Grunt globally.

# Tests status
Refer to http://try.buildwinjs.com/#status for the current status of the unit tests and the list of known issues.

# Try WinJS
Check out our online playground http://try.buildwinjs.com
