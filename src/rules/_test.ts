/**
 * 测试运行辅助：统一以 TS 解析器运行规则用例
 * 作用：封装 `eslint-vitest-rule-tester` 的 `run` 方法，指定 `@typescript-eslint/parser`。
 */
import type { RuleTesterInitOptions, TestCasesOptions } from 'eslint-vitest-rule-tester'
import tsParser from '@typescript-eslint/parser'
import { run as _run } from 'eslint-vitest-rule-tester'

export function run(options: TestCasesOptions & RuleTesterInitOptions): void {
  _run({
    parser: tsParser as any,
    ...options,
  })
}
