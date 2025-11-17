/**
 * 测试：import-dedupe 规则
 * 内容：移除同一导入语句中的重复标识符。
 */
import { run } from './_test'
import rule, { RULE_NAME } from './import-dedupe'

const valids = [
  'import { a } from \'foo\'',
]
const invalids = [
  [
    'import { a, b, a, a, c, a } from \'foo\'',
    'import { a, b,   c,  } from \'foo\'',
  ],
]

run({
  name: RULE_NAME,
  rule,
  valid: valids,
  invalid: invalids.map(i => ({
    code: i[0],
    output: i[1],
    errors: [{ messageId: 'importDedupe' }, { messageId: 'importDedupe' }, { messageId: 'importDedupe' }],
  })),
})
