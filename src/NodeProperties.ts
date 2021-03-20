import { is } from '@alloc/is'
import { AllNodeProps } from './types'
import { replacers } from './mutation'
import { Node } from './Node'

export const NodeProperties = new Proxy(Object.prototype, {
  get(_, key: string, node) {
    const val = node.n[key]
    if (val) {
      if (val.type) {
        return replaceProp(node, key, new Node(val))
      }
      if (is.array(val)) {
        return replaceProp(node, key, val.map(wrapNode))
      }
    }
    return val
  },
  set(_, key: string, value, node) {
    return setProp.call(node, key, value)
  },
})

function wrapNode(val: any) {
  return val && val.type ? new Node(val) : val
}

function setProp(this: any, key: string, newValue: any) {
  const replacer: any = replacers[key as AllNodeProps]
  if (!replacer) {
    return false
  }
  replacer.call(this, this[key], newValue)
  replaceProp(this, key, newValue)
  return true
}

function replaceProp(node: any, key: string, value: any) {
  Object.defineProperty(node, key, {
    get: () => value,
    set: setProp.bind(node, key),
    enumerable: true,
    configurable: true,
  })
  return value
}
