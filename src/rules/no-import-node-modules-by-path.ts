/**
 * 规则：no-import-node-modules-by-path（禁止通过路径导入 node_modules）
 * 作用：阻止使用相对或绝对路径直接指向 `node_modules` 的导入/require。
 */
import { createEslintRule } from '../utils'

export const RULE_NAME = 'no-import-node-modules-by-path'
export type MessageIds = 'noImportNodeModulesByPath'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent importing modules in `node_modules` folder by relative or absolute path',
    },
    schema: [],
    messages: {
      noImportNodeModulesByPath: 'Do not import modules in `node_modules` folder by path',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，覆盖 `import` 与 `require` 两种导入形式
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    return {
      'ImportDeclaration': (node) => {
        if (node.source.value.includes('/node_modules/')) {
          context.report({
            node,
            messageId: 'noImportNodeModulesByPath',
          })
        }
      },
      'CallExpression[callee.name="require"]': (node: any) => {
        const value = node.arguments[0]?.value
        if (typeof value === 'string' && value.includes('/node_modules/')) {
          context.report({
            node,
            messageId: 'noImportNodeModulesByPath',
          })
        }
      },
    }
  },
})
