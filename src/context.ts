import type { MagicSlice } from './MagicSlice'
import type { Walker } from './Walker'
import type { Node } from './Node'
import MagicString from 'magic-string'
import { greedyRange } from './utils/greedyRange'

export interface NebuContext {
  input: string
  output: MagicString | MagicSlice
  walker: Walker<any>
  tab: string
  /** Remove a range of nodes */
  removeNodes(
    nodes: readonly Node[],
    parent: Node,
    ref: string,
    fromIndex: number,
    nodeCount: number
  ): void
}

const contextStack: NebuContext[] = []

export function getContext() {
  if (contextStack.length) {
    return contextStack[contextStack.length - 1]
  }
  throw Error('Invalid call outside Nebu context')
}

export function pushContext(
  output: MagicString | MagicSlice,
  walker: Walker<any>
) {
  contextStack.push({
    get input() {
      return output.original
    },
    output,
    walker,
    tab: output.getIndentString() || '  ',
    removeNodes(nodes, parent, ref, i, n) {
      n = Math.min(i + n, nodes.length)
      while (true) {
        const node = nodes[i]
        if (!node.removed) {
          node.parent = parent
          node.ref = ref
          output.remove(...greedyRange(output, node, i))
          walker.drop(node)
        }
        if (++i === n) {
          return
        }
      }
    },
  })
}

export function popContext() {
  return contextStack.pop()
}
