/**
 * 测试：style-sort 规则
 * 内容：验证 CSS/SCSS/LESS 块内属性排序（长度→字母）与自定义分组的行为。
 */
import type { InvalidTestCase, ValidTestCase } from 'eslint-vitest-rule-tester'
import { unindent as $ } from 'eslint-vitest-rule-tester'
import { expect } from 'vitest'
import { run } from './_test'
import rule, { RULE_NAME } from './style-sort'

const cssParser = {
  parseForESLint(code: any) {
    const lines = code.split(/\r?\n/)
    const lastLine = lines[lines.length - 1] ?? ''
    return {
      ast: {
        type: 'Program',
        body: [],
        sourceType: 'module',
        range: [0, code.length],
        loc: {
          start: { line: 1, column: 0 },
          end: { line: lines.length, column: lastLine.length },
        },
        tokens: [],
        comments: [],
      },
      services: {},
      scopeManager: null,
      visitorKeys: {
        Program: [],
      },
    }
  },
}

const valids: ValidTestCase[] = [
  {
    filename: 'styles.css',
    code: $`
      .btn {
        color: red;
        border: none;
        padding: 12px;
      }
      
      .btn .icon {
        width: 24px;
        height: 16px;
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
  },
  {
    filename: 'component.scss',
    code: $`
      .card {
        width: 100px;
        height: 60px;
      
        &__header {
          color: #fff;
          border: 0;
        }
      }
      
      @mixin hoverable {
        opacity: 0.9;
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
      }
    `,
    options: [
      {
        groupedProperties: ['width', 'height', 'color'],
      },
    ],
    languageOptions: {
      parser: cssParser,
    },
  },
  // CSS 变量已正确排序在最前面
  {
    filename: 'variables.css',
    code: $`
      .card {
        --ds-bg: #f8f9fb;
        --ds-sub: #4b5563;
        --ds-card: #ffffff;
        width: 100%;
        display: flex;
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
  },
  // CSS 变量在 :root 中已正确排序
  {
    filename: 'theme.css',
    code: $`
      :root {
        --gap: 8px;
        --space: 16px;
        --padding: 24px;
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
  },
]

const invalid: InvalidTestCase[] = [
  {
    filename: 'button.css',
    code: $`
      .button {
        padding: 12px;
        color: red;
        border: none;
      }
      
      .text {
        letter-spacing: 1px;
        font: 500 14px/1.5 'Inter';
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
    output: output => expect(output).toMatchInlineSnapshot(`
      ".button {
        color: red;
        border: none;
        padding: 12px;
      }

      .text {
        font: 500 14px/1.5 'Inter';
        letter-spacing: 1px;
      }"
    `),
  },
  {
    filename: 'layout.less',
    code: $`
      .card {
        margin: 0;
        width: 200px;
        color: #fff;
        border: 0;
        height: 120px;
      }
      
      .card::after {
        content: '';
        display: block;
      }
    `,
    options: [
      {
        groupedProperties: ['width', 'height', 'color'],
      },
    ],
    languageOptions: {
      parser: cssParser,
    },
    output: output => expect(output).toMatchInlineSnapshot(`
      ".card {
        width: 200px;
        height: 120px;
        color: #fff;
        border: 0;
        margin: 0;
      }

      .card::after {
        content: '';
        display: block;
      }"
    `),
  },
  {
    filename: 'responsive.scss',
    code: $`
      .wrapper {
        .item {
          padding: 0;
          display: flex;
          gap: 12px;
        }
      }
      
      @media screen and (max-width: 600px) {
        .panel {
          background: #000;
          width: 40px;
          color: red;
          border-radius: 4px;
        }
      }
      
      :root {
        --space: 16px;
        --gap: 8px;
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
    output: output => expect(output).toMatchInlineSnapshot(`
      ".wrapper {
        .item {
          gap: 12px;
          display: flex;
          padding: 0;
        }
      }

      @media screen and (max-width: 600px) {
        .panel {
          color: red;
          width: 40px;
          background: #000;
          border-radius: 4px;
        }
      }

      :root {
        --gap: 8px;
        --space: 16px;
      }"
    `),
  },
  // CSS 变量应排在普通属性之前
  {
    filename: 'variables.css',
    code: $`
      .card {
        width: 100%;
        --ds-bg: #f8f9fb;
        display: flex;
        --ds-sub: #4b5563;
        --ds-card: #ffffff;
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
    output: output => expect(output).toMatchInlineSnapshot(`
      ".card {
        --ds-bg: #f8f9fb;
        --ds-sub: #4b5563;
        --ds-card: #ffffff;
        width: 100%;
        display: flex;
      }"
    `),
  },
  // CSS 变量与 groupedProperties 混合排序
  {
    filename: 'mixed.scss',
    code: $`
      .panel {
        color: red;
        --theme-primary: #007bff;
        width: 200px;
        --theme-secondary: #6c757d;
        height: 100px;
      }
    `,
    options: [
      {
        groupedProperties: ['width', 'height', 'color'],
      },
    ],
    languageOptions: {
      parser: cssParser,
    },
    output: output => expect(output).toMatchInlineSnapshot(`
      ".panel {
        width: 200px;
        height: 100px;
        color: red;
        --theme-primary: #007bff;
        --theme-secondary: #6c757d;
      }"
    `),
  },
  // 纯 CSS 变量块排序（按长度和字母序）
  {
    filename: 'vars-only.css',
    code: $`
      :root {
        --primary-color: blue;
        --gap: 8px;
        --bg: #fff;
        --spacing: 16px;
      }
    `,
    languageOptions: {
      parser: cssParser,
    },
    output: output => expect(output).toMatchInlineSnapshot(`
      ":root {
        --bg: #fff;
        --gap: 8px;
        --spacing: 16px;
        --primary-color: blue;
      }"
    `),
  },
]

run({
  rule,
  name: RULE_NAME,
  valid: valids,
  invalid,
})
