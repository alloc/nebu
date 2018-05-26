# nebu v1.0.3

Transform your Javascript with [acorn][1] trees.

Pronounced `nee-boo`.

Nebu brings the power of [Babel][2]'s plugin pipeline and visitor design, but without a slow AST-to-code phase or clunky AST node constructors. Like Babel, we parse and traverse an AST to determine which changes are needed and where. Like [Bublé][3], we avoid generating your code from the AST, which improves performance and preserves the style of your code. And of course, sourcemaps are included!

**This is still experimental! Please report bugs and contribute if you can!** 🙂

NOTE: Nebu does *not* convert your ES6 code to ES5 (or anything like that). If you need that, use [Bublé][3] *after* you run your code through Nebu, or you can write code that runs on your target platforms without Bublé. 😉

[1]: https://github.com/acornjs/acorn
[2]: https://github.com/babel/babel
[3]: https://github.com/Rich-Harris/buble

```js
const nebu = require('nebu');

nebu.process(code, {
  ast: {}, // use an existing ESTree object
  plugins: [{
    Identifier(node) {
      if (node.name == 'foo') {
        node.replace('bar')
      }
    }
  }],
})
```

The `process` function traverses the AST depth-first, which means children are
visited before neighbors, and parents are visited before children.

The `process` function has the following options:
- `ast: ?object` pre-existing ESTree object
- `state: ?object` state passed to each visitor
- `plugins: object[]` array of visitor maps
- `filename: ?string` path to the source code
- `sourceMaps: ?string|true` sourcemap type
- `generatedFile: ?string` path to the generated code
- `parser: ?object` options for the parser

The `plugins` array is required, and must contain at least one plugin.

The `state` object is useful when a plugin analyzes the structure of your code and needs to communicate this information back to you. Another use case is inter-visitor communication.

The `sourceMaps` option defaults to falsy, which means no sourcemap is generated. Setting `sourceMaps` to `true` or `"both"` will generate a `SourceMap` object and return it as the `map` property of the result object. Setting `sourceMaps` to `"inline"` or `"both"` will append a `//# sourceMappingURL` comment to the generated code. When `sourceMaps` equals `"inline"` or falsy, the `process` function returns a string (the generated code) instead of an object.

The `parser` options object is passed to `acorn.parse`, whose valid options are listed [here](https://github.com/acornjs/acorn#main-parser). The `ecmaVersion` option is always set to `9` (to stay compatible with Bublé). The `sourceType` option is always set to `"module"`.

## Node API

Every node (except the root node) has these properties:
- `parent: Node` the nearest container node
- `ref: string` the parent property that contains us

The `acorn.Node` prototype is temporarily extended with the following methods.

NOTE: Methods that take a `code` argument do *not* validate it for syntax errors. So be careful!

### isLiteral(type)

Check if `node.type` equals `"Literal"` and `typeof node.value` equals the given string.

### toString()

Slice the source code using `node.start` and `node.end` as boundaries.

NOTE: This does *not* include mutations, so the return value is static.

### walk(prop, iter)

Call the `iter` function for each child node that exists at the given property name. Before your function is called, the children have their `parent` and `ref` properties set accordingly. The `iter` argument is optional.

### yield(resume)

Call the `resume` function after all children have been traversed. No arguments are passed. This method may be called multiple times, and by any other node.

### set(prop, code)

Update some property of the node.

Properties that typically equal a `Node` object or an array of `Node` objects should be compatible with this method.

Improving the capability of this method is tracked by [#8](https://github.com/aleclarson/nebu/issues/8).

### push(prop, code)

Append a string of code to an array of child nodes.

### unshift(prop, code)

Prepend a string of code to an array of child nodes.

### splice(prop, index, n, code)

Like `[].splice`, you can remove child nodes from an array, insert code at the given index, or both.

The `n` argument indicates the number of children to remove.

### before(code)

Insert code before the node.

You should append a line break to `code` if you want it on a separate line.

### after(code)

Insert code after the node.

You should prepend a line break to `code` if you want it on a separate line.

### indent(depth)

Increase the node's indentation level.

The tab/space width is auto-detected.

The `depth` argument defaults to 1.

### dedent(depth)

Decrease the node's indentation level.

The tab/space width is auto-detected.

The `depth` argument defaults to 1.

### replace(code)

Replace the node with a string of code.

### remove(prop)

Remove some property of the node.

When `prop` is undefined, remove the node entirely.
