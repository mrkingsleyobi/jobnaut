// Jest configuration for JobNaut
// Configure Jest testing environment and options

module.exports = {
  // The test environment that will be used for testing
  testEnvironment: 'node',

  // The root directory that Jest should scan for tests and modules within
  rootDir: '.',

  // The glob patterns Jest uses to detect test files
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],

  // Exclude frontend tests that use Vitest syntax
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/frontend/tests/'
  ],

  // A map from regular expressions to paths to transformers
  transform: {},

  // An array of regexp pattern strings that are matched against all source file paths, matched files will skip transformation
  transformIgnorePatterns: [
    '/node_modules/',
    '\\.pnp\\.[^\\/]+$'
  ],

  // A list of paths to modules that run some code to configure or set up the testing environment
  setupFiles: [],

  // A list of paths to modules that run some code to configure or set up the testing framework before each test
  setupFilesAfterEnv: [],

  // The test environment options that will be passed to the testEnvironment
  testEnvironmentOptions: {
    url: 'http://localhost',
  },

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  moduleNameMapper: {},

  // An array of regexp pattern strings that are matched against all module paths before considered 'visible' to the module loader
  modulePathIgnorePatterns: [],

  // Activates notifications for test results
  notify: false,

  // An enum that specifies notification mode. Requires { notify: true }
  notifyMode: 'failure-change',

  // A preset that is used as a base for Jest's configuration
  preset: null,

  // Run tests from one or more projects
  projects: null,

  // Use this configuration option to add custom reporters to Jest
  reporters: undefined,

  // Automatically reset mock state before every test
  resetMocks: false,

  // Reset the module registry before running each individual test
  resetModules: false,

  // A path to a custom resolver
  resolver: null,

  // Automatically restore mock state and implementation before every test
  restoreMocks: false,

  // The root directory that Jest should scan for tests and modules within
  roots: ['<rootDir>'],

  // Allows you to use a custom runner instead of Jest's default test runner
  runner: 'jest-runner',

  // The paths to modules that run some code to configure or set up the testing environment before each test
  globalSetup: null,

  // The paths to modules that run some code to configure or set up the testing framework before each test
  globalTeardown: null,

  // A set of global variables that need to be available in all test environments
  globals: {},

  // The maximum amount of workers used to run your tests
  maxWorkers: '50%',

  // An array of directory names to be searched recursively up from the requiring module's location
  moduleDirectories: ['node_modules'],

  // An array of file extensions your modules use
  moduleFileExtensions: ['js', 'json', 'jsx', 'ts', 'tsx', 'node'],

  // A map from regular expressions to module names or to arrays of module names that allow to stub out resources with a single module
  modulePaths: [],

  // This option allows the use of a custom results processor
  testResultsProcessor: null,

  // This option allows use of a custom test runner
  testRunner: 'jest-circus/runner',

  // Fake timers configuration
  fakeTimers: {
    enableGlobally: false,
  },

  // An array of regexp pattern strings that are matched against all modules before the module loader will automatically return a mock for them
  unmockedModulePathPatterns: [],

  // Indicates whether each individual test should be reported during the run
  verbose: null,

  // An array of regexp patterns that are matched against all source file paths before re-running tests in watch mode
  watchPathIgnorePatterns: [],

  // Whether to use watchman for file crawling
  watchman: true,

  // Collect coverage information
  collectCoverage: false,

  // An array of glob patterns indicating a set of files for which coverage information should be collected
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/python/**',
    '!src/index.js',
    '!**/node_modules/**',
    '!**/dist/**',
  ],

  // The directory where Jest should output its coverage files
  coverageDirectory: 'coverage',

  // An array of regexp pattern strings used to skip coverage collection
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/frontend/',
    '/tests/',
    '/python/',
  ],

  // A list of reporter names that Jest uses when writing coverage reports
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json'],

  // An object that configures minimum threshold enforcement for coverage results
  coverageThreshold: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },
};