/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

const matchType = type => node => node.type === type

exports.noop = function () {}

// Find a matching node. Check the given node first.
exports.lookup = function (node, match) {
  if (typeof match === 'string') {
    match = matchType(match)
  }
  while (node) {
    if (match(node)) {
      return node
    }
    node = node.parent
  }
  return null
}

// Find a matching parent.
exports.findParent = function (node, match) {
  if (typeof match === 'string') {
    match = matchType(match)
  }
  while ((node = node.parent)) {
    if (match(node)) {
      return node
    }
  }
  return null
}

// Is the given node first on its starting line?
exports.isFirst = function (node, input) {
  const lineStart = 1 + input.lastIndexOf('\n', node.start)
  return /^[ \t]*$/.test(input.slice(lineStart, node.start))
}

// Compute tab count of a block.
exports.parseDepth = function (node, tab, input) {
  const lineStart = 1 + input.lastIndexOf('\n', node.start)
  let lineEnd = input.indexOf('\n', lineStart)
  if (lineEnd === -1) {
    lineEnd = input.length
  }
  const prefix = /^[ \t]*/.exec(input.slice(lineStart, lineEnd))[0]
  return prefix.length / tab.length
}

// Increment the indentation level.
exports.indent = function (code, tab, depth) {
  if (depth == null) {
    depth = 1
  }
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
exports.stripIndent = function (code, tab) {
  let re = new RegExp(`^((?:${tab})*)`)
  const width = tab.length
  let depth = 0
  // Find the first indentation level that isn't zero.
  for (let line of Array.from(code.split('\n'))) {
    depth = re.exec(line)[1].length / width
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
exports.guessTab = guessTab
function guessTab(code) {
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
      (prev, cur) => Math.min(prev, /^ +/.exec(cur)[0].length),
      Infinity
    )
  )
}

// The node assumes ownership of its starting line, unless other nodes exist on
// the same line. It also assumes ownership of the first trailing semicolon or
// comma. Works with comma-delimited expressions, too.
exports.greedyRange = function (input, node, i) {
  // Our minimum range.
  let sib, sibAfter, sibBefore
  let { start, end } = node

  // The trailing newline (or end of input).
  let lineEnd = input.indexOf('\n', end)
  if (lineEnd === -1) {
    lineEnd = input.length
  }

  // Be sibling-aware.
  let sibs = node.parent[node.ref]
  if (!Array.isArray(sibs)) {
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

      // Take ownership of the leading newline if our parent doesn't start on it.
    } else if (node.parent.start < lineStart) {
      start = lineStart - 1
    }
  }

  // Avoid extra work if we are the last node on our ending line.
  if (end !== lineEnd) {
    if (!sibAfter) {
      // Take ownership until the trailing newline
      // if our parent doesn't end on it.
      if (node.parent.end > lineEnd) {
        end = lineEnd
      }

      // Preserve trailing whitespace if we own our leading whitespace.
    } else if (!sibBefore || start > sibBefore.end) {
      end = Math.min(sibAfter.start, lineEnd)
    }
  }

  return [start, end]
}
