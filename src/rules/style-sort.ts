/**
 * 规则：style-sort（样式属性排序）
 *
 * 作用：按属性名长度优先、同长度字母序的方式排序 CSS/SCSS/LESS 等样式代码；
 * 同时允许通过 `groupedProperties` 将特定属性前置并保持给定顺序。
 */
import type { Container, Declaration, Document, Root } from 'postcss'
import postcss from 'postcss'
import lessSyntax from 'postcss-less'
import scssSyntax from 'postcss-scss'
import { createEslintRule } from '../utils'

export const RULE_NAME = 'style-sort'
export type MessageIds = 'styleSort' | 'styleSortDetailed'
export type Options = [
  {
    groupedProperties?: string[]
  }?,
]

interface SortEntry {
  prop: string
  text: string
  leading: string
  range: [number, number]
  orderIndex: number
  lengthScore: number
  alphaKey: string
  originalIndex: number
}

interface FixCandidate {
  range: [number, number]
  replacement: string
  mismatch?: {
    expected: SortEntry
    actual: SortEntry
  }
}

const CSS_FILE_REGEXP = /\.(?:[cps]c?ss|less)$/i

export default createEslintRule<Options, MessageIds>({
  name: RULE_NAME,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Sort CSS declarations by length/alpha order with optional custom groups',
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          groupedProperties: {
            type: 'array',
            items: {
              type: 'string',
            },
            description: 'Custom property names that should stay together in the provided order',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      styleSort: 'CSS declarations should follow the configured style-sort order',
      styleSortDetailed: 'Expected "{{expected}}" to come before "{{actual}}"',
    },
  },
  defaultOptions: [{}],
  /**
   * 构建 AST 监听器：仅在 CSS/SCSS/LESS 文件中生成排序修复
   */
  create: (context) => {
    const filename = context.getFilename()
    if (!isCssLikeFile(filename))
      return {}

    const sourceCode = context.sourceCode ?? context.getSourceCode()
    const [{ groupedProperties = [] } = {}] = context.options
    const normalizedGroups = groupedProperties
      .map(name => name.trim().toLowerCase())
      .filter(name => name.length > 0)
    const orderMap = new Map<string, number>(normalizedGroups.map((name, index) => [name, index]))

    return {
      Program() {
        const root = parseStyles(sourceCode.text)
        if (!root)
          return

        const fixes = collectFixes(root, sourceCode.text, orderMap)
        fixes.forEach((fix) => {
          const messageId: MessageIds = fix.mismatch ? 'styleSortDetailed' : 'styleSort'
          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(fix.range[0]),
              end: sourceCode.getLocFromIndex(fix.range[1]),
            },
            messageId,
            data: fix.mismatch
              ? {
                  expected: fix.mismatch.expected.prop,
                  actual: fix.mismatch.actual.prop,
                }
              : undefined,
            fix(fixer) {
              return fixer.replaceTextRange(fix.range, fix.replacement)
            },
          })
        })
      },
    }
  },
})

function isCssLikeFile(filename: string): boolean {
  if (!filename || filename === '<input>' || filename === '<text>')
    return true
  return CSS_FILE_REGEXP.test(filename)
}

function parseStyles(code: string): Root | null {
  const parsers = [
    () => scssSyntax.parse(code, { from: undefined }),
    () => lessSyntax.parse(code, { from: undefined }),
    () => postcss.parse(code, { from: undefined }),
  ]

  for (const parse of parsers) {
    try {
      const result = parse()
      return normalizeRoot(result)
    }
    catch {
      continue
    }
  }
  return null
}

function normalizeRoot(node: Root | Document): Root | null {
  if (node.type === 'document') {
    const first = node.nodes?.find(child => child.type === 'root')
    return first ?? null
  }
  return node
}

function collectFixes(root: Root, code: string, orderMap: Map<string, number>): FixCandidate[] {
  const fixes: FixCandidate[] = []

  const flushGroup = (decls: Declaration[]): void => {
    if (decls.length <= 1)
      return
    const fix = buildFix(decls, code, orderMap)
    if (fix)
      fixes.push(fix)
  }

  const visit = (container: Container | Root): void => {
    if (!('nodes' in container) || !container.nodes)
      return

    const nodes = container.nodes
    let current: Declaration[] = []

    nodes.forEach((node) => {
      if (node.type === 'decl') {
        current.push(node)
        return
      }

      flushGroup(current)
      current = []

      if ('nodes' in node && node.nodes)
        visit(node)
    })

    flushGroup(current)
  }

  visit(root)
  return fixes
}

function buildFix(decls: Declaration[], code: string, orderMap: Map<string, number>): FixCandidate | null {
  const ranges: Array<[number, number]> = []
  const entries: SortEntry[] = []

  for (const decl of decls) {
    const range = getDeclarationRange(decl, code)
    if (!range)
      return null
    ranges.push(range)
  }

  const blockStart = getGroupLeadingStart(code, ranges[0][0])
  const blockEnd = ranges[ranges.length - 1][1]
  let cursor = blockStart
  const firstLeading = code.slice(blockStart, ranges[0][0])

  decls.forEach((decl, index) => {
    const [start, end] = ranges[index]
    const leading = code.slice(cursor, start)
    const text = code.slice(start, end)
    entries.push({
      prop: decl.prop,
      text,
      leading,
      range: [start, end],
      orderIndex: getOrderIndex(decl.prop, orderMap),
      lengthScore: decl.prop.length,
      alphaKey: decl.prop.toLowerCase(),
      originalIndex: index,
    })
    cursor = end
  })

  const sorted = [...entries].sort(compareEntries)
  const stable = sorted.every((entry, index) => entry === entries[index])
  if (stable)
    return null

  const replacement = sorted.map((entry, index) => {
    const prefix = index === 0 ? firstLeading : entry.leading
    return `${prefix}${entry.text}`
  }).join('')

  const diffIndex = findFirstDifferenceIndex(entries, sorted)
  const mismatch = diffIndex >= 0
    ? {
        expected: sorted[diffIndex],
        actual: entries[diffIndex],
      }
    : undefined

  return {
    range: [blockStart, blockEnd],
    replacement,
    mismatch,
  }
}

function compareEntries(a: SortEntry, b: SortEntry): number {
  if (a.orderIndex !== b.orderIndex)
    return a.orderIndex - b.orderIndex

  const lengthDiff = a.lengthScore - b.lengthScore
  if (lengthDiff !== 0)
    return lengthDiff

  const alpha = a.alphaKey.localeCompare(b.alphaKey)
  if (alpha !== 0)
    return alpha

  return a.originalIndex - b.originalIndex
}

function getOrderIndex(prop: string, orderMap: Map<string, number>): number {
  const key = prop.toLowerCase()
  const index = orderMap.get(key)
  return index ?? Number.MAX_SAFE_INTEGER
}

function getDeclarationRange(decl: Declaration, code: string): [number, number] | null {
  const start = decl.source?.start?.offset
  let end = decl.source?.end?.offset
  if (start == null || end == null)
    return null

  while (end < code.length) {
    const char = code[end]
    if (char === ';') {
      end += 1
      break
    }
    if (char === '\n' || char === '\r')
      break
    if (!/\s/.test(char)) {
      end += 1
      continue
    }
    end += 1
  }

  return [start, end]
}

function getGroupLeadingStart(code: string, start: number): number {
  let index = start
  while (index > 0) {
    const char = code[index - 1]
    if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
      index -= 1
      continue
    }
    break
  }
  return index
}

function findFirstDifferenceIndex(original: SortEntry[], sorted: SortEntry[]): number {
  for (let i = 0; i < original.length; i += 1) {
    if (original[i] !== sorted[i])
      return i
  }
  return -1
}
