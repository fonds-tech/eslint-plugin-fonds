/**
 * 规则：curly（统一花括号风格）
 *
 * 作用：在 `if/while/do-while/for/for-in/for-of` 等语句中，当任一分支需要花括号时，
 * 将所有相关分支统一使用花括号，提升一致性与可维护性。
 *
 * 修复：自动插入 `{` 与 `}`，并保持缩进与换行风格。
 */
import type { TSESTree } from '@typescript-eslint/utils'
import { createEslintRule } from '../utils'

export const RULE_NAME = 'curly'
export type MessageIds = 'missingCurlyBrackets'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'Enforce Anthony\'s style of curly bracket',
    },
    fixable: 'whitespace',
    schema: [],
    messages: {
      missingCurlyBrackets: 'Expect curly brackets',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器并应用统一花括号策略
   * @param context ESLint 规则上下文
   * @returns 监听器集合
   */
  create: (context) => {
    /**
     * 判断当前语句/表达式是否需要使用花括号
     * 规则：已是块语句、嵌套语句、跨多行表达式均需要花括号。
     */
    function requireCurly(body: TSESTree.Statement | TSESTree.Expression): boolean {
      if (!body)
        return false
      // already has curly brackets
      if (body.type === 'BlockStatement')
        return true
      // nested statements
      if (['IfStatement', 'WhileStatement', 'DoWhileStatement', 'ForStatement', 'ForInStatement', 'ForOfStatement'].includes(body.type))
        return true
      const statement = body.type === 'ExpressionStatement'
        ? body.expression
        : body
      // multiline
      if (statement.loc.start.line !== statement.loc.end.line)
        return true
      return false
    }

    /** 将目标语句包裹为块语句（若未包裹）并报告修复 */
    function wrapCurlyIfNeeded(body: TSESTree.Statement): void {
      if (body.type === 'BlockStatement')
        return
      context.report({
        node: body,
        messageId: 'missingCurlyBrackets',
        * fix(fixer) {
          yield fixer.insertTextAfter(body, '\n}')
          const token = context.sourceCode.getTokenBefore(body)
          yield fixer.insertTextAfterRange(token!.range, ' {')
        },
      })
    }

    /**
     * 对一组语句与其附加测试表达式进行一致性检查
     * 若任一项需要花括号，则统一为所有语句添加花括号。
     */
    function check(bodies: TSESTree.Statement[], additionalChecks: TSESTree.Expression[] = []): void {
      const requires = [...bodies, ...additionalChecks].map(body => requireCurly(body))

      // If any of the bodies requires curly brackets, wrap all of them to be consistent
      if (requires.some(i => i))
        bodies.map(body => wrapCurlyIfNeeded(body))
    }

    return {
      IfStatement(node) {
        const parent = node.parent
        // Already handled by the upper level if statement
        if (parent.type === 'IfStatement' && parent.alternate === node)
          return

        const statements: TSESTree.Statement[] = []
        const tests: TSESTree.Expression[] = []

        function addIf(node: TSESTree.IfStatement): void {
          statements.push(node.consequent)
          if (node.test)
            tests.push(node.test)
          if (node.alternate) {
            if (node.alternate.type === 'IfStatement')
              addIf(node.alternate)
            else
              statements.push(node.alternate)
          }
        }

        addIf(node)
        check(statements, tests)
      },
      WhileStatement(node) {
        check([node.body], [node.test])
      },
      DoWhileStatement(node) {
        check([node.body], [node.test])
      },
      ForStatement(node) {
        check([node.body])
      },
      ForInStatement(node) {
        check([node.body])
      },
      ForOfStatement(node) {
        check([node.body])
      },
    }
  },
})
