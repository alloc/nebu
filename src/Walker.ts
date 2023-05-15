import { isArray } from '@alloc/is'
import type { Lookup } from '@alloc/types'
import { KEYS } from 'eslint-visitor-keys'
import type { VisitorMap } from './types'
import { AnyNode } from './types'

type WalkableNode = {
  type: string
  removed?: boolean
  yields?: (() => void)[]
}

export class Walker<State = Lookup, T extends WalkableNode = AnyNode> {
  stack: T[] = []

  constructor(
    /** State shared between plugins */
    readonly state: State,
    /** Visitor plugins */
    readonly plugins: VisitorMap<State, T>
  ) {}

  // Depth-first traversal, parents first
  walk(node: T) {
    if (node.removed) {
      return
    }

    this.stack.push(node)

    const visitors = this.plugins.get(node.type)
    if (visitors) {
      for (const visitor of visitors) {
        visitor(node as any, this.state)
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
  descend(node: T) {
    let k = -1
    const keys = KEYS[node.type]
    if (!keys) {
      throw Error(`Unknown node type: "${node.type}"`)
    }
    while (++k !== keys.length) {
      const key = keys[k]
      const val = (node as any)[key]
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
  drop(node: T) {
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
