import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import unicorn from 'eslint-plugin-unicorn'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

// unicorn/filename-case needs a working parser to even run (it hooks the
// `Program` node); CSS has no JS syntax to parse, so a no-op parser that
// hands back an empty Program is enough since only filename-case runs here.
const noopParser = {
  parseForESLint(code) {
    return {
      ast: {
        type: 'Program',
        body: [],
        comments: [],
        tokens: [],
        range: [0, code.length],
        loc: {
          start: { line: 1, column: 0 },
          end: { line: code.split('\n').length, column: 0 },
        },
      },
    }
  },
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // .tsx component files -> PascalCase (folders checked separately below)
  {
    files: ['**/*.tsx'],
    ignores: [
      '**/index.tsx',
      'src/main.tsx',
      'src/apps/terminal/shell/commands.tsx',
      'src/apps/terminal/shell/file-system.tsx',
    ],
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        { case: 'pascalCase', checkDirectories: false },
      ],
    },
  },

  // index.ts / index.tsx entrance files -> filename itself is exempt by
  // default; this block's real job is enforcing kebabCase on every folder
  // that contains one (i.e. virtually every component/module directory).
  {
    files: ['**/index.ts', '**/index.tsx'],
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        { case: 'kebabCase', checkDirectories: true },
      ],
    },
  },

  // plain .ts logic/util/hook files -> kebabCase (also reinforces folder
  // kebabCase for any directory these live in)
  {
    files: ['**/*.ts'],
    ignores: ['**/index.ts'],
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        { case: 'kebabCase', checkDirectories: true },
      ],
    },
  },

  // component-scoped CSS Modules -> PascalCase, matches the component
  {
    files: ['**/*.module.css', '**/*.module.scss'],
    languageOptions: { parser: noopParser },
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        { case: 'pascalCase', checkDirectories: false },
      ],
    },
  },

  // global/plain stylesheets -> kebabCase
  {
    files: ['**/*.css', '**/*.scss'],
    ignores: ['**/*.module.css', '**/*.module.scss'],
    languageOptions: { parser: noopParser },
    plugins: { unicorn },
    rules: {
      'unicorn/filename-case': [
        'error',
        { case: 'kebabCase', checkDirectories: true },
      ],
    },
  },
])
