/**
 * 规则：import-dedupe（导入去重）
 * 作用：移除同一导入语句中重复的本地标识符，保持整洁与无重复。
 */
import { createEslintRule } from '../utils'

export const RULE_NAME = 'import-dedupe'
export type MessageIds = 'importDedupe'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Fix duplication in imports',
    },
    fixable: 'code',
    schema: [],
    messages: {
      importDedupe: 'Expect no duplication in imports',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，检测并移除重复的 `ImportSpecifier`
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    return {
      ImportDeclaration(node) {
        if (node.specifiers.length <= 1)
          return

        const names = new Set<string>()
        node.specifiers.forEach((n) => {
          const id = n.local.name
          if (names.has(id)) {
            /**
             * 去重策略：保留首次出现的本地标识符，移除后续重复项；
             * 若存在拖尾逗号则一并删除，避免产生残留分隔符。
             */
            context.report({
              node,
              loc: {
                start: n.loc.end,
                end: n.loc.start,
              },
              messageId: 'importDedupe',
              fix(fixer) {
                const s = n.range[0]
                let e = n.range[1]
                // 尝试同时删除拖尾逗号，避免产生孤立分隔符
                if (context.getSourceCode().text[e] === ',')
                  e += 1
                return fixer.removeRange([s, e])
              },
            })
          }
          names.add(id)
        })

        // console.log(node)
      },
    }
  },
})
