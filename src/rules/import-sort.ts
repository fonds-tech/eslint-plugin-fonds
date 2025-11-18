/**
 * 规则：import-sort（导入语句排序）
 *
 * 作用：根据 import 语句整体长度以及模块名首字母，对文件顶部的 import 块进行排序；
 * 同时支持在花括号内按相同的规则重排导入成员，长度优先、同长时按字母顺序；
 * 以上行为均可通过配置启用/禁用或切换大小写敏感。
 */
import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { builtinModules } from 'node:module'
import { createEslintRule } from '../utils'

export const RULE_NAME = 'import-sort'
export type MessageIds = 'importSort' | 'importSortDetailed'
export interface SortOption {
  enableLength?: boolean
  enableAlphabet?: boolean
  caseSensitive?: boolean
}
export type Options = [
  {
    outer?: SortOption
    inner?: SortOption
    ignoreSideEffectImports?: boolean
    typeImportHandling?: 'ignore' | 'before' | 'after'
    pathGroups?: Array<{
      pattern: string
      group: ImportPathCategory
    }>
  },
]

interface NormalizedSortOption {
  enableLength: boolean
  enableAlphabet: boolean
  caseSensitive: boolean
}

interface ImportEntry {
  node: TSESTree.ImportDeclaration
  text: string
  leadingText: string
  lengthScore: number
  alphaKey: string
  originalIndex: number
  isSortable: boolean
  category: ImportCategory
  isTypeOnly: boolean
  sourceValue: string
  pathCategory: ImportPathCategory
}

type ImportCategory = 'named' | 'default' | 'namespace' | 'side-effect'
type ImportPathCategory = 'builtin' | 'absolute' | 'parent' | 'sibling' | 'index' | 'external' | 'unknown' | 'side-effect'
interface ReorderResult {
  finalEntries: ImportEntry[]
  didReorder: boolean
  mismatch?: MismatchInfo
}

interface MismatchInfo {
  expected: ImportEntry
  actual: ImportEntry
}

interface PathGroupMatcher {
  regex: RegExp
  group: ImportPathCategory
}

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'layout',
    docs: {
      description: 'Sort import declarations and named specifiers',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          ignoreSideEffectImports: {
            type: 'boolean',
            default: true,
            description: 'Skip sorting side-effect imports like `import "./foo.css";`',
          },
          typeImportHandling: {
            type: 'string',
            enum: ['ignore', 'before', 'after'],
            default: 'before',
            description: 'Decide how `import type` declarations participate in sorting',
          },
          pathGroups: {
            type: 'array',
            description: 'Custom path grouping rules to override default path category detection',
            items: {
              type: 'object',
              properties: {
                pattern: {
                  type: 'string',
                  description: 'JavaScript RegExp pattern used to match import sources',
                },
                group: {
                  type: 'string',
                  enum: ['builtin', 'absolute', 'parent', 'sibling', 'index', 'external', 'unknown', 'side-effect'],
                },
              },
              required: ['pattern', 'group'],
              additionalProperties: false,
            },
          },
          outer: {
            type: 'object',
            properties: {
              enableLength: {
                type: 'boolean',
                default: true,
                description: 'Sort import declarations by length',
              },
              enableAlphabet: {
                type: 'boolean',
                default: true,
                description: 'Sort import declarations alphabetically when length ties',
              },
              caseSensitive: {
                type: 'boolean',
                default: true,
                description: 'Use case sensitive comparison for outer alphabetical sorting',
              },
            },
            additionalProperties: false,
          },
          inner: {
            type: 'object',
            properties: {
              enableLength: {
                type: 'boolean',
                default: true,
                description: 'Sort named imports by specifier length',
              },
              enableAlphabet: {
                type: 'boolean',
                default: true,
                description: 'Sort named imports alphabetically when length ties',
              },
              caseSensitive: {
                type: 'boolean',
                default: true,
                description: 'Use case sensitive comparison for inner alphabetical sorting',
              },
            },
            additionalProperties: false,
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      importSort: 'Imports should be ordered based on configured import-sort strategy',
      importSortDetailed: 'Expected {{expected}} ({{expectedCategory}}) to come before {{actual}} ({{actualCategory}})',
    },
  },
  defaultOptions: [
    {
      outer: {
        enableLength: true,
        enableAlphabet: true,
        caseSensitive: true,
      },
      inner: {
        enableLength: true,
        enableAlphabet: true,
        caseSensitive: true,
      },
      ignoreSideEffectImports: true,
      typeImportHandling: 'before',
      pathGroups: [],
    },
  ],
  /**
   * 构建 AST 监听器：收集顶层 import 块并根据配置生成新的排序结果
   * @param context ESLint 规则上下文
   */
  create: (context) => {
    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const option = context.options[0]
    const {
      outer,
      inner,
      ignoreSideEffectImports = true,
      typeImportHandling = 'before',
      pathGroups = [],
    } = option ?? {}

    const outerConfig = normalizeSortOption(outer)
    const innerConfig = normalizeSortOption(inner)
    const eol = sourceCode.text.includes('\r\n') ? '\r\n' : '\n'
    const pathGroupMatchers = createPathGroupMatchers(pathGroups)

    return {
      Program(program) {
        // 仅处理位于文件起始处的连续 import 声明块
        const importNodes = collectTopImportDeclarations(program)
        if (importNodes.length === 0)
          return

        // 构建排序条目，并检查命名导入是否需要内部排序
        const { entries, hasInnerChange } = buildEntries(
          importNodes,
          sourceCode,
          innerConfig,
          ignoreSideEffectImports,
          pathGroupMatchers,
        )
        if (entries.length <= 1 && !hasInnerChange)
          return

        // 根据配置重排 import 块，若最终顺序与原始相同且内部也无需调整则跳过报告
        const { finalEntries, didReorder, mismatch } = reorderEntries(entries, outerConfig, typeImportHandling)
        if (!didReorder && !hasInnerChange)
          return

        const blockStart = importNodes[0].range[0]
        const blockEnd = importNodes[importNodes.length - 1].range[1]
        const replacement = rebuildBlock(finalEntries, eol)
        // 若存在首个冲突，则输出详细错误信息以指明具体导入
        const messageId: MessageIds = mismatch ? 'importSortDetailed' : 'importSort'
        const data = mismatch
          ? {
              expected: mismatch.expected.sourceValue,
              expectedCategory: getImportPathLabel(mismatch.expected),
              actual: mismatch.actual.sourceValue,
              actualCategory: getImportPathLabel(mismatch.actual),
            }
          : undefined

        context.report({
          node: importNodes[0],
          loc: {
            start: sourceCode.getLocFromIndex(blockStart),
            end: sourceCode.getLocFromIndex(blockEnd),
          },
          messageId,
          data,
          fix(fixer) {
            return fixer.replaceTextRange([blockStart, blockEnd], replacement)
          },
        })
      },
    }
  },
})

/**
 * 收集文件顶部连续的 import 声明
 * @description 跳过 `'use strict'` 等指令，遇到首个非 import 语句立即停止
 */
function collectTopImportDeclarations(program: TSESTree.Program): TSESTree.ImportDeclaration[] {
  const imports: TSESTree.ImportDeclaration[] = []
  const body = program.body
  let index = 0

  // 跳过 "use strict" 等指令语句
  while (index < body.length) {
    const statement = body[index]
    if (isDirective(statement)) {
      index += 1
      continue
    }
    if (statement.type === 'ImportDeclaration')
      break
    return imports
  }

  // 自首个 import 起连续收集，遇到其他语句立即停止
  while (index < body.length) {
    const statement = body[index]
    if (statement.type !== 'ImportDeclaration')
      break
    imports.push(statement)
    index += 1
  }

  return imports
}

function isDirective(statement: TSESTree.Statement): statement is TSESTree.ExpressionStatement & { directive: string } {
  return statement.type === 'ExpressionStatement' && typeof statement.directive === 'string'
}

/**
 * 构建排序用的 ImportEntry 数组
 * @description 同时判断命名导入是否需要重新排序，收集 leading 文本以便重建
 */
function buildEntries(
  nodes: TSESTree.ImportDeclaration[],
  sourceCode: TSESLint.SourceCode,
  innerConfig: NormalizedSortOption,
  ignoreSideEffectImports: boolean,
  pathGroupMatchers: PathGroupMatcher[],
): { entries: ImportEntry[], hasInnerChange: boolean } {
  const entries: ImportEntry[] = []
  let hasInnerChange = false
  let previousEnd = nodes[0].range[0]

  nodes.forEach((node, index) => {
    // 记录 import 前方的空白/注释，以便重建时保留
    const leadingText = sourceCode.text.slice(previousEnd, node.range[0])
    const { text, changed } = normalizeImportText(node, sourceCode, innerConfig)
    if (changed)
      hasInnerChange = true

    // 锁定 import 源字符串，供路径分类与提示信息复用
    const sourceValue = getImportSourceValue(node, sourceCode)

    entries.push({
      node,
      text,
      leadingText,
      lengthScore: getImportLengthScore(node, sourceCode),
      alphaKey: getImportAlphaKey(node, sourceCode),
      originalIndex: index,
      isSortable: !(ignoreSideEffectImports && isSideEffectImport(node)),
      category: getImportCategory(node),
      isTypeOnly: isTypeOnlyImport(node),
      sourceValue,
      pathCategory: classifyPathCategory(node, sourceValue, pathGroupMatchers),
    })

    previousEnd = node.range[1]
  })

  return { entries, hasInnerChange }
}

/**
 * 根据配置重新排序 import，并返回修复结果
 * @description 同时记录第一处顺序冲突，便于输出详细报错
 */
function reorderEntries(
  entries: ImportEntry[],
  outerConfig: NormalizedSortOption,
  typeImportHandling: 'ignore' | 'before' | 'after',
): ReorderResult {
  const finalEntries: ImportEntry[] = []
  let didReorder = false
  let buffer: ImportEntry[] = []
  let mismatch: MismatchInfo | null = null

  const flush = (): void => {
    if (buffer.length === 0)
      return
    // 将当前连续可排序的片段排序并推入结果
    const sorted = sortSegment(buffer, outerConfig, typeImportHandling)
    if (!didReorder && !areSameOrder(buffer, sorted))
      didReorder = true
    if (!mismatch) {
      const diffIndex = findFirstDifferenceIndex(buffer, sorted)
      if (diffIndex !== -1)
        mismatch = { expected: sorted[diffIndex], actual: buffer[diffIndex] }
    }
    finalEntries.push(...sorted)
    buffer = []
  }

  entries.forEach((entry) => {
    if (!entry.isSortable) {
      flush()
      finalEntries.push(entry)
      return
    }
    buffer.push(entry)
  })

  flush()
  return {
    finalEntries,
    didReorder,
    mismatch: mismatch ?? undefined,
  }
}

/**
 * 对同一段 import 进行排序
 * @description 路径类别 > 类型导入优先级 > 长度/字母 → 最终顺序
 */
function sortSegment(
  segment: ImportEntry[],
  config: NormalizedSortOption,
  typeImportHandling: 'ignore' | 'before' | 'after',
): ImportEntry[] {
  return [...segment].sort((a, b) => compareSegmentEntries(a, b, config, typeImportHandling))
}

function compareSegmentEntries(
  a: ImportEntry,
  b: ImportEntry,
  config: NormalizedSortOption,
  typeHandling: 'ignore' | 'before' | 'after',
): number {
  // 首先根据 import 路径类别（含 type-only 配置）排序
  const pathPriority = getAdjustedPathPriority(a, typeHandling) - getAdjustedPathPriority(b, typeHandling)
  if (pathPriority !== 0)
    return pathPriority

  const categoryPriority = getCategoryPriority(a.category) - getCategoryPriority(b.category)
  if (categoryPriority !== 0)
    return categoryPriority

  return compareEntries(a, b, config)
}

/**
 * 处理长度与字母比较的公共逻辑
 */
function compareEntries(a: ImportEntry, b: ImportEntry, config: NormalizedSortOption): number {
  if (config.enableLength) {
    const diff = a.lengthScore - b.lengthScore
    if (diff !== 0)
      return diff
  }

  if (config.enableAlphabet) {
    const diff = compareStrings(a.alphaKey, b.alphaKey, config.caseSensitive)
    if (diff !== 0)
      return diff
  }

  return a.originalIndex - b.originalIndex
}

/**
 * 对命名导入 `{ ... }` 内部执行排序并返回新文本
 */
function normalizeImportText(
  node: TSESTree.ImportDeclaration,
  sourceCode: TSESLint.SourceCode,
  innerConfig: NormalizedSortOption,
): { text: string, changed: boolean } {
  const namedSpecifiers = node.specifiers.filter((spec): spec is TSESTree.ImportSpecifier => spec.type === 'ImportSpecifier')
  if (namedSpecifiers.length <= 1)
    return { text: sourceCode.getText(node), changed: false }

  if (!innerConfig.enableLength && !innerConfig.enableAlphabet)
    return { text: sourceCode.getText(node), changed: false }

  const sorted = sortImportSpecifiers(namedSpecifiers, sourceCode, innerConfig)
  const changed = sorted.some((spec, idx) => spec !== namedSpecifiers[idx])
  if (!changed)
    return { text: sourceCode.getText(node), changed: false }

  const rewritten = rewriteNamedSpecifiers(node, sorted, sourceCode)
  return { text: rewritten, changed: true }
}

function sortImportSpecifiers(
  specifiers: TSESTree.ImportSpecifier[],
  sourceCode: TSESLint.SourceCode,
  config: NormalizedSortOption,
): TSESTree.ImportSpecifier[] {
  return [...specifiers].sort((a, b) => {
    if (config.enableLength) {
      const diff = getSpecifierLength(a, sourceCode) - getSpecifierLength(b, sourceCode)
      if (diff !== 0)
        return diff
    }

    if (config.enableAlphabet) {
      const diff = compareStrings(getSpecifierName(a), getSpecifierName(b), config.caseSensitive)
      if (diff !== 0)
        return diff
    }

    return specifiers.indexOf(a) - specifiers.indexOf(b)
  })
}

function rewriteNamedSpecifiers(
  node: TSESTree.ImportDeclaration,
  sorted: TSESTree.ImportSpecifier[],
  sourceCode: TSESLint.SourceCode,
): string {
  const originalNamed = node.specifiers.filter((spec): spec is TSESTree.ImportSpecifier => spec.type === 'ImportSpecifier')
  const first = originalNamed[0]
  const last = originalNamed[originalNamed.length - 1]
  if (!first || !last)
    return sourceCode.getText(node)

  const leftBrace = sourceCode.getTokenBefore(first, token => token.value === '{')
  const rightBrace = sourceCode.getTokenAfter(last, token => token.value === '}')
  if (!leftBrace || !rightBrace)
    return sourceCode.getText(node)

  const before = sourceCode.text.slice(node.range[0], leftBrace.range[1])
  const after = sourceCode.text.slice(rightBrace.range[0], node.range[1])
  const inner = sourceCode.text.slice(leftBrace.range[1], rightBrace.range[0])
  const replacement = buildSpecifierBlock(inner, sorted, sourceCode)

  return `${before}${replacement}${after}`
}

function buildSpecifierBlock(
  existingInner: string,
  sorted: TSESTree.ImportSpecifier[],
  sourceCode: TSESLint.SourceCode,
): string {
  const specTexts = sorted.map(spec => sourceCode.getText(spec).trim())
  if (specTexts.length === 0)
    return existingInner

  const hasLineBreak = existingInner.includes('\n') || existingInner.includes('\r')
  const trimmed = existingInner.replace(/\s+$/, '')
  const hasTrailingComma = trimmed.endsWith(',')

  if (!hasLineBreak) {
    const leading = existingInner.match(/^\s*/)?.[0] ?? ' '
    const trailing = existingInner.match(/\s*$/)?.[0] ?? ' '
    const body = specTexts.join(', ')
    return `${leading}${body}${hasTrailingComma ? ',' : ''}${trailing}`
  }

  const eol = existingInner.includes('\r\n') ? '\r\n' : '\n'
  const indentMatch = existingInner.match(/\n([ \t]*)\S/)
  const indent = indentMatch ? indentMatch[1] : '  '
  const closingIndentMatch = existingInner.match(/\n([ \t]*)$/)
  const closingIndent = closingIndentMatch ? closingIndentMatch[1] : ''
  const lines = specTexts.map(text => `${indent}${text}`).join(`,${eol}`)
  let inner = `${eol}${lines}`
  if (hasTrailingComma)
    inner += ','
  inner += `${eol}${closingIndent}`
  return inner
}

/**
 * 根据排序后的 ImportEntry 重建 import 区块
 */
function rebuildBlock(entries: ImportEntry[], eol: string): string {
  return entries.map((entry, index) => {
    let prefix = entry.leadingText
    if (index === 0) {
      prefix = prefix.replace(/^\s+/, '')
    }
    else if (prefix.trim() === '') {
      prefix = prefix.includes('\n') || prefix.includes('\r') ? prefix : eol
    }
    return `${prefix}${entry.text}`
  }).join('')
}

function getImportLengthScore(node: TSESTree.ImportDeclaration, sourceCode: TSESLint.SourceCode): number {
  const importToken = sourceCode.getFirstToken(node)
  const tokenBeforeSource = sourceCode.getTokenBefore(node.source)
  if (importToken && tokenBeforeSource)
    return tokenBeforeSource.range[1] - importToken.range[0]
  return sourceCode.getText(node).length
}

function getImportAlphaKey(node: TSESTree.ImportDeclaration, sourceCode: TSESLint.SourceCode): string {
  return typeof node.source.value === 'string'
    ? node.source.value
    : sourceCode.getText(node.source)
}

function getSpecifierLength(spec: TSESTree.ImportSpecifier, sourceCode: TSESLint.SourceCode): number {
  return sourceCode.getText(spec).replace(/\s+/g, '').length
}

function getSpecifierName(spec: TSESTree.ImportSpecifier): string {
  if (spec.imported.type === 'Identifier')
    return spec.imported.name
  return String(spec.imported.value)
}

function compareStrings(a: string, b: string, caseSensitive: boolean): number {
  const left = caseSensitive ? a : a.toLowerCase()
  const right = caseSensitive ? b : b.toLowerCase()
  if (left < right)
    return -1
  if (left > right)
    return 1
  return 0
}

/**
 * 合并用户配置与默认值
 */
function normalizeSortOption(option?: SortOption): NormalizedSortOption {
  return {
    enableLength: option?.enableLength ?? true,
    enableAlphabet: option?.enableAlphabet ?? true,
    caseSensitive: option?.caseSensitive ?? true,
  }
}

function isSideEffectImport(node: TSESTree.ImportDeclaration): boolean {
  return node.specifiers.length === 0
}

function getImportCategory(node: TSESTree.ImportDeclaration): ImportCategory {
  if (isSideEffectImport(node))
    return 'side-effect'

  const hasNamed = node.specifiers.some(spec => spec.type === 'ImportSpecifier')
  if (hasNamed)
    return 'named'

  const hasDefault = node.specifiers.some(spec => spec.type === 'ImportDefaultSpecifier')
  if (hasDefault)
    return 'default'

  return 'namespace'
}

/**
 * 计算路径类别优先级，结合 typeImportHandling 调整类型导入位置
 */
function getAdjustedPathPriority(entry: ImportEntry, handling: 'before' | 'after' | 'ignore'): number {
  const base = getPathPriority(entry.pathCategory)
  if (!entry.isTypeOnly || handling === 'ignore')
    return base

  const offset = handling === 'before' ? -10 : 10
  return base + offset
}

/**
 * 路径类别优先级，数值越小越靠前
 */
function getPathPriority(category: ImportPathCategory): number {
  switch (category) {
    case 'builtin':
      return 0
    case 'absolute':
      return 1
    case 'parent':
      return 2
    case 'sibling':
      return 3
    case 'index':
      return 4
    case 'external':
      return 5
    case 'side-effect':
      return 6
    case 'unknown':
    default:
      return 7
  }
}

/**
 * type/默认/namespace 等 import 类型的优先级
 */
function getCategoryPriority(category: ImportCategory): number {
  switch (category) {
    case 'named':
      return 0
    case 'default':
      return 1
    case 'namespace':
      return 2
    case 'side-effect':
      return 3
    default:
      return 4
  }
}

function areSameOrder(a: ImportEntry[], b: ImportEntry[]): boolean {
  return a.length === b.length && a.every((entry, index) => entry === b[index])
}

function findFirstDifferenceIndex(original: ImportEntry[], sorted: ImportEntry[]): number {
  for (let i = 0; i < original.length; i += 1) {
    if (original[i] !== sorted[i])
      return i
  }
  return -1
}

function getImportSourceValue(node: TSESTree.ImportDeclaration, sourceCode: TSESLint.SourceCode): string {
  if (typeof node.source.value === 'string')
    return node.source.value
  return sourceCode.getText(node.source)
}

function getImportPathLabel(entry: ImportEntry): string {
  const label = entry.pathCategory === 'side-effect' ? 'side-effect' : entry.pathCategory
  return entry.isTypeOnly && entry.pathCategory !== 'side-effect'
    ? `${label}-type`
    : label
}

/**
 * 依据自定义 pathGroups 与默认规则判断 import 路径类别
 */
function classifyPathCategory(
  node: TSESTree.ImportDeclaration,
  value: string,
  matchers: PathGroupMatcher[],
): ImportPathCategory {
  if (node.specifiers.length === 0)
    return 'side-effect'

  if (!value)
    return 'unknown'

  for (const matcher of matchers) {
    if (matcher.regex.test(value))
      return matcher.group
  }

  if (value === '.' || value === './')
    return 'index'

  if (value.startsWith('../'))
    return 'parent'

  if (value.startsWith('./'))
    return 'sibling'

  if (value.startsWith('/'))
    return 'absolute'

  if (value.startsWith('node:'))
    return 'builtin'

  const normalized = value.split('/')[0]
  if (builtinModules.includes(value) || builtinModules.includes(normalized))
    return 'builtin'

  return 'external'
}

/**
 * 将配置的 pathGroups 编译成正则匹配器
 */
function createPathGroupMatchers(groups: Options[0]['pathGroups'] = []): PathGroupMatcher[] {
  const matchers: PathGroupMatcher[] = []
  groups?.forEach((group) => {
    if (!group)
      return
    try {
      matchers.push({
        regex: new RegExp(group.pattern),
        group: group.group,
      })
    }
    catch {
      // ignore invalid regex
    }
  })
  return matchers
}

/**
 * 判断当前 import 是否仅导入类型
 */
function isTypeOnlyImport(node: TSESTree.ImportDeclaration): boolean {
  if (node.importKind === 'type')
    return true
  if (node.importKind === 'value')
    return false
  if (node.specifiers.length === 0)
    return false
  return node.specifiers.every(spec => spec.type === 'ImportSpecifier' && spec.importKind === 'type')
}
