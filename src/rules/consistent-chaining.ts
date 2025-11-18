/**
 * 规则：consistent-chaining（统一链式调用的换行/缩进风格）
 *
 * 作用：在成员访问与调用的链式结构中，保持同一风格（单行或多行）的一致性；
 * 支持在链首属性访问处放宽（可配置 `allowLeadingPropertyAccess`）。
 */
import type { TSESTree } from '@typescript-eslint/utils'
import { createEslintRule } from '../utils'

export const RULE_NAME = 'consistent-chaining'
export type MessageIds = 'shouldWrap' | 'shouldNotWrap'
export type Options = [
  {
    allowLeadingPropertyAccess?: boolean
  },
]

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'Having line breaks styles to object, array and named imports',
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          allowLeadingPropertyAccess: {
            type: 'boolean',
            description: 'Allow leading property access to be on the same line',
            default: true,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      shouldWrap: 'Should have line breaks between items, in node {{name}}',
      shouldNotWrap: 'Should not have line breaks between items, in node {{name}}',
    },
  },
  defaultOptions: [
    {
      allowLeadingPropertyAccess: true,
    },
  ],
  /**
   * 构建 AST 监听器并应用链式访问的一致性策略
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    // 用来标记已经处理过的链式根节点，避免在深度遍历时重复计算
    const knownRoot = new WeakSet<any>()

    const {
      allowLeadingPropertyAccess = true,
    } = context.options[0] || {}

    return {
      MemberExpression(node) {
        // 自底向上寻找当前成员表达式的最顶层根节点（链表头）
        let root: TSESTree.Node = node
        while (root.parent && (root.parent.type === 'MemberExpression' || root.parent.type === 'CallExpression'))
          root = root.parent
        if (knownRoot.has(root))
          return
        knownRoot.add(root)

        const members: TSESTree.MemberExpression[] = []
        let current: TSESTree.Node | undefined = root
        // 顺着链式结构往下拆解，收集全部成员访问节点（忽略计算属性）
        while (current) {
          switch (current.type) {
            case 'MemberExpression': {
              if (!current.computed)
                members.unshift(current)
              current = current.object
              break
            }
            case 'CallExpression': {
              current = current.callee
              break
            }
            case 'TSNonNullExpression': {
              current = current.expression
              break
            }
            default: {
              // Other type of note, that means we are probably reaching out the head
              current = undefined
              break
            }
          }
        }

        let leadingPropertyAcccess = allowLeadingPropertyAccess
        let mode: 'single' | 'multi' | null = null

        members.forEach((m) => {
          // 判断当前属性访问是在同一行还是跨行，从而推算其模式
          const token = context.sourceCode.getTokenBefore(m.property)!
          const tokenBefore = context.sourceCode.getTokenBefore(token)!
          const currentMode: 'single' | 'multi' = token.loc.start.line === tokenBefore.loc.end.line ? 'single' : 'multi'
          const object = m.object.type === 'TSNonNullExpression' ? m.object.expression : m.object
          // 若允许链首属性与对象在同一行，并且满足链首匹配条件，则跳过本次判定
          if (
            leadingPropertyAcccess
            && (object.type === 'ThisExpression' || object.type === 'Identifier' || object.type === 'MemberExpression' || object.type === 'Literal')
            && currentMode === 'single'
          ) {
            return
          }

          leadingPropertyAcccess = false
          if (mode == null) {
            // 第一次命中时记录整体模式，后续节点与其比较
            mode = currentMode
            return
          }

          if (mode !== currentMode) {
            // 模式不一致时报告，并在 fix 中统一改为首次判定的模式
            context.report({
              messageId: mode === 'single' ? 'shouldNotWrap' : 'shouldWrap',
              loc: token.loc,
              data: {
                name: root.type,
              },
              fix(fixer) {
                if (mode === 'multi')
                  return fixer.insertTextAfter(tokenBefore, '\n')
                else
                  return fixer.removeRange([tokenBefore.range[1], token.range[0]])
              },
            })
          }
        })
      },
    }
  },
})
