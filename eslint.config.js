import eslint from '@fonds/eslint-config'
import { tsImport } from 'tsx/esm/api'

const local = await tsImport('./src/index.ts', import.meta.url).then(r => r.default)

export default eslint(
  {
    type: 'lib',
  },
  {
    ignores: ['vendor'],
  },
  {
    name: 'tests',
    files: ['**/*.test.ts'],
    rules: {
      'fonds/indent-unindent': 'error',
    },
  },
  {
    rules: {
      'unicorn/consistent-function-scoping': 'off',
      'fonds/consistent-chaining': 'error',
    },
  },
)
  // replace local config
  .onResolved((configs) => {
    configs.forEach((config) => {
      if (config?.plugins?.fonds) {
        config.plugins.fonds = local
      }
    })
  })
