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
]

run({
  rule,
  name: RULE_NAME,
  valid: valids,
  invalid,
})
