props = require './props'

class Walker
  constructor: (state, plugins) ->
    @state = state or {}
    @plugins = plugins
    @stack = []
    @yielded = new Set

  # Depth-first traversal, parents first
  walk: (node, parent, ref) ->
    return if node.stale

    @stack.push node
    if parent
      node.parent = parent
      node.ref = ref

    if visitors = @plugins[node.type]
      for visitor in visitors
        visitor node, @state
        return if node.stale

    # Visit any children.
    @descend node

    if !node.stale
      node.yields?.forEach (resume) -> resume()

    @stack.pop()
    return

  # Traverse deeper.
  descend: (node) ->
    k = -1
    keys = props[node.type] or Object.keys node
    while ++k isnt keys.length
      if val = node[key = keys[k]]

        if typeof val.type is 'string'
          if val isnt node.parent
            @walk val, node, key
            return if node.stale

        else if Array.isArray val
          i = -1
          while ++i isnt val.length
            @walk val[i], node, key
            return if node.stale

  # Prevent traversal of a node and its descendants.
  drop: (node) ->
    {stack} = this

    i = stack.indexOf node
    if i is -1
      node.stale = true
      return

    {length} = stack
    while true
      stack[i].stale = true
      return if ++i is length

module.exports = Walker
