/**
 * 测试：no-ts-export-equal 规则
 * 内容：在 TS 文件中禁止使用 `exports =`。
 */
import { run } from './_test'
import rule, { RULE_NAME } from './no-ts-export-equal'

run({
  name: RULE_NAME,
  rule,
  valid: [
    { code: 'export default {}', filename: 'test.ts' },
    { code: 'export = {}', filename: 'test.js' },
  ],
  invalid: [
    {
      code: 'export = {}',
      filename: 'test.ts',
      errors(errors) {
        expect(errors.map(i => i.message))
          .toMatchInlineSnapshot(`
            [
              "Use ESM \`export default\` instead",
            ]
          `)
      },
    },
  ],
})
