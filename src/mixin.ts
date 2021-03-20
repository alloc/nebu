/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const {
  greedyRange,
  indent,
  noop,
  parseDepth,
  stripIndent,
} = require('./utils')
const { MagicSlice } = require('./slice')
const { Walker } = require('./walker')
const acorn = require('acorn')

const stack = [] // for nested processing

const AcornMixin = {}
exports.AcornMixin = AcornMixin

AcornMixin.init = function (acorn, output, walker) {
  const pt = acorn.Node.prototype
  const mixin = createMixin(output, walker)
  if (pt.nebu) {
    const prev = {}
    for (let key in mixin) {
      prev[key] = pt[key]
      pt[key] = mixin[key]
    }
    stack.push(prev)
  } else {
    Object.assign(pt, mixin)
  }
  return mixin
}

AcornMixin.remove = function (acorn, mixin) {
  let key, prev
  const pt = acorn.Node.prototype
  if ((prev = stack.pop())) {
    for (key in prev) {
      pt[key] = prev[key]
    }
    return
  }
  for (key in mixin) {
    delete pt[key]
  }
}

const isLiteral = function (type) {
  if (this.type === 'Literal') {
    return !type || typeof this.value === type
  } else {
    return false
  }
}

// Process any node with other plugins.
const process = function (node, source, state, plugins) {
  if (!node.stale) {
    const slice = new MagicSlice(source, node.start, node.end)
    const walker = new Walker(state, plugins)
    const mixin = AcornMixin.apply(slice, walker)
    walker.walk(this)
    AcornMixin.remove(mixin)
  }
}

// Context-aware mixin for acorn Node objects
var createMixin = function (output, walker) {
  const tab = output.indentStr || '  '
  const input = output.original

  // Remove a range of nodes.
  const removeNodes = function (nodes, parent, ref, i, n) {
    n = Math.min(i + n, nodes.length)
    while (true) {
      const node = nodes[i]
      if (!node.stale) {
        node.parent = parent
        node.ref = ref
        output.remove(...greedyRange(input, node, i))
        walker.drop(node)
      }
      if (++i === n) {
        return
      }
    }
  }

  return {
    nebu: require('.'),

    isLiteral,

    toString() {
      return stripIndent(input.slice(this.start, this.end), tab)
    },

    process(state, plugins) {
      if (arguments.length === 1) {
        plugins = state
        state = null
      }

      if (!Array.isArray(plugins)) {
        throw TypeError('`plugins` must be an array')
      }

      process(this, output, state, plugins)
      return this
    },

    walk(prop, iter) {
      let val
      if (iter == null) {
        iter = noop
      }
      if (!(val = this[prop])) {
        return this
      }

      if (Array.isArray(val)) {
        val.forEach((val, i) => {
          val.parent = this
          val.ref = prop
          return iter(val, i)
        })
      } else if (typeof val.type === 'string') {
        val.parent = this
        val.ref = prop
        iter(val)
      }

      return this
    },

    yield(resume) {
      if (this.yields) {
        this.yields.push(resume)
      } else {
        this.yields = [resume]
      }
      return this
    },

    set(prop, code) {
      let val
      if (!(val = this[prop])) {
        return this
      }

      if (Array.isArray(val)) {
        return this.splice(prop, 0, Infinity, code)
      }

      if (val.type === 'BlockStatement') {
        val.parent = this
        val.ref = prop
        return val.splice('body', 0, Infinity, code)
      }

      if (typeof val.type === 'string') {
        output.overwrite(val.start, val.end, code)
        walker.drop(val)
      }
      return this
    },

    push(prop, code) {
      let node
      const arr = getArray(this, prop)

      if ((node = arr[arr.length - 1])) {
        node.after(code)
        return this
      }

      node = (arr === this[prop] && this) || this[prop]
      output.appendRight(node.start + 1, code)
      return this
    },

    unshift(prop, code) {
      let node
      const arr = getArray(this, prop)

      if ((node = arr[0])) {
        node.before(code)
        return this
      }

      node = (arr === this[prop] && this) || this[prop]
      output.appendLeft(node.start + 1, code)
      return this
    },

    splice(prop, i, n, code) {
      const arr = getArray(this, prop)
      const len = arr.length

      if (i < 0) {
        i = (i % (len + 1)) + len
      } else if (i >= len) {
        if (!code) {
          return this
        }
        return this.push(prop, code)
      }

      if (n > 0) {
        let val
        if (arr !== (val = this[prop])) {
          val.parent = this
          val.ref = prop
          removeNodes(val.body, val, 'body', i, n)
        } else {
          removeNodes(val, this, prop, i, n)
        }
      }

      if (code) {
        if (i !== 0) {
          output.appendLeft(arr[i - 1].end, code)
          return this
        }

        if (this.type === 'BlockStatement') {
          if (this.depth == null) {
            this.depth = parseDepth(this, tab, input)
          }
          code = indent('\n' + code, tab, this.depth)
        }
        return this.unshift(prop, code)
      }
      return this
    },

    before(code) {
      if (this.depth == null) {
        this.depth = parseDepth(this, tab, input)
      }
      output.prependLeft(this.start, indent(code, tab, this.depth))
      return this
    },

    after(code) {
      if (this.depth == null) {
        this.depth = parseDepth(this, tab, input)
      }
      output.appendRight(this.end, indent(code, tab, this.depth))
      return this
    },

    indent(depth) {
      if (depth == null) {
        depth = 1
      }
      const [start, end] = Array.from(greedyRange(input, this))
      const prefix = tab.repeat(depth)
      let i = start - 1
      while (true) {
        i = input.indexOf('\n', i + 1)
        if (i === -1 || i >= end) {
          break
        }
        output.appendLeft(i + 1, prefix)
      }
      return this
    },

    dedent(depth) {
      if (depth == null) {
        depth = 1
      }
      if (this.depth == null) {
        this.depth = parseDepth(this, tab, input)
      }
      if (depth > this.depth) {
        ;({ depth } = this)
      }
      if (depth === 0) {
        return this
      }

      const [start, end] = Array.from(greedyRange(input, this))
      const width = tab.length * depth
      let i = start - 1
      while (true) {
        i = input.indexOf('\n', i + 1)
        if (i === -1 || i >= end) {
          break
        }
        output.remove(i, i + width)
      }
      return this
    },

    replace(code) {
      output.overwrite(this.start, this.end, code)
      walker.drop(this)
      return this
    },

    remove(prop) {
      let val
      if (this.stale) {
        return this
      }

      if (!prop) {
        output.remove(...greedyRange(input, this))
        walker.drop(this)
        return this
      }

      if (!(val = this[prop])) {
        return this
      }

      if (Array.isArray(val)) {
        removeNodes(val, this, prop, 0, Infinity)
      } else if (val.type === 'BlockStatement') {
        val.parent = this
        val.ref = prop
        removeNodes(val.body, val, 'body', 0, Infinity)
      } else if (typeof val.type === 'string') {
        output.remove(val.start, val.end)
        walker.drop(val)
      }

      return this
    },
  }
}

var getArray = function (node, prop) {
  let val
  if ((val = node[prop])) {
    if (Array.isArray(val)) {
      return val
    }
    if (val.type === 'BlockStatement') {
      return val.body
    }
  }
  throw Error(`'${prop}' is not an array or BlockStatement`)
}
