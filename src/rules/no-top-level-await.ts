/**
 * 规则：no-top-level-await（禁止顶层 await）
 * 作用：避免在模块顶层使用 `await`，确保顶层执行可预测并兼容打包工具。
 */
import type { TSESTree } from '@typescript-eslint/utils'
import { createEslintRule } from '../utils'

export const RULE_NAME = 'no-top-level-await'
export type MessageIds = 'NoTopLevelAwait'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent using top-level await',
    },
    schema: [],
    messages: {
      NoTopLevelAwait: 'Do not use top-level await',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，允许在函数作用域使用 `await`，顶层则报告
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    return {
      AwaitExpression: (node) => {
        let parent: TSESTree.Node | undefined = node.parent
        while (parent) {
          if (parent.type === 'FunctionDeclaration' || parent.type === 'FunctionExpression' || parent.type === 'ArrowFunctionExpression') {
            return
          }
          parent = parent.parent
        }
        context.report({
          node,
          messageId: 'NoTopLevelAwait',
        })
      },
    }
  },
})
