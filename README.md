# eslint-plugin-fonds

<div align="left">
<a href="README.md">English</a> | <b>简体中文</b>
<br>
</div>

`eslint-plugin-fonds` 面向采用 Flat Config (ESLint v9+) 的 TypeScript/JavaScript 项目，集中提供 Fonds 风格的链式调用、列表换行、模板缩进与模块边界等 ESLint 规则。

## 主要特性

- **链式调用统一**：`fonds/consistent-chaining` 让整条链遵循首个调用的换行风格。
- **列表布局管控**：`fonds/consistent-list-newline` 同时覆盖数组、对象、导入导出、JSX 属性与 TS 类型节点。
- **模板缩进守护**：`fonds/indent-unindent` 让 `unindent` / `$` 模板字符串缩进可预测且不影响运行时输出。
- **模块安全网**：`fonds/no-import-dist`、`fonds/no-import-node-modules-by-path`、`fonds/no-top-level-await`、`fonds/no-ts-export-equal` 等规则阻断常见危险写法。
- **广泛自动修复**：大部分格式类规则都自带 fixer，减少手动重构的成本。

## 安装

将 ESLint 与插件一同安装到开发依赖（任选包管理器）：

```bash
pnpm add -D eslint eslint-plugin-fonds
npm install -D eslint eslint-plugin-fonds
yarn add -D eslint eslint-plugin-fonds
```

## 快速上手

在 `eslint.config.js` 中注册插件并启用需要的规则：

```js
// eslint.config.js
import fonds from 'eslint-plugin-fonds'

export default [
  {
    files: ['src/**/*.{ts,tsx,js,jsx}'],
    plugins: {
      fonds,
    },
    rules: {
      'fonds/consistent-chaining': 'error',
      'fonds/consistent-list-newline': 'warn',
      'fonds/indent-unindent': 'error',
      'fonds/top-level-function': 'error',
    },
  },
  {
    files: ['examples/**/*.{ts,tsx,js,jsx}'],
    plugins: { fonds },
    rules: {
      'fonds/consistent-chaining': 'off',
      'fonds/consistent-list-newline': 'off',
    },
  },
]
```

- 按 `files` 维度拆分配置，可针对示例、脚本、测试放宽限制。
- 也可以把本插件与 `@fonds/eslint-config` 等 Flat Config 组合器一起使用。

## 规则速览

| 规则                                   | 作用                                                                       | 可自动修复 | 关键选项                                   |
| -------------------------------------- | -------------------------------------------------------------------------- | ---------- | ------------------------------------------ |
| `fonds/consistent-chaining`            | 令同一条属性/方法链统一使用单行或多行写法，风格由首个访问点决定。          | 是         | `allowLeadingPropertyAccess` (默认 `true`) |
| `fonds/consistent-list-newline`        | 统一数组、对象、导入导出、JSX 属性、TS 类型等结构的换行风格。              | 是         | 按节点类型传 `true/false` 以启用或关闭     |
| `fonds/curly`                          | Anthony Fu 的 `curly` 偏好：多行或嵌套语句必须加花括号，单行语句可以省略。 | 是         | 无                                         |
| `fonds/if-newline`                     | 行内 `if` 必须将执行体放在下一行。                                         | 是         | 无                                         |
| `fonds/import-dedupe`                  | 自动去重同一 import 语句中的重复绑定。                                     | 是         | 无                                         |
| `fonds/indent-unindent`                | 规范 `unindent` / `$` 模板字符串的缩进，不影响运行时输出。                 | 是         | `indent` (数字)、`tags` (字符串数组)       |
| `fonds/no-import-dist`                 | 禁止从 `dist` 目录导入。                                                   | 否         | 无                                         |
| `fonds/no-import-node-modules-by-path` | 禁止通过包含 `node_modules` 的路径进行 import/require。                    | 否         | 无                                         |
| `fonds/no-top-level-await`             | 阻止在函数外部直接使用 `await`。                                           | 否         | 无                                         |
| `fonds/no-ts-export-equal`             | 阻止 TypeScript 文件中的 `export =`，统一使用 ESM `export default`。       | 否         | 无                                         |
| `fonds/top-level-function`             | 将导出的顶层箭头/函数字面量转换为 `function` 声明，便于提升与调试。        | 是         | 无                                         |

每条规则的完整示例与解释可在 `src/rules/<rule>.md` 中找到。

## 进阶配置

根据项目需要调整选项：

```js
export default [{
  plugins: { fonds },
  rules: {
    'fonds/indent-unindent': ['error', {
      indent: 4,
      tags: ['$', 'unindent', 'styled'],
    }],
    'fonds/consistent-list-newline': ['warn', {
      ObjectExpression: true,
      ArrayExpression: true,
      ImportDeclaration: false,
      JSXOpeningElement: false,
    }],
    'fonds/consistent-chaining': ['error', {
      allowLeadingPropertyAccess: true,
    }],
  },
}]
```

- `indent-unindent` 的 `indent` 控制缩进宽度，`tags` 指定需要检查的模板标签。
- `consistent-list-newline` 通过布尔值决定是否处理某个 AST 节点类型。
- 其他规则默认无选项，如需更多定制可 fork 对应规则文件。

## 本地开发

- `pnpm install`：安装依赖。
- `pnpm dev`：运行 `unbuild --stub`，实时监听构建。
- `pnpm lint`：构建 stub 后使用 ESLint 自检源码。
- `pnpm test`：执行 Vitest，覆盖规则测试。
- `pnpm build`：产出 `dist/` 发布文件。

贡献说明请阅读 [CONTRIBUTING.md](./CONTRIBUTING.md)，该文件会跳转到 Fonds 的统一贡献指南。

## 致谢

本项目基于 [eslint-plugin-antfu](https://github.com/antfu/eslint-plugin-antfu) 的优秀实践，并在此基础上进行了定制化扩展，特此致谢。

## 许可证与维护者

- 许可证：[MIT](./LICENSE)
- 维护者：[fonds-tech](https://github.com/fonds-tech)
