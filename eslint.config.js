import globals from 'globals';
import eslintJs from '@eslint/js';
import eslintJsdocPlugin from 'eslint-plugin-jsdoc';
import eslintMochaPlugin from 'eslint-plugin-mocha';
import eslintPrettierConfig from 'eslint-config-prettier';
import eslintChaiExpectPlugin from 'eslint-plugin-chai-expect';

export default [{
  languageOptions: {
    globals: {
      ...globals.node,
      ...globals.es2021,
      ...globals.mocha,
    },
  },
  plugins: {
    'jsdoc': eslintJsdocPlugin,
    'mocha': eslintMochaPlugin,
    'chai-expect': eslintChaiExpectPlugin,
  },
  rules: {
    ...eslintJs.configs.recommended.rules,
    ...eslintPrettierConfig.rules,
    ...eslintMochaPlugin.configs.recommended.rules,
    ...eslintChaiExpectPlugin.configs['recommended-flat'].rules,
    ...eslintJsdocPlugin.configs['flat/recommended-error'].rules,
    'curly': 'error',
    'no-duplicate-imports': 'error',
    'jsdoc/reject-any-type': 0,
    'jsdoc/reject-function-type': 0,
    'jsdoc/require-param-description': 0,
    'jsdoc/require-returns-description': 0,
    'jsdoc/require-property-description': 0,
    'jsdoc/tag-lines': ['error', 'any', {startLines: 1}],
  },
  files: ['src/**/*.js'],
}];
