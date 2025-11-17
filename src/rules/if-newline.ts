/**
 * 规则：if-newline（if 条件后换行）
 * 作用：在 `if (cond)` 与其紧随的非块语句之间插入换行，提升可读性。
 */
import { createEslintRule } from '../utils'

export const RULE_NAME = 'if-newline'
export type MessageIds = 'missingIfNewline'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'Newline after if',
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      missingIfNewline: 'Expect newline after if',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，确保 `if` 条件与后续语句之间存在换行
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    return {
      IfStatement(node) {
        if (!node.consequent)
          return
        if (node.consequent.type === 'BlockStatement')
          return
        if (node.test.loc.end.line === node.consequent.loc.start.line) {
          context.report({
            node,
            loc: {
              start: node.test.loc.end,
              end: node.consequent.loc.start,
            },
            messageId: 'missingIfNewline',
            fix(fixer) {
              return fixer.replaceTextRange([node.consequent.range[0], node.consequent.range[0]], '\n')
            },
          })
        }
      },
    }
  },
})
