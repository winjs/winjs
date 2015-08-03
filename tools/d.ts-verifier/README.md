# winjs-control-apis

A command line tool which takes a version of the WinJS TypeScript type definition file as input and generates the API surface for the WinJS controls as output. This is useful when building wrappers around WinJS controls such as [angular-winjs](https://github.com/winjs/angular-winjs).

## Usage

- Clone the project:
  ```
  git clone https://github.com/rigdern/winjs-control-apis.git
  ```

- Install the dependencies:
  ```
  cd winjs-control-apis
  npm install
  ```

- Run the program with a version of the WinJS TypeScript type definition file:
  ```
  node ./main.js /path/to/winjs.d.ts
  ```

## License

MIT
