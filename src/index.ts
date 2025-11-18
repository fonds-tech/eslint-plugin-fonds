/**
 * ESLint 插件入口
 *
 * 作用：聚合并导出所有规则，提供插件元信息（名称与版本）。
 * 规则映射：键为规则名，值为规则实现，供 ESLint 在配置中引用。
 * 类型：提供 `RuleOptions` 与 `Rules` 类型以便在项目中获得更好提示与类型安全。
 */
import type { ESLint, Linter } from 'eslint'
import { version } from '../package.json'
import consistentChaining from './rules/consistent-chaining'
import consistentListNewline from './rules/consistent-list-newline'
import curly from './rules/curly'
import ifNewline from './rules/if-newline'
import importDedupe from './rules/import-dedupe'
import importSort from './rules/import-sort'
import indentUnindent from './rules/indent-unindent'
import noImportDist from './rules/no-import-dist'
import noImportNodeModulesByPath from './rules/no-import-node-modules-by-path'
import noTopLevelAwait from './rules/no-top-level-await'
import noTsExportEqual from './rules/no-ts-export-equal'
import topLevelFunction from './rules/top-level-function'

const plugin = {
  meta: {
    name: 'fonds',
    version,
  },
  // @keep-sorted
  rules: {
    'consistent-chaining': consistentChaining,
    'consistent-list-newline': consistentListNewline,
    'curly': curly,
    'if-newline': ifNewline,
    'import-dedupe': importDedupe,
    'import-sort': importSort,
    'indent-unindent': indentUnindent,
    'no-import-dist': noImportDist,
    'no-import-node-modules-by-path': noImportNodeModulesByPath,
    'no-top-level-await': noTopLevelAwait,
    'no-ts-export-equal': noTsExportEqual,
    'top-level-function': topLevelFunction,
  },
} satisfies ESLint.Plugin

export default plugin

type RuleDefinitions = typeof plugin['rules']

export type RuleOptions = {
  [K in keyof RuleDefinitions]: RuleDefinitions[K]['defaultOptions']
}

export type Rules = {
  [K in keyof RuleOptions]: Linter.RuleEntry<RuleOptions[K]>
}
