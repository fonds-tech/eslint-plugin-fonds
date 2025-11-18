/**
 * 规则：no-import-dist（禁止导入 dist 目录）
 * 作用：避免从构建产物目录 `dist` 导入模块，防止循环依赖或非源代码依赖。
 */
import { createEslintRule } from '../utils'

export const RULE_NAME = 'no-import-dist'
export type MessageIds = 'noImportDist'
export type Options = []

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent importing modules in `dist` folder',
    },
    schema: [],
    messages: {
      noImportDist: 'Do not import modules in `dist` folder, got {{path}}',
    },
  },
  defaultOptions: [],
  /**
   * 构建 AST 监听器，检测 `ImportDeclaration` 的来源路径是否位于 `dist`
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    function isDist(path: string): boolean {
      // 支持相对路径 ./dist/foo、../dist 以及裸 `dist` 模块名
      return Boolean((path.startsWith('.') && path.match(/\/dist(\/|$)/)))
        || path === 'dist'
    }

    return {
      ImportDeclaration: (node) => {
        // 直接根据字面值判断是否落在 dist 子目录
        if (isDist(node.source.value)) {
          context.report({
            node,
            messageId: 'noImportDist',
            data: {
              path: node.source.value,
            },
          })
        }
      },
    }
  },
})
