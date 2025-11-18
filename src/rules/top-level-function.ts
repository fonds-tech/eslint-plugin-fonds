/**
 * 规则：top-level-function（顶层函数应使用 function 声明）
 * 作用：禁止以 `const fn = () => {}` 等赋值方式在顶层声明函数，统一使用 `function` 关键字。
 */
import { createEslintRule } from '../utils'

export const RULE_NAME = 'top-level-function'
export type MessageIds = 'topLevelFunctionDeclaration'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce top-level functions to be declared with function keyword',
    },
    fixable: 'code',
    schema: [],
    messages: {
      topLevelFunctionDeclaration: 'Top-level functions should be declared with function keyword',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，定位顶层 `VariableDeclaration` 并转换为 `function` 声明
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    return {
      VariableDeclaration(node) {
        if (node.parent.type !== 'Program' && node.parent.type !== 'ExportNamedDeclaration')
          return

        // 只处理 const 单变量声明，避免同时改动多个声明
        if (node.declarations.length !== 1)
          return
        if (node.kind !== 'const')
          return
        if (node.declare)
          return

        const declaration = node.declarations[0]

        // 仅当初始化为函数（箭头或函数表达式）时才需转换
        if (
          declaration.init?.type !== 'ArrowFunctionExpression'
          && declaration.init?.type !== 'FunctionExpression'
        ) {
          return
        }
        if (declaration.id?.type !== 'Identifier')
          return
        if (declaration.id.typeAnnotation)
          return
        if (
          declaration.init.body.type !== 'BlockStatement'
          && declaration.id?.loc.start.line === declaration.init?.body.loc.end.line
        ) {
          return
        }

        const fnExpression = declaration.init
        const body = declaration.init.body
        const id = declaration.id

        context.report({
          node,
          loc: {
            start: id.loc.start,
            end: body.loc.start,
          },
          messageId: 'topLevelFunctionDeclaration',
          fix(fixer) {
            const code = context.getSourceCode().text
            const textName = code.slice(id.range[0], id.range[1])
            const textArgs = fnExpression.params.length
              ? code.slice(fnExpression.params[0].range[0], fnExpression.params[fnExpression.params.length - 1].range[1])
              : ''
            // 若函数体为表达式，需要包裹成块并 return 出去
            const textBody = body.type === 'BlockStatement'
              ? code.slice(body.range[0], body.range[1])
              : `{\n  return ${code.slice(body.range[0], body.range[1])}\n}`
            const textGeneric = fnExpression.typeParameters
              ? code.slice(fnExpression.typeParameters.range[0], fnExpression.typeParameters.range[1])
              : ''
            const textTypeReturn = fnExpression.returnType
              ? code.slice(fnExpression.returnType.range[0], fnExpression.returnType.range[1])
              : ''
            const textAsync = fnExpression.async ? 'async ' : ''

            // 最终将 const 声明替换为 function 声明
            const final = `${textAsync}function ${textName} ${textGeneric}(${textArgs})${textTypeReturn} ${textBody}`
            // console.log({
            //   input: code.slice(node.range[0], node.range[1]),
            //   output: final,
            // })
            return fixer.replaceTextRange([node.range[0], node.range[1]], final)
          },
        })
      },
    }
  },
})
