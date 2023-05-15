import { isArray } from '@alloc/is'
import type { Lookup } from '@alloc/types'
import type { PluginMap, Visitor } from './types'
import { KEYS } from 'eslint-visitor-keys'
import { ESTree } from 'meriyah'

type WalkableNode = ESTree.Node &
  Record<string, any> & {
    removed?: boolean
    yields?: Set<() => void>
  }

export class Walker<State = Lookup> {
  stack: WalkableNode[] = []
  yielded = new Set<any>()

  constructor(
    /** State shared between plugins */
    readonly state: State,
    /** Visitor plugins */
    readonly plugins: PluginMap<State>
  ) {}

  // Depth-first traversal, parents first
  walk(node: WalkableNode) {
    if (node.removed) {
      return
    }

    this.stack.push(node)

    const visitors = this.plugins[node.type] as Visitor<any, State>[]
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
  descend(node: WalkableNode) {
    let k = -1
    const keys = KEYS[node.type]
    if (!keys) {
      throw Error(`Unknown node type: "${node.type}"`)
    }
    while (++k !== keys.length) {
      const key = keys[k]
      const val = node[key]
      if (!val) {
        continue
      }
      if (val.type) {
        this.walk(val)
        if (node.removed) {
          return
        }
      } else if (isArray(val)) {
        let i = -1
        while (++i !== val.length) {
          const elem = val[i]
          if (elem) {
            this.walk(elem)
          }
          if (node.removed) {
            return
          }
        }
      }
    }
  }

  // Prevent traversal of a node and its descendants.
  drop(node: WalkableNode) {
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
