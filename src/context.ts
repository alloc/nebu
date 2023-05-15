import type { MagicSlice } from './MagicSlice'
import type { Walker } from './Walker'
import type { Node } from './Node'
import MagicString from 'magic-string'
import { greedyRange } from './utils/greedyRange'
import { SyntaxHooksVisitor, SyntaxHooks, mergeSyntaxHooks } from './hooks'
import { builtinHooks } from './builtinHooks'
import { isArray } from '@alloc/is'

type HookParams<Hook> = Hook extends (
  node: Node,
  ...params: infer Params
) => any
  ? Params
  : never

export interface NebuContext {
  input: string
  output: MagicString | MagicSlice
  walker: Walker<any, Node>
  tab: string

  /** Invoke a syntax hook */
  applyHook<K extends keyof SyntaxHooks>(
    hookName: K,
    node: Node,
    ...params: HookParams<Exclude<SyntaxHooks[K], void>>
  ): boolean | void

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
  walker: Walker<any, Node>,
  customHooks?: SyntaxHooksVisitor
) {
  const hooksVisitor = customHooks
    ? mergeSyntaxHooks(builtinHooks, customHooks)
    : builtinHooks

  const applyHook: NebuContext['applyHook'] = (hookName, node, ...params) => {
    let hooks = hooksVisitor[node.type]
    if (hooks) {
      const hook = hooks[hookName] as (
        node: Node,
        ...params: any[]
      ) => boolean | void

      if (hook && hook(node, ...params)) {
        return true
      }
    }
    if ((hooks = hooksVisitor.default)) {
      const hook = hooks[hookName] as (
        node: Node,
        ...params: any[]
      ) => boolean | void

      if (hook && hook(node, ...params)) {
        return true
      }
    }
  }

  contextStack.push({
    get input() {
      return output.original
    },
    output,
    walker,
    tab: output.getIndentString() || '  ',
    applyHook,
    removeNodes(nodes, parent, ref, i, n) {
      const isArrayProp = isArray((parent as any)[ref])
      n = Math.min(i + n, nodes.length)
      do {
        const node = nodes[i]
        if (!node.removed) {
          node.parent = parent
          node.ref = ref
          const removedRange = greedyRange(output, node, i)
          if (isArrayProp && applyHook('removeFromArray', node, removedRange)) {
            continue
          }
          output.remove(...removedRange)
          walker.drop(node)
        }
      } while (++i !== n)
    },
  })
}

export function popContext() {
  return contextStack.pop()
}
