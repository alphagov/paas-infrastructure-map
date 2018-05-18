module.exports = {
	globals: {
		'ts-jest': {
			skipBabel: true,
			enableTsDiagnostics: false,
			disableSourceMapSupport: true
		}
	},
	setupTestFrameworkScriptFile: './jest.setup.js',
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest'
	},
	collectCoverage: true,
	coverageReporters: [
		'json',
		'text'
	],
	collectCoverageFrom: [
		'src/**/*.{ts,tsx}',
		'!**/node_modules/**'
	],
	coverageThreshold: {
		global: {
			branches: 100,
			functions: 100,
			lines: 100,
			statements: 100
		}
	},
	testRegex: 'test\\.(ts|tsx)$',
	moduleFileExtensions: [
		'ts',
		'tsx',
		'js',
		'jsx',
		'json',
		'node'
	],
	moduleDirectories: [
		'node_modules'
	],
	testEnvironment: 'node'
};
