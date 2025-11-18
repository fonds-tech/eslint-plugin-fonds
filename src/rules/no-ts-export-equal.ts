/**
 * 规则：no-ts-export-equal（禁止使用 `exports =`）
 * 作用：引导使用 ESM 语法（`export default`），保持模块风格一致与兼容性。
 */
import { createEslintRule } from '../utils'

export const RULE_NAME = 'no-ts-export-equal'
export type MessageIds = 'noTsExportEqual'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Do not use `exports =`',
    },
    schema: [],
    messages: {
      noTsExportEqual: 'Use ESM `export default` instead',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，仅在 TS/TSX/MTS/CTS 文件中工作
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    const extension = context.getFilename().split('.').pop()
    if (!extension)
      return {}
    // 仅在 TypeScript 相关文件启用该规则，JS 文件不做检查
    if (!['ts', 'tsx', 'mts', 'cts'].includes(extension))
      return {}

    return {
      TSExportAssignment(node) {
        context.report({
          node,
          messageId: 'noTsExportEqual',
        })
      },
    }
  },
})
