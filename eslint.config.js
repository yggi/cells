import js from '@eslint/js';
import ts from 'typescript-eslint';
import globals from 'globals';

// Rules that catch real problems, not style (Prettier owns style). Errors fail `npm run verify`; warnings are listed, not blocking.
export default ts.config({ ignores: ['node_modules', 'docs', 'examples', 'midi'] }, js.configs.recommended, ...ts.configs.recommended, {
  languageOptions: { globals: { ...globals.node } },
  rules: {
    // A leading underscore says "unused on purpose" (a positional argument, a name dropped from a destructuring).
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_', ignoreRestSiblings: true }],
    // `catch {}` that means "best effort" is fine.
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Off: the house style writes several effects in one statement as `if (x) (a(), b());` (Prettier keeps the parentheses).
    '@typescript-eslint/no-unused-expressions': 'off',
  },
});
