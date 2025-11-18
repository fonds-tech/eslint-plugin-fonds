# import-sort

> 根据 import 语句整体长度与模块首字母排序，命名导入同样遵循“长度优先、同长按字母”规则，可通过配置自由组合。

## 规则说明

- 仅读取文件顶部的连续 import 语句，遇到第一个非 import 语句即停止；
- 默认忽略副作用 import（如 `import './polyfill'`），可通过配置让其参与排序；
- 外层 import 会按 `长度 → 字母（可选）→ 原顺序` 排列，命名导入亦遵循相同策略；
- `default` 与 `namespace` 导入保持原始位置，仅重排 `{ ... }` 中的命名导入；
- 所有行为均可通过 `outer`、`inner`、`ignoreSideEffectImports` 配置启停。

## 选项

```ts
interface SortOption {
  enableLength?: boolean
  enableAlphabet?: boolean
  caseSensitive?: boolean
}

type Options = [{
  outer?: SortOption
  inner?: SortOption
  ignoreSideEffectImports?: boolean
}]
```

默认值：

```jsonc
[
  {
    "outer": { "enableLength": true, "enableAlphabet": true, "caseSensitive": true },
    "inner": { "enableLength": true, "enableAlphabet": true, "caseSensitive": true },
    "ignoreSideEffectImports": true
  }
]
```

- `outer`：控制整条 import 语句的排序方式；
- `inner`：控制 `{ ... }` 中命名导入的排序方式；
- `ignoreSideEffectImports`：是否跳过副作用 import。

## 示例

### 默认行为

#### ❌ Before
<!-- eslint-skip-block -->
```ts
/* eslint-disable perfectionist/sort-imports, perfectionist/sort-named-imports */
import { foo } from 'ab'
import {
  gamma,
  alpha,
} from 'module-two'
import { bar } from 'aa'
```

#### ✅ After

```ts
import { bar } from 'aa'
import { foo } from 'ab'
import {
  alpha,
  gamma,
} from 'module-two'
```

### 只排序命名导入

#### ESLint 配置

```jsonc
{
  "fonds/import-sort": ["warn", { "outer": { "enableLength": false, "enableAlphabet": false } }]
}
```

#### ❌ Before
<!-- eslint-skip-block -->
```ts
/* eslint-disable perfectionist/sort-named-imports */
import foo, {
  Zebra as Z,
  alpha,
  delta as D,
} from 'foo-kit'
```

#### ✅ After

```ts
import foo, {
  alpha,
  delta as D,
  Zebra as Z,
} from 'foo-kit'
```

### 处理多块导入与注释

#### ❌ Before
<!-- eslint-skip-block -->
```ts
/* eslint-disable perfectionist/sort-imports, perfectionist/sort-named-imports */
import './polyfill'
// keep style order
import './style.css'

import { bb } from 'bb-module'
import { componentLongName, alpha } from 'module-components'
// util helpers
import helperUtility from 'helper-utils'
```

#### ✅ After（side-effect block 保持不动）

```ts
/* eslint-disable perfectionist/sort-imports */
import './polyfill'
// keep style order
import './style.css'

import { bb } from 'bb-module'
// util helpers
import helperUtility from 'helper-utils'
import { alpha, componentLongName } from 'module-components'
```
