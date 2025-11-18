# style-sort

> 对 CSS/SCSS/LESS 等样式代码中的属性进行排序：先比较属性名长度，再按字母序；同时允许配置一组需要“绑在一起”的属性并依照自定义顺序输出。

## 配置

```ts
type Options = [{
  groupedProperties?: string[]
}]
```

- `groupedProperties`: 预先声明的属性名称列表（忽略大小写）。列表中的属性会按照提供的顺序排在最前方，并保持相邻；其余属性仍旧遵循“长度 → 字母 → 原始顺序”的对比规则。

## 示例

### 默认排序

```css
.button {
  padding: 12px;
  color: red;
  border: none;
}
```

⟶ 修复后：

```css
.button {
  color: red;
  border: none;
  padding: 12px;
}
```

### 配合分组配置

```jsonc
{
  "fonds/style-sort": ["error", {
    "groupedProperties": ["width", "height", "color"]
  }]
}
```

```css
.card {
  margin: 0;
  width: 200px;
  color: #fff;
  height: 120px;
}
```

⟶ 修复后：

```css
.card {
  width: 200px;
  height: 120px;
  color: #fff;
  margin: 0;
}
```

### 嵌套/预处理器同样适用

```scss
.profile {
  padding: 16px;
  background: #222;

  &__avatar {
    border-radius: 50%;
    color: #fff;
    width: 40px;
  }
}
```

该规则会分别在每个选择器块中排序属性，不影响嵌套或其它 Sass/Less 语法。
