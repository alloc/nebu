/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { props } from './props'

class Walker {
  constructor(state, plugins) {
    this.state = state || {}
    this.plugins = plugins
    this.stack = []
    this.yielded = new Set()
  }

  // Depth-first traversal, parents first
  walk(node, parent, ref) {
    let visitors
    if (node.stale) {
      return
    }

    this.stack.push(node)
    if (parent) {
      node.parent = parent
      node.ref = ref
    }

    if ((visitors = this.plugins[node.type])) {
      for (let visitor of Array.from(visitors)) {
        visitor(node, this.state)
        if (node.stale) {
          return
        }
      }
    }

    // Visit any children.
    this.descend(node)

    if (!node.stale) {
      if (node.yields != null) {
        node.yields.forEach(resume => resume())
      }
    }

    this.stack.pop()
  }

  // Traverse deeper.
  descend(node) {
    let k = -1
    const keys = props[node.type] || Object.keys(node)
    while (++k !== keys.length) {
      var key, val
      if ((val = node[(key = keys[k])])) {
        if (typeof val.type === 'string') {
          if (val !== node.parent) {
            this.walk(val, node, key)
            if (node.stale) {
              return
            }
          }
        } else if (Array.isArray(val)) {
          let i = -1
          while (++i !== val.length) {
            this.walk(val[i], node, key)
            if (node.stale) {
              return
            }
          }
        }
      }
    }
  }

  // Prevent traversal of a node and its descendants.
  drop(node) {
    const { stack } = this

    let i = stack.indexOf(node)
    if (i === -1) {
      node.stale = true
      return
    }

    const { length } = stack
    while (true) {
      stack[i].stale = true
      if (++i === length) {
        return
      }
    }
  }
}

export { Walker }
