/**
 * 工具方法：规则创建与一次性告警
 *
 * 作用：封装 `@typescript-eslint/utils` 的规则创建流程，统一默认配置与文档链接生成；
 * 同时提供一次性告警工具，避免重复输出。
 *
 * 注意：仅添加注释，不影响逻辑；保留原英文 JSDoc 以便双语阅读。
 */
import type { RuleListener, RuleWithMeta, RuleWithMetaAndName } from '@typescript-eslint/utils/eslint-utils'
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import type { Rule } from 'eslint'

// @keep-sorted
const hasDocs = [
  'consistent-chaining',
  'consistent-list-newline',
  'curly',
  'if-newline',
  'import-dedupe',
  'import-sort',
  'indent-unindent',
  'top-level-function',
]

const blobUrl = 'https://github.com/fonds-tech/eslint-plugin-fonds/blob/main/src/rules/'

export type RuleModule<
  T extends readonly unknown[],
> = Rule.RuleModule & {
  defaultOptions: T
}

/**
 * Creates reusable function to create rules with default options and docs URLs.
 *
 * @param urlCreator Creates a documentation URL for a given rule name.
 * @returns Function to create a rule with the docs URL format.
 */
/**
 * 生成规则创建器（中文说明）
 * 根据规则名生成文档 URL，并与默认 `meta.docs` 合并，返回带默认配置的规则模块。
 */
function RuleCreator(urlCreator: (name: string) => string) {
  // This function will get much easier to call when this is merged https://github.com/Microsoft/TypeScript/pull/26349
  // TODO - when the above PR lands; add type checking for the context.report `data` property
  return function createNamedRule<
    TOptions extends readonly unknown[],
    TMessageIds extends string,
  >({
    name,
    meta,
    ...rule
  }: Readonly<RuleWithMetaAndName<TOptions, TMessageIds>>): RuleModule<TOptions> {
    return createRule<TOptions, TMessageIds>({
      meta: {
        ...meta,
        docs: {
          ...meta.docs,
          url: urlCreator(name),
        },
      },
      ...rule,
    })
  }
}

/**
 * Creates a well-typed TSESLint custom ESLint rule without a docs URL.
 *
 * @returns Well-typed TSESLint custom ESLint rule.
 * @remarks It is generally better to provide a docs URL function to RuleCreator.
 */
/**
 * 创建规则（中文说明）
 * 将 `defaultOptions` 与用户传入的 `context.options` 逐项合并，再调用业务 `create` 返回监听器。
 */
function createRule<
  TOptions extends readonly unknown[],
  TMessageIds extends string,
>({
  create,
  defaultOptions,
  meta,
}: Readonly<RuleWithMeta<TOptions, TMessageIds>>): RuleModule<TOptions> {
  return {
    create: ((
      context: Readonly<RuleContext<TMessageIds, TOptions>>,
    ): RuleListener => {
      const optionsWithDefault = context.options.map((options, index) => {
        return {
          ...defaultOptions[index] || {},
          ...options || {},
        }
      }) as unknown as TOptions
      return create(context, optionsWithDefault)
    }) as any,
    defaultOptions,
    meta: meta as any,
  }
}

export const createEslintRule = RuleCreator(
  ruleName => hasDocs.includes(ruleName)
    ? `${blobUrl}${ruleName}.md`
    : `${blobUrl}${ruleName}.test.ts`,
) as any as <TOptions extends readonly unknown[], TMessageIds extends string>({ name, meta, ...rule }: Readonly<RuleWithMetaAndName<TOptions, TMessageIds>>) => RuleModule<TOptions>

const warned = new Set<string>()

/**
 * 一次性告警（中文说明）
 * 目的：仅在首次触发时输出告警消息，避免重复噪音。
 */
export function warnOnce(message: string): void {
  if (warned.has(message))
    return
  warned.add(message)
  console.warn(message)
}
