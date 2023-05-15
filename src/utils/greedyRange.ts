import MagicString from 'magic-string'
import { MagicSlice, toRelativeIndex } from '../MagicSlice'
import { Node } from '../Node'

// The node assumes ownership of its starting line, unless other nodes
// exist on the same line. It also assumes ownership of the first
// trailing semicolon or comma. Works with comma-delimited expressions,
// too.
export function greedyRange(
  output: MagicSlice | MagicString,
  node: Node,
  i?: number
): [number, number] {
  const input = output.original

  // Our minimum range.
  let sib, sibAfter, sibBefore
  let { start, end, parent, ref } = node

  start = toRelativeIndex(output, start)
  end = toRelativeIndex(output, end)

  // The trailing newline (or end of input).
  let lineEnd = input.indexOf('\n', end)
  if (lineEnd === -1) {
    lineEnd = input.length
  }

  // Be sibling-aware.
  let sibs = parent[ref as keyof Node] as Node[] | null
  if (!Array.isArray(sibs)) {
    i = 0
    sibs = null
  } else {
    if (i == null) {
      i = sibs.indexOf(node)
    }
    const len = sibs.length
    if (i !== len - 1) {
      // Find a sibling after us that isn't removed yet.
      let j = i
      while (++j !== len) {
        sib = sibs[j]
        if (!sib.removed) {
          sibAfter = sib
          break
        }
      }

      if (sibAfter) {
        // Take ownership until the start of the sibling after us
        // if it exists on the same line that we end on.
        const sibAfterStart = toRelativeIndex(output, sibAfter.start)
        if (sibAfterStart < lineEnd) {
          end = sibAfterStart
          return [start, end]
        }
      }
    }
  }

  // The leading newline.
  const lineStart = 1 + input.lastIndexOf('\n', start)

  // Avoid extra work if we are the first node on our starting line.
  if (start === lineStart) {
    start = Math.max(0, lineStart - 1)
  } else {
    // Find a sibling before us that isn't removed yet.
    if (sibs) {
      while (--i !== -1) {
        sib = sibs[i]
        if (!sib.removed) {
          sibBefore = sib
          break
        }
        // Avoid checking every sibling.
        const sibEnd = toRelativeIndex(output, sib.end)
        if (sibEnd < lineStart) {
          break
        }
      }
    }

    // Take ownership of leading whitespace if the sibling before us
    // ends on the line we start on. We'll never take ownership of both
    // leading and trailing whitespace in the same removal, unless no
    // siblings exist on our line(s).
    if (sibBefore) {
      const sibBeforeEnd = toRelativeIndex(output, sibBefore.end)
      start = Math.max(sibBeforeEnd, lineStart - 1)
    }
    // Take ownership of the leading newline if our parent doesn't start on it.
    else {
      const parentStart = toRelativeIndex(output, parent.start)
      if (parentStart < lineStart) {
        start = lineStart - 1
      }
    }
  }

  // Avoid extra work if we are the last node on our ending line.
  if (end !== lineEnd) {
    if (!sibAfter) {
      // Take ownership until the trailing newline
      // if our parent doesn't end on it.
      const parentEnd = toRelativeIndex(output, parent.end)
      if (parentEnd > lineEnd) {
        end = lineEnd
      }
    }
    // Preserve trailing whitespace if we own our leading whitespace.
    else {
      const sibBeforeEnd = !!sibBefore && toRelativeIndex(output, sibBefore.end)
      if (sibBeforeEnd == false || start > sibBeforeEnd) {
        const sibAfterStart = toRelativeIndex(output, sibAfter.start)
        end = Math.min(sibAfterStart, lineEnd)
      }
    }
  }

  return [start, end]
}
