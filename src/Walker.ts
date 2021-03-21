import type { Lookup } from '@alloc/types'
import type { PluginMap, Visitor } from './types'
import { Node } from './Node'
import { KEYS } from 'eslint-visitor-keys'
import { is } from '@alloc/is'

export class Walker<State = Lookup> {
  stack: Node[] = []
  yielded = new Set<any>()

  constructor(
    /** State shared between plugins */
    readonly state: State,
    /** Visitor plugins */
    readonly plugins: PluginMap<State>
  ) {}

  // Depth-first traversal, parents first
  walk(node: Node) {
    if (node.removed) {
      return
    }

    this.stack.push(node)

    const visitors = this.plugins[node.type] as Visitor[]
    if (visitors) {
      for (const visitor of visitors) {
        visitor(node, this.state)
        if (node.removed) {
          return
        }
      }
    }

    // Visit any children.
    this.descend(node)

    if (!node.removed) {
      if (node.yields != null) {
        node.yields.forEach(resume => resume())
      }
    }

    this.stack.pop()
  }

  // Traverse deeper.
  descend(node: Node) {
    let k = -1
    const keys = KEYS[node.type]
    if (!keys) {
      throw Error(`Unknown node type: "${node.type}"`)
    }
    while (++k !== keys.length) {
      const key = keys[k]
      const val: any = node[key as keyof Node]
      if (!val) {
        continue
      }
      if (val.type) {
        this.walk(val)
        if (node.removed) {
          return
        }
      } else if (is.array(val)) {
        let i = -1
        while (++i !== val.length) {
          this.walk(val[i])
          if (node.removed) {
            return
          }
        }
      }
    }
  }

  // Prevent traversal of a node and its descendants.
  drop(node: Node) {
    const { stack } = this

    let i = stack.indexOf(node)
    if (i === -1) {
      node.removed = true
      return
    }

    const { length } = stack
    while (true) {
      stack[i].removed = true
      if (++i === length) {
        return
      }
    }
  }
}
