# d.ts-verifier

## Contents x2
- __main.js:__ A NodeJS command line tool which takes a version of the WinJS.d.ts file as input and generates the public API surface it defines for WinJS.
- __d.ts-verifier.js:__ A Javascript file which analyzes the output of the command line tool and compares it with the public API surface of a version of WinJS loaded in the DOM.

## Usage

- #### Install the dependencies:
  ```
  cd winjs/tools/d.ts-verifier 
  npm install
  ```

- #### Run the command line tool program with a version of the WinJS TypeScript type definition file:
  ```
  node ./main.js /path/to/winjs.d.ts
  ```
  This will output a model of the WinJS public API to `result.txt`
    
- #### Analyze WinJS in the DOM and compare it to the model from WinJS.d.ts:
 1. Replace the definition of model in `data.js` with the output from `result.txt`
 2. Drop the latest version of WinJS files `base.js` and `ui.js` into the current directory
 3. Open `index.html` in a browser and inspect the output from the console.

## License

MIT
