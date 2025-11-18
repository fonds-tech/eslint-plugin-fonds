/**
 * 规则：indent-unindent（unindent 模板标签缩进一致性）
 * 作用：为标记模板（`$`/`unindent`/`unIndent`）中的内容应用统一缩进，保持代码风格整洁。
 */
import { unindent } from '@antfu/utils'
import { createEslintRule } from '../utils'

export type MessageIds = 'indent-unindent'
export type Options = [{
  indent?: number
  tags?: string[]
}]

export default createEslintRule<Options, MessageIds>({
  name: 'indent-unindent',
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce consistent indentation in `unindent` template tag',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          indent: {
            type: 'number',
            minimum: 0,
            default: 2,
          },
          tags: {
            type: 'array',
            items: {
              type: 'string',
            },
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      'indent-unindent': 'Consistent indentation in unindent tag',
    },
  },
  defaultOptions: [{}],
  /**
   * 构建 AST 监听器，匹配目标标记模板并按配置缩进重写内容
   * @param context ESLint 规则上下文
   */
  create(context) {
    const {
      tags = ['$', 'unindent', 'unIndent'],
      indent = 2,
    } = context.options?.[0] ?? {}

    return {
      TaggedTemplateExpression(node) {
        const id = node.tag
        if (!id || id.type !== 'Identifier')
          return
        if (!tags.includes(id.name))
          return
        if (node.quasi.quasis.length !== 1)
          return
        const quasi = node.quasi.quasis[0]
        const value = quasi.value.raw
        // 依据标签所在行的缩进作为模板基准缩进
        const lineStartIndex = context.sourceCode.getIndexFromLoc({
          line: node.loc.start.line,
          column: 0,
        })
        const baseIndent = context.sourceCode.text.slice(lineStartIndex).match(/^\s*/)?.[0] ?? ''
        const targetIndent = baseIndent + ' '.repeat(indent)
        // 使用 `unindent` 去除模板内部已有缩进后，逐行补上目标缩进
        const pure = unindent([value] as any)
        let final = pure
          .split('\n')
          .map(line => targetIndent + line)
          .join('\n')

        final = `\n${final}\n${baseIndent}`

        if (final !== value) {
          context.report({
            node: quasi,
            messageId: 'indent-unindent',
            fix: fixer => fixer.replaceText(quasi, `\`${final}\``),
          })
        }
      },
    }
  },
})
