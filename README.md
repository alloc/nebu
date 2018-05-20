# nebu v0.0.0

Transform your Javascript with [acorn][1] trees.

Source maps included, thanks to [magic-string][2].

Pronounced **nee-boo**.

[1]: https://github.com/acornjs/acorn
[2]: https://github.com/Rich-Harris/magic-string

```js
const nebu = require('nebu');

nebu.walk(code, {
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

The `walk` function traverses the AST depth-first, which means children are
visited before neighbors, and parents are visited before children.

## Node API

Every node (except the root node) has a `parent` property that points to
the parent node.

Nodes are extended with the following methods.

The `acorn.Node` prototype is temporarily mutated.

Any `code` arguments are parsed appropriately.

### update(prop, code)

Update some property of the node.

The property must support `Node` values.

### insert(prop, code)

Insert a node into an array of child nodes.

### replace(code)

Replace the node.

### remove(prop)

Remove some property of the node.

When `prop` is undefined, remove the node entirely.

Removing the current node's ancestor is *not* supported.

Be careful, this can break your code!
