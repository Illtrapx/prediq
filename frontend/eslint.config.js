import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

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
      globals: globals.browser,
    },
    rules: {
      // Intentional pattern: synchronously resetting/seeding state in effects
      // on dep changes (e.g. deadline change → immediate countdown resync).
      // The alternative (derive during render) requires Date.now() at render
      // time which triggers react-hooks/purity — a worse trade-off.
      'react-hooks/set-state-in-effect': 'warn',
      // Date.now() / Math.random() in render helpers are acceptable when the
      // value is a stable fallback (e.g. MyBetsPage deadline default).
      'react-hooks/purity': 'warn',
    },
  },
])
