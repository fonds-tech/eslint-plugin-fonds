# eslint-plugin-fonds

<div align="left">
<b>English</b> | <a href="README.zh-CN.md">简体中文</a>
<br>
</div>

`eslint-plugin-fonds` ships Fonds-style ESLint rules so Flat-Config-based TypeScript/JavaScript projects (ESLint v9+) share the same conventions for chaining layout, list literals, tagged template indentation, and module boundaries.

## Key Features

- **Chaining consistency**: `fonds/consistent-chaining` keeps every property/method access aligned with the first segment.
- **List layout control**: `fonds/consistent-list-newline` unifies arrays, objects, imports/exports, JSX attributes, and TS types.
- **Template indentation guard**: `fonds/indent-unindent` normalizes `unindent`/`$` tagged templates without affecting runtime output.
- **Module hygiene**: rules like `fonds/no-import-dist`, `fonds/no-import-node-modules-by-path`, `fonds/no-top-level-await`, and `fonds/no-ts-export-equal` ensure safe boundaries.
- **Auto-fix where possible**: most formatting rules provide precise fixers so refactors stay painless.

## Installation

Install ESLint and the plugin as dev dependencies (choose your package manager):

```bash
pnpm add -D eslint eslint-plugin-fonds
npm install -D eslint eslint-plugin-fonds
yarn add -D eslint eslint-plugin-fonds
```

## Quick Start

Add the plugin to your `eslint.config.js` and enable the rules you need:

```js
// eslint.config.js
import fonds from 'eslint-plugin-fonds'

export default [
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      fonds,
    },
    rules: {
      'fonds/consistent-chaining': 'error',
      'fonds/consistent-list-newline': 'warn',
      'fonds/indent-unindent': 'error',
      'fonds/top-level-function': 'error',
    },
  },
  {
    files: ['examples/**/*.{ts,tsx,js,jsx}'],
    plugins: { fonds },
    rules: {
      'fonds/consistent-chaining': 'off',
      'fonds/consistent-list-newline': 'off',
    },
  },
]
```

- Split configs by `files` globs so demos, scripts, or tests can relax formatting rules without affecting the main codebase.
- Combine the plugin with other Flat Config composers (for example `@fonds/eslint-config`) if you prefer higher-level presets.

## Rule Reference

| Rule                                   | Description                                                                                                                     | Fixable | Key Options                                    |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------- |
| `fonds/consistent-chaining`            | Forces property/method chains to follow the newline style of the first access.                                                  | Yes     | `allowLeadingPropertyAccess` (default `true`). |
| `fonds/consistent-list-newline`        | Keeps arrays, objects, imports/exports, JSX props, and TS types either inline or multi-line consistently.                       | Yes     | Per-node boolean flags to toggle coverage.     |
| `fonds/curly`                          | Anthony Fu's take on `curly`: multiline or nested statements must use braces, while single-line statements may stay brace-less. | Yes     | Not configurable.                              |
| `fonds/if-newline`                     | Inline `if` statements must place the consequent on the next line.                                                              | Yes     | None.                                          |
| `fonds/import-dedupe`                  | Deduplicates import specifiers automatically.                                                                                   | Yes     | None.                                          |
| `fonds/indent-unindent`                | Normalizes indentation inside `unindent`/`$` template literals so their runtime output stays stable.                            | Yes     | `indent` (number), `tags` (string array).      |
| `fonds/no-import-dist`                 | Blocks `import` statements that point to a `dist` directory.                                                                    | No      | None.                                          |
| `fonds/no-import-node-modules-by-path` | Forbids importing or requiring files through explicit `node_modules` paths.                                                     | No      | None.                                          |
| `fonds/no-top-level-await`             | Rejects `await` expressions that are not wrapped by a function.                                                                 | No      | None.                                          |
| `fonds/no-ts-export-equal`             | Prevents `export =` assignments in TypeScript files; enforce ESM `export default`.                                              | No      | None.                                          |
| `fonds/top-level-function`             | Converts exported top-level arrow/function expressions into `function` declarations for clarity and hoisting.                   | Yes     | None.                                          |

Each rule has a dedicated doc under `src/rules/<rule>.md` with rationale, examples, and tests.

## Advanced Configuration

Fine-tune the opinionated rules through their options when necessary:

```js
export default [{
  plugins: { fonds },
  rules: {
    'fonds/indent-unindent': ['error', {
      indent: 4,
      tags: ['$', 'unindent', 'styled'],
    }],
    'fonds/consistent-list-newline': ['warn', {
      ObjectExpression: true,
      ArrayExpression: true,
      ImportDeclaration: false,
      JSXOpeningElement: false,
    }],
    'fonds/consistent-chaining': ['error', {
      allowLeadingPropertyAccess: true,
    }],
  },
}]
```

- For `indent-unindent`, `indent` controls indentation width while `tags` selects which template tags opt into the rule.
- `consistent-list-newline` toggles each AST node type via booleans so you can scope the behavior precisely.
- Other rules have intentional zero-config defaults; fork a rule file if you need project-specific behavior.

## Local Development

- `pnpm install`: install dependencies.
- `pnpm dev`: run `unbuild --stub` in watch mode while developing rules.
- `pnpm lint`: build stubs and lint the entire repo with ESLint.
- `pnpm test`: execute Vitest to validate rule behavior.
- `pnpm build`: emit the publishable artifacts under `dist/`.

Refer to [CONTRIBUTING.md](./CONTRIBUTING.md) for the Fonds contributor handbook.

## Thanks

This project is based on the fantastic work of [eslint-plugin-antfu](https://github.com/antfu/eslint-plugin-antfu), with additional customizations built on top. Huge thanks to the upstream project for the inspiration.

## License & Maintainers

- License: [MIT](./LICENSE)
- Maintainers: [fonds-tech](https://github.com/fonds-tech)
