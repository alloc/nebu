import { is } from '@alloc/is'
import {
  ArrayProp,
  ESTree,
  NodeProp,
  PluginMap,
  PluginOption,
  Visitor,
} from '../types'
import type { Node } from '../Node'

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

// The node assumes ownership of its starting line, unless other nodes exist on
// the same line. It also assumes ownership of the first trailing semicolon or
// comma. Works with comma-delimited expressions, too.
export function greedyRange(
  input: string,
  node: Node,
  i?: number
): [number, number] {
  // Our minimum range.
  let sib, sibAfter, sibBefore
  let { start, end, parent, ref } = node

  // The trailing newline (or end of input).
  let lineEnd = input.indexOf('\n', end)
  if (lineEnd === -1) {
    lineEnd = input.length
  }

  // Be sibling-aware.
  let sibs: any = parent[ref as keyof Node]
  if (!Array.isArray(sibs)) {
    i = 0
    sibs = null
  } else {
    if (i == null) {
      i = sibs.indexOf(node)
    }
    const len = sibs.length
    if (i !== len - 1) {
      // Find a sibling after us that isn't stale yet.
      let j = i
      while (++j !== len) {
        sib = sibs[j]
        if (!sib.stale) {
          sibAfter = sib
          break
        }
      }

      if (sibAfter) {
        // Take ownership until the start of the sibling after us
        // if it exists on the same line that we end on.
        if (sib.start < lineEnd) {
          end = sib.start
          return [start, end]
        }
      }
    }
  }

  // The leading newline.
  const lineStart = 1 + input.lastIndexOf('\n', start)

  // Avoid extra work if we are the first node on our starting line.
  if (start === lineStart) {
    start = lineStart - 1
  } else {
    // Find a sibling before us that isn't stale yet.
    if (sibs) {
      while (--i !== -1) {
        sib = sibs[i]
        if (!sib.stale) {
          sibBefore = sib
          break
        }
        // Avoid checking every sibling.
        if (sib.end < lineStart) {
          break
        }
      }
    }

    // Take ownership of leading whitespace if the sibling before us ends on the
    // line we start on. We'll never take ownership of both leading and trailing
    // whitespace in the same removal, unless no siblings exist on our line(s).
    if (sibBefore) {
      start = Math.max(sib.end, lineStart - 1)
    }
    // Take ownership of the leading newline if our parent doesn't start on it.
    else if (parent.start < lineStart) {
      start = lineStart - 1
    }
  }

  // Avoid extra work if we are the last node on our ending line.
  if (end !== lineEnd) {
    if (!sibAfter) {
      // Take ownership until the trailing newline
      // if our parent doesn't end on it.
      if (parent.end > lineEnd) {
        end = lineEnd
      }

      // Preserve trailing whitespace if we own our leading whitespace.
    } else if (!sibBefore || start > sibBefore.end) {
      end = Math.min(sibAfter.start, lineEnd)
    }
  }

  return [start, end]
}

export function getArray<T extends ESTree.Node, P extends NodeProp<T>>(
  node: Node<T>,
  prop: P
): ArrayProp<T, P>
export function getArray(node: Node, prop: string): readonly any[]
export function getArray(node: Node, prop: string) {
  const val = Reflect.get(node, prop)
  if (val) {
    if (is.array(val)) {
      return val
    }
    if (val.type == 'BlockStatement') {
      return val.body
    }
  }
  throw Error(`"${prop}" is not an array or BlockStatement`)
}

export function mergePlugins(plugins: readonly PluginOption[]): PluginMap {
  const merged: any = {}
  for (let plugin of plugins) {
    if (plugin) {
      if ('default' in plugin) {
        plugin = plugin.default
      }
      for (const key in plugin) {
        const visitor = (plugin as any)[key] as Visitor
        if (merged[key]) {
          merged[key].push(visitor)
        } else {
          merged[key] = [visitor]
        }
      }
    }
  }
  return merged
}
