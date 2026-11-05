const { TestEnvironment } = require("jest-expo/src/preset/nativeEnvironment");

// WHATWG fetch classes of Node, saved before jest-expo's setup replaces them (see
// jest.polyfills.js).
const NODE_FETCH = ["fetch", "Request", "Response", "Headers", "FormData"];

class SiloTestEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.global.__nodeFetch = Object.fromEntries(
      NODE_FETCH.map((name) => [name, globalThis[name]]),
    );
  }
}

module.exports = SiloTestEnvironment;
module.exports.TestEnvironment = SiloTestEnvironment;
