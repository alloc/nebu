import type { Node } from './Node'
import type {
  NodeType,
  ResolveNodeType,
  AnyNode,
  ResolveNodeProp,
} from './types'

export interface SyntaxHooks<T extends Node = any> {
  /**
   * Called when code is unshifted to an array property.
   *
   * Return true to prevent default behavior.
   */
  unshift?<U extends T>(
    node: U,
    prop: ResolveNodeProp<U>,
    code: string
  ): boolean | void
  /**
   * Called when code is pushed to an array property that was previously
   * empty.
   *
   * Return true to prevent default behavior.
   */
  pushFirst?<U extends T>(
    node: U,
    prop: ResolveNodeProp<U>,
    code: string
  ): boolean | void
  /**
   * Called when a node is removed from an array property.
   *
   * Return true to prevent default behavior.
   */
  removeFromArray?<U extends T>(
    node: U,
    removedRange: [number, number]
  ): boolean | void
}

export type SyntaxHooksVisitor = {
  [P in NodeType]?: SyntaxHooks<ResolveNodeType<P>>
} & {
  /**
   * These hooks are used when a hook of a specific node type does not
   * return true.
   */
  default?: SyntaxHooks<AnyNode>
}

type AnySyntaxHook = (...args: any[]) => boolean | void
type AnySyntaxHooks = Record<string, AnySyntaxHook>

export function mergeSyntaxHooks(
  leftVisitor: SyntaxHooksVisitor,
  rightVisitor: SyntaxHooksVisitor
) {
  const newVisitor = { ...leftVisitor }
  for (const key in rightVisitor) {
    const rightHooks = rightVisitor[key as NodeType] as AnySyntaxHooks
    if (!rightHooks) {
      continue
    }
    const leftHooks = leftVisitor[key as NodeType] as AnySyntaxHooks
    if (leftHooks) {
      const newHooks = { ...leftHooks }
      for (const hookName in rightHooks) {
        const rightHook = rightHooks[hookName]
        if (rightHook) {
          const leftHook = leftHooks[hookName]
          if (leftHook) {
            newHooks[hookName as keyof SyntaxHooks] = (...args: any[]) => {
              return leftHook(...args) || rightHook(...args)
            }
          } else {
            newHooks[hookName as keyof SyntaxHooks] = rightHook
          }
        }
      }
    } else {
      leftVisitor[key as NodeType] = rightHooks
    }
  }
  return newVisitor
}
