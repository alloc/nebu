
u = exports

matchType = (type) ->
  (node) -> node.type is type

u.noop = ->

# Find a matching node. Check the given node first.
u.lookup = (node, match) ->
  if typeof match is 'string'
    match = matchType match
  while node
    return node if match node
    node = node.parent
  return null

# Find a matching parent.
u.findParent = (node, match) ->
  if typeof match is 'string'
    match = matchType match
  while node = node.parent
    return node if match node
  return null

# Is the given node first on its starting line?
u.isFirst = (node, input) ->
  lineStart = 1 + input.lastIndexOf '\n', node.start
  /^[ \t]*$/.test input.slice lineStart, node.start

# Compute tab count of a block.
u.parseDepth = (node, tab, input) ->
  lineStart = 1 + input.lastIndexOf '\n', node.start
  lineEnd = input.indexOf '\n', lineStart
  lineEnd = input.length if lineEnd is -1
  prefix = /^[ \t]*/.exec(input.slice lineStart, lineEnd)[0]
  prefix.length / tab.length

# Increment the indentation level.
u.indent = (code, tab, depth = 1) ->
  indent = tab.repeat depth

  # Avoid extra work if using same tab string (or none).
  prev = u.guessTab code
  if !prev or prev is tab
    return code if !indent
    return code.replace /\n/g, '\n' + indent

  # Fix the existing indentation.
  re = new RegExp "\n((?:#{prev})*)", 'g'
  width = prev.length
  code.replace re, (_, prev) ->
    '\n' + indent + tab.repeat prev.length / width

# Reset the indentation level to zero.
# Assume the first line is never indented.
# This is useful when moving/duplicating code.
u.stripIndent = (code, tab) ->
  re = new RegExp "^((?:#{tab})*)"
  width = tab.length
  depth = 0
  # Find the first indentation level that isn't zero.
  for line in code.split '\n'
    depth = re.exec(line)[1].length / width
    break if depth isnt 0
  if depth > 1
    re = new RegExp "\n((?:#{tab})*)", 'g'
    code.replace re, (_, prev) ->
      '\n' + tab.repeat Math.max 0, 1 + (prev.length / width) - depth
  else code

# Adapted from magic-string (https://goo.gl/pHi5kK)
u.guessTab = (code) ->
  lines = code.split '\n'
  tabbed = lines.filter (line) -> /^\t+/.test line
  spaced = lines.filter (line) -> /^ {2,}/.test line

  if !tabbed.length and !spaced.length
    return null

  if tabbed.length >= spaced.length
    return '\t'

  # Guess the number of spaces per tab.
  ' '.repeat spaced.reduce (prev, cur) ->
    Math.min(prev, /^ +/.exec(cur)[0].length)
  , Infinity

# The node assumes ownership of its starting line, unless other nodes exist on
# the same line. It also assumes ownership of the first trailing semicolon or
# comma. Works with comma-delimited expressions, too.
u.greedyRange = (input, node, i) ->
  # Our minimum range.
  {start, end} = node

  # The trailing newline (or end of input).
  lineEnd = input.indexOf '\n', end
  lineEnd = input.length if lineEnd is -1

  # Be sibling-aware.
  sibs = node.parent[node.ref]
  if !Array.isArray sibs
    sibs = null
  else
    i ?= sibs.indexOf node
    len = sibs.length
    if i isnt len - 1

      # Find a sibling after us that isn't stale yet.
      j = i; while ++j isnt len
        sib = sibs[j]
        if !sib.stale
          sibAfter = sib
          break

      if sibAfter
        # Take ownership until the start of the sibling after us
        # if it exists on the same line that we end on.
        if sib.start < lineEnd
          end = sib.start
          return [start, end]

  # The leading newline.
  lineStart = 1 + input.lastIndexOf '\n', start

  # Avoid extra work if we are the first node on our starting line.
  if start is lineStart
    start = lineStart - 1
  else
    # Find a sibling before us that isn't stale yet.
    if sibs
      while --i isnt -1
        sib = sibs[i]
        if !sib.stale
          sibBefore = sib
          break
        # Avoid checking every sibling.
        break if sib.end < lineStart

    # Take ownership of leading whitespace if the sibling before us ends on the
    # line we start on. We'll never take ownership of both leading and trailing
    # whitespace in the same removal, unless no siblings exist on our line(s).
    if sibBefore
      start = Math.max sib.end, lineStart - 1

    # Take ownership of the leading newline if our parent doesn't start on it.
    else if node.parent.start < lineStart
      start = lineStart - 1

  # Avoid extra work if we are the last node on our ending line.
  if end isnt lineEnd

    if !sibAfter
      # Take ownership until the trailing newline
      # if our parent doesn't end on it.
      if node.parent.end > lineEnd
        end = lineEnd

    # Preserve trailing whitespace if we own our leading whitespace.
    else if !sibBefore or start > sibBefore.end
      end = Math.min sibAfter.start, lineEnd

  [start, end]
