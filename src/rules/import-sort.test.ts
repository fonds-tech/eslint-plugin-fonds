/**
 * 测试：import-sort 规则
 * @description 验证顶层 import 与命名导入根据长度/字母组合排序
 */
import type { InvalidTestCase, ValidTestCase } from 'eslint-vitest-rule-tester'
import { unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'
import { run } from './_test'
import rule, { RULE_NAME } from './import-sort'

const valids: ValidTestCase[] = [
  $`
    import './reset.css'
    import { a } from 'aa'
    import { foo } from 'bbb'
    
    foo()
    
    console.log(foo)
  `,
  {
    code: $`
      import { beta, alpha } from 'pkg'
      
      const bar = 1
      console.log(bar)
    `,
    options: [
      {
        inner: {
          enableLength: false,
          enableAlphabet: false,
        },
      },
    ],
  },
  {
    code: $`
      import { a } from 'a'
      import defaultExport from 'very-long-module'
      
      export function run() {
        return defaultExport(a)
      }
    `,
    options: [
      {
        outer: {
          enableLength: false,
          enableAlphabet: false,
        },
      },
    ],
  },
  {
    code: $`
      import { ccc } from 'pkg'
      import { aaa } from 'pkg'
      
      const data = { ccc, aaa }
      export default data
    `,
    options: [
      {
        outer: {
          enableLength: true,
          enableAlphabet: false,
        },
      },
    ],
  },
]

const invalid: InvalidTestCase[] = [
  {
    code: $`
      import { foo } from 'ab'
      import {
        gamma,
        alpha,
      } from 'module-two'
      import { bar } from 'aa'
      
      console.log(foo, bar)
      
      export const value = bar + alpha.length
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { bar } from 'aa'
      import { foo } from 'ab'
      import {
        alpha,
        gamma,
      } from 'module-two'

      console.log(foo, bar)

      export const value = bar + alpha.length"
    `),
  },
  {
    code: $`
      import Z from 'foo/Z'
      import './style.css'
      import {
        zebra,
        b,
        alpha,
      } from 'foo/list'
      import a from 'foo/a'
      
      export function useList() {
        return [Z, a, alpha]
      }
    `,
    options: [
      {
        outer: {
          enableLength: false,
          enableAlphabet: true,
          caseSensitive: false,
        },
        inner: {
          enableLength: true,
          enableAlphabet: false,
        },
        ignoreSideEffectImports: false,
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import {
        b,
        zebra,
        alpha,
      } from 'foo/list'
      import a from 'foo/a'
      import Z from 'foo/Z'
      import './style.css'

      export function useList() {
        return [Z, a, alpha]
      }"
    `),
  },
  {
    code: $`
      import './polyfill'
      // keep style order
      import './style.css'
      
      import { bb } from 'bb-module'
      import { componentLongName, alpha } from 'module-components'
      // util helpers
      import helperUtility from 'helper-utils'
      
      console.log(helperUtility, alpha)
      
      export default helperUtility(alpha)
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import './polyfill'
      // keep style order
      import './style.css'

      import { bb } from 'bb-module'
      import { alpha, componentLongName } from 'module-components'
      // util helpers
      import helperUtility from 'helper-utils'

      console.log(helperUtility, alpha)

      export default helperUtility(alpha)"
    `),
  },
  {
    code: $`
      import foo, {
        Zebra as Z,
        alpha,
        delta as D,
      } from 'foo-kit'
      import * as helpers from 'helpers'
      import {
        beta as B,
        alphaBeta,
        gamma,
      } from 'gamma-kit'
      
      const result = foo + helpers.value + B
      export { result }
    `,
    options: [
      {
        outer: {
          enableLength: false,
          enableAlphabet: false,
        },
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import foo, {
        alpha,
        Zebra as Z,
        delta as D,
      } from 'foo-kit'
      import {
        gamma,
        beta as B,
        alphaBeta,
      } from 'gamma-kit'
      import * as helpers from 'helpers'

      const result = foo + helpers.value + B
      export { result }"
    `),
  },
  {
    code: $`
      import defaultLong from 'long-module-path'
      import { a } from 'a'
      import short from 'x'
      import { beta } from 'beta-module'
      
      console.log(defaultLong, short)
    `,
    options: [
      {
        outer: {
          enableLength: true,
          enableAlphabet: true,
        },
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { a } from 'a'
      import { beta } from 'beta-module'
      import short from 'x'
      import defaultLong from 'long-module-path'

      console.log(defaultLong, short)"
    `),
  },
  {
    code: $`
      import { type Foo, Bar } from './types'
      import baz from './baz'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { Bar, type Foo } from './types'
      import baz from './baz'"
    `),
  },
  {
    code: $`
      import { foo } from '@/foo'
      import { bar } from '../bar'
    `,
    options: [
      {
        pathGroups: [
          {
            pattern: '^@/',
            group: 'sibling',
          },
        ],
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { bar } from '../bar'
      import { foo } from '@/foo'"
    `),
  },
  {
    code: $`
      import { fonds } from '../src/factory'
      import { builtinRules } from 'eslint/use-at-your-own-risk'
      import { flatConfigsToRulesDTS } from 'eslint-typegen/core'
      import fs from 'node:fs/promises'
    `,
    options: [
      {
        typeImportHandling: 'after',
        ignoreSideEffectImports: false,
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import fs from 'node:fs/promises'
      import { fonds } from '../src/factory'
      import { builtinRules } from 'eslint/use-at-your-own-risk'
      import { flatConfigsToRulesDTS } from 'eslint-typegen/core'"
    `),
  },
  {
    code: $`
      import type { Foo } from './types'
      import { bar } from './bar'
      import type { Bar } from './types/bar'
      import baz from './baz'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import type { Foo } from './types'
      import type { Bar } from './types/bar'
      import { bar } from './bar'
      import baz from './baz'"
    `),
  },
  {
    code: $`
      import type { Zeta } from './types'
      import { foo } from './foo'
      import type { Alpha } from './alpha'
      import './polyfill'
      import beta from './beta'
    `,
    options: [
      {
        typeImportHandling: 'after',
        ignoreSideEffectImports: false,
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { foo } from './foo'
      import beta from './beta'
      import './polyfill'
      import type { Zeta } from './types'
      import type { Alpha } from './alpha'"
    `),
  },
  {
    code: $`
      import { fonds } from '../src/factory'
      import { builtinRules } from 'eslint/use-at-your-own-risk'
      import { flatConfigsToRulesDTS } from 'eslint-typegen/core'
      import fs from 'node:fs/promises'
    `,
    options: [
      {
        typeImportHandling: 'after',
        ignoreSideEffectImports: false,
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import fs from 'node:fs/promises'
      import { fonds } from '../src/factory'
      import { builtinRules } from 'eslint/use-at-your-own-risk'
      import { flatConfigsToRulesDTS } from 'eslint-typegen/core'"
    `),
  },
]

run({
  rule,
  name: RULE_NAME,
  valid: valids,
  invalid,
})
