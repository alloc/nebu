# nebu

[![npm](https://img.shields.io/npm/v/nebu.svg)](https://www.npmjs.com/package/nebu)
[![Code style: Prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://paypal.me/alecdotbiz)

Fast, extensible, statically typed, and light Javascript transformer. (pronounced `nee-boo`)

**Why bother?** Nebu saves developers from the slow and heavy [Babel][1] compiler. Nebu skips AST-to-code generation, preferring simple string mutations, while keeping sourcemap support. This improves performance, preserves coding style, and makes plugins less clunky.

If you need to transpile ES6+ to ES5, use [Bublé][2] *after* using Nebu.

If you believe in Nebu's mission, consider building a Nebu plugin. The ecosystem is practically non-existent. It needs your help! 🤓

**This is still experimental! Please report bugs and contribute if you can!** 🙂

[1]: https://github.com/babel/babel
[2]: https://github.com/Rich-Harris/buble

&nbsp;

## Examples

See the `examples` folder for plugin examples.

You can test these examples like so:

```sh
git clone https://github.com/alloc/nebu
cd nebu && pnpm i
cd examples && pnpm i
./try nebu-strip-dev
```

&nbsp;

## Usage

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
- `ast?: object` pre-existing ESTree object
- `state?: object` state passed to each visitor
- `plugins: object[]` array of visitor maps
- `filename?: string` path to the source code
- `sourceMap?: boolean | "inline"` sourcemap type
- `sourceMapTarget?: string` sourcemap path (relative to `filename`)
- `generatedFile?: string` path to the generated code
- `includeContent?: boolean` include source content in sourcemap
- `jsx?: boolean` enable JSX parsing

The `plugins` array is required. Plugins are objects whose keys are ESTree node types and each value is a function that receives the node and shared state. The `plugins` array supports a plugin being wrapped in `{default: plugin}` for ESM interop.

The `state` object is useful when a plugin analyzes the structure of your code and needs to communicate this information back to you. Another use case is inter-visitor communication.

The `sourceMap` option defaults to false, so no sourcemap is generated. Setting `sourceMap` to `true` will generate a `SourceMap` object and return it as the `map` property of the result object. Setting `sourceMap` to `"inline"` will append a `//# sourceMappingURL` comment to the generated code.

The `includeContent` option defaults to true. You must explicitly specify `false` to exclude source content from the sourcemap.

### Utilities

The `nebu/utils` module exports a few utility functions you may find useful when developing a plugin.

```js
import { findParent } from 'nebu/utils'
```

## Node API

Every node (except the root node) has these properties:
- `parent: Node` the nearest container node
- `ref: string` the parent property that contains us

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
