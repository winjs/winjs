Windows Library for JavaScript (WinJS)
=====

The WinJS source code of the existing WinJS library is released under the Apache 2.0 license as an Open Source project by [Microsoft Open Technologies](http://aka.ms/winjsopensource), the Microsoft wholly owned subsidiary created to advance Microsoft’s investment in openness and interoperability.

WinJS is a set of actively developed JavaScript toolkits that allow developers to build applications using HTML/JS/CSS technology forged with the following principles in mind:

* Provide developers with a distinctive set UI controls with high polish and performance with fundamental support for touch, mouse, keyboard and accessibility
* Provide developers with a cohesive set of components and utilities to build the scaffolding and infrastructure of their applications

# Contribute
There are many of ways to [contribute](https://github.com/winjs/winjs/wiki/Contribute) to the project.

You can contribute by reviewing and sending feedback on code checkins, suggesting and trying out new features as they are implemented, submit bugs and help us verify fixes as they are checked in, as well as submit code fixes or code contributions of your own.

Note that all code submissions will be rigorously reviewed and tested by the team, and only those that meet an extremely high bar for both quality and design/roadmap appropriateness will be merged into the source.

# Roadmap
The source code on this repo is under active development that will be part of our next release. For details on our planned features and future direction please refer to our [roadmap](https://github.com/winjs/winjs/wiki/Roadmap).

# Build WinJS
In order build WinJS, ensure that you have [git](http://git-scm.com/downloads) and [Node.js](http://nodejs.org/download/) installed.

Clone a copy of the master WinJS git repo:
```
git clone git://github.com/winjs/winjs.git
```

Change to the `winjs` directory:
```
cd winjs
```

Install the [grunt command-line interface](https://github.com/gruntjs/grunt-cli) globally:
```
npm install -g grunt-cli
```

Grunt dependencies are installed separately in each cloned git repo and install the dependencies with:
```
npm install
```

Run the following and the WinJS JavaScript and CSS files will be put in the `bin` directory:
```
grunt
```


