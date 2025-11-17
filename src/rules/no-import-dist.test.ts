/**
 * 测试：no-import-dist 规则
 * 内容：禁止导入 `dist` 目录的模块。
 */
import { run } from './_test'
import rule, { RULE_NAME } from './no-import-dist'

const valids = [
  'import xxx from "a"',
  'import "b"',
  'import "floating-vue/dist/foo.css"',
]

const invalids = [
  'import a from "../dist/a"',
  'import "../dist/b"',
  'import b from \'dist\'',
  'import c from \'./dist\'',
]

run({
  name: RULE_NAME,
  rule,
  valid: valids,
  invalid: invalids.map(i => ({
    code: i,
    errors: [{ messageId: 'noImportDist' }],
  })),
})
