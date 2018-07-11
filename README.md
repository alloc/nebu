# nebu v1.1.1

Fast, extensible, and light Javascript transformer. (pronounced `nee-boo`)

**Why bother?** Nebu saves developers from the slow and heavy [Babel][1] compiler. Nebu skips AST-to-code generation, preferring simple string mutations, while keeping sourcemap support. This improves performance, preserves coding style, and makes plugins less clunky.

For ES6 support, use [Bublé][2] *after* using Nebu.

If you believe in Nebu's mission, consider building a Nebu plugin. The ecosystem is practically non-existent. It needs your help! 🤓

**This is still experimental! Please report bugs and contribute if you can!** 🙂

[1]: https://github.com/babel/babel
[2]: https://github.com/Rich-Harris/buble

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
- `includeContent: ?boolean` include source content in sourcemap
- `parser: ?object` options for the parser

The `plugins` array is required, and must contain at least one plugin. It may contain nested arrays of plugins.

The `state` object is useful when a plugin analyzes the structure of your code and needs to communicate this information back to you. Another use case is inter-visitor communication.

The `sourceMaps` option defaults to falsy, which means no sourcemap is generated. Setting `sourceMaps` to `true` or `"both"` will generate a `SourceMap` object and return it as the `map` property of the result object. Setting `sourceMaps` to `"inline"` or `"both"` will append a `//# sourceMappingURL` comment to the generated code. When `sourceMaps` equals `"inline"` or falsy, the `process` function returns a string (the generated code) instead of an object.

The `includeContent` option defaults to true, which means you must explicitly specify `false` to exclude source content from the sourcemap.

The `parser` options object is passed to `acorn.parse`, whose valid options are listed [here](https://github.com/acornjs/acorn#main-parser). The `ecmaVersion` option is always set to `9` (to stay compatible with Bublé). The `sourceType` option is always set to `"module"`.

### nebu.acorn

To override the `acorn` module that nebu uses, you can set `nebu.acorn` before calling `nebu.process` for the first time.

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

### process(state, plugins)

Process a node with a separate set of plugins.

The `state` argument is optional. You may pass null or only the plugins array if your plugins are stateless.

All changes are included in the result of `nebu.process`.

The return value is the processed node.

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
