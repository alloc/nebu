{greedyRange, indent, noop, parseDepth, stripIndent} = require './utils'
acorn = require 'acorn'

pt = acorn.Node.prototype

isLiteral = (type) ->
  if @type is 'Literal'
    !type or typeof @value is type
  else false

# Context-aware mixin for acorn Node objects
exports.create = (output, walker) ->
  tab = output.indentStr or '  '
  input = output.original

  # Remove a range of nodes.
  removeNodes = (nodes, parent, ref, i, n) ->
    n = Math.min i + n, nodes.length
    while true
      node = nodes[i]
      if !node.stale
        node.parent = parent; node.ref = ref
        output.remove ...greedyRange(input, node, i)
        walker.drop node
      return if ++i is n

  nebu: require '.'

  isLiteral: isLiteral

  toString: ->
    stripIndent input.slice(@start, @end), tab

  walk: (prop, iter = noop) ->
    if !val = @[prop]
      return this

    if Array.isArray val
      val.forEach (val, i) =>
        val.parent = this; val.ref = prop
        iter val, i

    else if typeof val.type is 'string'
      val.parent = this; val.ref = prop
      iter val

    return this

  yield: (resume) ->
    if @yields
    then @yields.push resume
    else @yields = [resume]
    return this

  update: (prop, code) ->
    if !val = @[prop]
      return this

    if Array.isArray val
      return @splice prop, 0, Infinity, code

    if val.type is 'BlockStatement'
      val.parent = this; val.ref = prop
      return val.splice 'body', 0, Infinity, code

    if typeof val.type is 'string'
      output.overwrite val.start, val.end, code
      walker.drop val
    return this

  push: (prop, code) ->
    arr = getArray this, prop

    if node = arr[arr.length - 1]
      node.after code
      return this

    node = arr is @[prop] and this or @[prop]
    output.appendRight node.start + 1, code
    return this

  unshift: (prop, code) ->
    arr = getArray this, prop

    if node = arr[0]
      node.before code
      return this

    node = arr is @[prop] and this or @[prop]
    output.appendLeft node.start + 1, code
    return this

  splice: (prop, i, n, code) ->
    arr = getArray this, prop
    len = arr.length

    if i < 0
      i = i % (len + 1) + len

    else if i >= len
      return this if !code
      return @push prop, code

    if n > 0
      if arr isnt val = @[prop]
        val.parent = this; val.ref = prop
        removeNodes val.body, val, 'body', i, n
      else removeNodes val, this, prop, i, n

    if code
      if i isnt 0
        output.appendLeft arr[i - 1].end, code
        return this

      if @type is 'BlockStatement'
        @depth ?= parseDepth this, tab, input
        code = indent '\n' + code, tab, @depth
      return @unshift prop, code
    return this

  before: (code) ->
    @depth ?= parseDepth this, tab, input
    output.prependLeft @start, indent(code, tab, @depth)
    return this

  after: (code) ->
    @depth ?= parseDepth this, tab, input
    output.appendRight @end, indent(code, tab, @depth)
    return this

  indent: (depth = 1) ->
    [start, end] = greedyRange input, this
    prefix = tab.repeat depth
    i = start - 1; while true
      i = input.indexOf '\n', i + 1
      break if i is -1 or i >= end
      output.appendLeft i + 1, prefix
    return this

  dedent: (depth = 1) ->
    @depth ?= parseDepth this, tab, input
    depth = @depth if depth > @depth
    if depth is 0
      return this

    [start, end] = greedyRange input, this
    width = tab.length * depth
    i = start - 1; while true
      i = input.indexOf '\n', i + 1
      break if i is -1 or i >= end
      output.remove i, i + width
    return this

  replace: (code) ->
    output.overwrite @start, @end, code
    walker.drop this
    return this

  remove: (prop) ->
    if @stale
      return this

    if !prop
      output.remove ...greedyRange(input, this)
      walker.drop this
      return this

    if !val = @[prop]
      return this

    if Array.isArray val
      removeNodes val, this, prop, 0, Infinity

    else if val.type is 'BlockStatement'
      val.parent = this; val.ref = prop
      removeNodes val.body, val, 'body', 0, Infinity

    else if typeof val.type is 'string'
      output.remove val.start, val.end
      walker.drop val

    return this

# mixin stack (for nested transforms)
stack = []

exports.apply = (mixin) ->
  prev = {}
  for key of mixin
    prev[key] = pt[key]
    pt[key] = mixin[key]
  stack.push prev
  return

exports.remove = (mixin) ->
  prev = stack.pop()
  if prev
    for key of prev
      pt[key] = prev[key]
    return
  for key of mixin
    delete pt[key]
  return

getArray = (node, prop) ->
  if val = node[prop]
    return val if Array.isArray val
    return val.body if val.type is 'BlockStatement'
  throw Error "'#{prop}' is not an array or BlockStatement"
