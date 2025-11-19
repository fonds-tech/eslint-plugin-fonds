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
      import defaultExport from 'very-long-module'
      import { a } from 'a'
      
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
  // 组合：显式要求副作用导入也参与排序，当前顺序应视为合法
  {
    code: $`
      import { alpha } from './alpha'
      import './polyfill.css'
      import './reset.css'
    `,
    options: [
      {
        ignoreSideEffectImports: false,
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
  // 组合：命名、默认与 namespace 导入需要按类别优先级排序
  {
    code: $`
      import * as api from './api'
      import foo from './foo'
      import { bar } from './bar'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import foo from './foo'
      import { bar } from './bar'
      import * as api from './api'"
    `),
  },
  // 组合：命名导入在忽略大小写的前提下需要按字母顺序重排
  {
    code: $`
      import {
        zebra,
        Alpha,
        beta,
      } from './foo'
    `,
    options: [
      {
        inner: {
          enableLength: false,
          enableAlphabet: true,
          caseSensitive: false,
        },
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import {
        Alpha,
        beta,
        zebra,
      } from './foo'"
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
      "import a from 'foo/a'
      import Z from 'foo/Z'
      import {
        b,
        zebra,
        alpha,
      } from 'foo/list'
      import './style.css'

      export function useList() {
        return [Z, a, alpha]
      }"
    `),
  },
  // 组合：启用副作用导入排序时，副作用语句需整体位于普通导入之后
  {
    code: $`
      import './polyfill.css'
      import { alpha } from './alpha'
      import './reset.css'
    `,
    options: [
      {
        ignoreSideEffectImports: false,
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { alpha } from './alpha'
      import './polyfill.css'
      import './reset.css'"
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
      // util helpers
      import helperUtility from 'helper-utils'

      import { bb } from 'bb-module'
      import { alpha, componentLongName } from 'module-components'

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
      "import short from 'x'
      import defaultLong from 'long-module-path'
      import { a } from 'a'
      import { beta } from 'beta-module'

      console.log(defaultLong, short)"
    `),
  },
  {
    code: $`
      import { type Foo, Bar } from './types'
      import baz from './baz'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import baz from './baz'
      import { Bar, type Foo } from './types'"
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
  // 组合：多条 pathGroups 配置下，命中规则的导入需要比外部模块更靠前
  {
    code: $`
      import axios from 'axios'
      import { Button } from '~/components/button'
      import { coreUtil } from '@core/utils'
    `,
    options: [
      {
        pathGroups: [
          {
            pattern: '^@core/',
            group: 'parent',
          },
          {
            pattern: '^~/',
            group: 'sibling',
          },
        ],
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { coreUtil } from '@core/utils'
      import { Button } from '~/components/button'
      import axios from 'axios'"
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
      import baz from './baz'
      import { bar } from './bar'"
    `),
  },
  // 组合：typeImportHandling 为 ignore 时，类型导入需要自动提前
  {
    code: $`
      import fs from 'node:fs'
      import type { EnvConfig } from './types'
    `,
    options: [
      {
        typeImportHandling: 'ignore',
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import type { EnvConfig } from './types'
      import fs from 'node:fs'"
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
      "import beta from './beta'
      import { foo } from './foo'
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
  {
    code: $`
      import type { OptionsFiles, OptionsOverrides, TypedFlatConfigItem, OptionsComponentExts } from '../types'
      import { parserPlain, interopDefault } from '../utils'
      import { GLOB_MARKDOWN, GLOB_MARKDOWN_CODE, GLOB_MARKDOWN_IN_MARKDOWN } from '../globs'
      import { mergeProcessors, processorPassThrough } from 'eslint-merge-processors'
    `,
    options: [
      {
        typeImportHandling: 'after',
        ignoreSideEffectImports: false,
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { parserPlain, interopDefault } from '../utils'
      import { mergeProcessors, processorPassThrough } from 'eslint-merge-processors'
      import { GLOB_MARKDOWN, GLOB_MARKDOWN_CODE, GLOB_MARKDOWN_IN_MARKDOWN } from '../globs'
      import type { OptionsFiles, OptionsOverrides, TypedFlatConfigItem, OptionsComponentExts } from '../types'"
    `),
  },
  {
    code: $`
      import {
        b, // comment b
        a,
      } from 'mod'
      import { x } from '..'
      import { y } from '../parent'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { x } from '..'
      import { y } from '../parent'
      import {
        a,
        b, // comment b
      } from 'mod'"
    `),
  },
  // 1. Complex Comments: Block comments and interleaved comments
  {
    code: $`
      import {
        /* start */ b,
        a /* end */
      } from 'mod'
      import {
        d, // trailing d
        c
      } from 'mod2'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import {
        c,
        d // trailing d
      } from 'mod2'
      import {
        a /* end */,
        /* start */ b
      } from 'mod'"
    `),
  },
  // 2. Mixed & Type Imports: Inline types, default + named
  {
    code: $`
      import { type T, v } from 'mod'
      import D, { type U, x } from 'mod2'
    `,
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { v, type T } from 'mod'
      import D, { x, type U } from 'mod2'"
    `),
  },
  // 3. Advanced Path Groups: Multiple custom patterns
  {
    code: $`
      import { ui } from '@ui/components'
      import { utils } from '@utils/helpers'
      import { api } from '@server/api'
      import { ext } from 'external-lib'
    `,
    options: [
      {
        pathGroups: [
          { pattern: '^@ui/', group: 'external' },
          { pattern: '^@utils/', group: 'parent' },
          { pattern: '^@server/', group: 'sibling' },
        ],
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { utils } from '@utils/helpers'
      import { api } from '@server/api'
      import { ui } from '@ui/components'
      import { ext } from 'external-lib'"
    `),
  },
  // 4. Case Sensitivity: Mixed case sorting
  {
    code: $`
      import { B, a, c } from 'mod'
      import { D, e, F } from 'mod2'
    `,
    options: [
      {
        inner: { caseSensitive: false },
      },
    ],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { a, B, c } from 'mod'
      import { D, e, F } from 'mod2'"
    `),
  },
  // 5. Side Effects: Interleaved side-effect imports
  {
    code: $`
      import 'side-effect-a'
      import { b } from 'b'
      import 'side-effect-c'
      import { a } from 'a'
    `,
    options: [{ ignoreSideEffectImports: false }],
    output: output => expect(output).toMatchInlineSnapshot(`
      "import { a } from 'a'
      import { b } from 'b'
      import 'side-effect-a'
      import 'side-effect-c'"
    `),
  },
]

run({
  rule,
  name: RULE_NAME,
  valid: valids,
  invalid,
})
