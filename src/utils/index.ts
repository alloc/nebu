import { isArray } from '@alloc/is'
import type { Node } from '../Node'
import { ArrayProp, ESTree, NodeProp, PluginOption, VisitorMap } from '../types'

const matchType = (type: string) => (node: Node) => node.type === type

export function noop() {}

// Find a matching node. Check the given node first.
export function lookup(node: Node, match: string | ((node: Node) => boolean)) {
  if (typeof match === 'string') {
    match = matchType(match)
  }
  while (node) {
    if (match(node)) {
      return node
    }
    node = node.parent!
  }
  return null
}

// Find a matching parent.
export function findParent(
  node: Node,
  match: string | ((node: Node) => boolean)
) {
  if (typeof match === 'string') {
    match = matchType(match)
  }
  while ((node = node.parent!)) {
    if (match(node)) {
      return node
    }
  }
  return null
}

// Is the given node first on its starting line?
export function isFirst(node: Node, input: string) {
  const lineStart = 1 + input.lastIndexOf('\n', node.start)
  return /^[ \t]*$/.test(input.slice(lineStart, node.start))
}

// Compute tab count of a block.
export function parseDepth(node: Node, tab: string, input: string) {
  const lineStart = 1 + input.lastIndexOf('\n', node.start)
  let lineEnd = input.indexOf('\n', lineStart)
  if (lineEnd === -1) {
    lineEnd = input.length
  }
  const prefix = /^[ \t]*/.exec(input.slice(lineStart, lineEnd))![0]
  return prefix.length / tab.length
}

// Increment the indentation level.
export function indent(code: string, tab: string, depth = 1) {
  const indent = tab.repeat(depth)

  // Avoid extra work if using same tab string (or none).
  const prev = guessTab(code)
  if (!prev || prev === tab) {
    if (!indent) {
      return code
    }
    return code.replace(/\n/g, '\n' + indent)
  }

  // Fix the existing indentation.
  const re = new RegExp(`\n((?:${prev})*)`, 'g')
  const width = prev.length
  return code.replace(
    re,
    (_, prev) => '\n' + indent + tab.repeat(prev.length / width)
  )
}

// Reset the indentation level to zero.
// Assume the first line is never indented.
// This is useful when moving/duplicating code.
export function stripIndent(code: string, tab: string) {
  let re = new RegExp(`^((?:${tab})*)`)
  const width = tab.length
  let depth = 0
  // Find the first indentation level that isn't zero.
  for (let line of code.split('\n')) {
    depth = re.exec(line)![1].length / width
    if (depth !== 0) {
      break
    }
  }
  if (depth > 1) {
    re = new RegExp(`\n((?:${tab})*)`, 'g')
    return code.replace(
      re,
      (_, prev) =>
        '\n' + tab.repeat(Math.max(0, 1 + prev.length / width - depth))
    )
  } else {
    return code
  }
}

// Adapted from magic-string (https://goo.gl/pHi5kK)
export function guessTab(code: string) {
  const lines = code.split('\n')
  const tabbed = lines.filter(line => /^\t+/.test(line))
  const spaced = lines.filter(line => /^ {2,}/.test(line))

  if (!tabbed.length && !spaced.length) {
    return null
  }

  if (tabbed.length >= spaced.length) {
    return '\t'
  }

  // Guess the number of spaces per tab.
  return ' '.repeat(
    spaced.reduce(
      (prev, cur) => Math.min(prev, /^ +/.exec(cur)![0].length),
      Infinity
    )
  )
}

export function getArray<
  T extends ESTree.Node,
  P extends NodeProp<T> & keyof T
>(node: Node<T>, prop: P): ArrayProp<T, P>
export function getArray(node: Node, prop: string): readonly any[]
export function getArray(node: Node, prop: string) {
  const val = Reflect.get(node, prop)
  if (val) {
    if (isArray(val)) {
      return val
    }
    if (val.type == 'BlockStatement') {
      return val.body
    }
  }
  throw Error(`"${prop}" is not an array or BlockStatement`)
}

export function mergePlugins<State, T extends { type: string }>(
  plugins: readonly PluginOption<State, T>[]
): VisitorMap<State, T> {
  const merged: VisitorMap<State, T> = new Map()
  for (let plugin of plugins) {
    if (plugin) {
      if ('default' in plugin) {
        plugin = plugin.default
      }
      for (const key in plugin) {
        // @ts-ignore
        const visitor = plugin[key]
        const visitors = merged.get(key)
        if (visitors) {
          // @ts-ignore
          visitors.push(visitor)
        } else {
          merged.set(key, [visitor])
        }
      }
    }
  }
  return merged
}

export function searchString<Result>(
  str: string,
  start: number,
  test: (char: string, offset: number) => Result | false | void
): Result | undefined {
  let i = start
  let char = str[i]
  let result: any
  while (char) {
    result = test(char, i)
    if (result !== false && result !== void 0) {
      return result
    }
    char = str[++i]
  }
}
