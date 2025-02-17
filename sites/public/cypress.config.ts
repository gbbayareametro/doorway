import { defineConfig } from "cypress"

export default defineConfig({
  defaultCommandTimeout: 100000,
  projectId: "f32m8f",
  pageLoadTimeout: 100000,
  video: true,
  videoUploadOnPasses: false,
  numTestsKeptInMemory: 0,
  scrollBehavior: "center",

  env: {
    codeCoverage: {
      url: "/api/__coverage__",
    },
  },

  e2e: {
    // We've imported your old cypress plugins here.
    // You may want to clean this up later by importing these.
    setupNodeEvents(on, config) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      return require("./cypress/plugins/index.js")(on, config)
    },
    baseUrl: "http://localhost:3000",
    specPattern: "cypress/e2e/**/*.{js,jsx,ts,tsx}",
  },

  component: {
    devServer: {
      framework: "next",
      bundler: "webpack",
    },
  },
})
