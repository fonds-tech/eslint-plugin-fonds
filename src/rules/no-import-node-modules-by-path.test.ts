/**
 * 测试：no-import-node-modules-by-path 规则
 * 内容：阻止通过路径指向 `node_modules` 的导入/require。
 */
import { run } from './_test'
import rule, { RULE_NAME } from './no-import-node-modules-by-path'

const valids = [
  'import xxx from "a"',
  'import "b"',
  'const c = require("c")',
  'require("d")',
]

const invalids = [
  'import a from "../node_modules/a"',
  'import "../node_modules/b"',
  'const c = require("../node_modules/c")',
  'require("../node_modules/d")',
]

run({
  name: RULE_NAME,
  rule,
  valid: valids,
  invalid: invalids.map(i => ({
    code: i,
    errors: [{ messageId: 'noImportNodeModulesByPath' }],
  })),
})
