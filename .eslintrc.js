module.exports = {
	env: {
		browser: true,
		node: true
	},
	extends: 'xo',
	overrides: [
		{
			files: 'src/**/*.js',
			rules: {
				'capitalized-comments': false,
				'comma-dangle': ['error', 'always-multiline'],
				'no-console': ['warn'],
				'no-unused-vars': ['error', {
					ignoreRestSiblings: true,
					argsIgnorePattern: '(^_[a-z]|^t$)'
				}],
			}
		}
	]
};
