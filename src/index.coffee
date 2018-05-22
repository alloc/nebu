{relative, dirname} = require 'path'
MagicString = require 'magic-string'
AcornMixin = require './mixin'
isObject = require 'is-object'
Walker = require './walker'
acorn = require 'acorn'

nebu = exports

nebu.process = (input, opts) ->

  if !opts.plugins or !opts.plugins.length
    throw Error 'Must provide at least one plugin'

  # Fast plugin search by node type
  plugins = mergeVisitors opts.plugins

  # Let caller pass their own AST
  ast = opts.ast or acorn.parse input, {
    ...opts.parser
    sourceType: 'module'
    ecmaVersion: 9
  }

  # Fast mutation with sourcemap support
  output = new MagicString input

  # Traversal controller
  walker = new Walker opts.state, plugins

  # Temporarily extend Node.prototype
  if !ast.nebu
    mixin = AcornMixin.create output, walker
    AcornMixin.apply mixin

  ast.depth = 0
  walker.walk ast

  if mixin
    AcornMixin.remove mixin

  if !opts.sourceMaps
    return output.toString()

  res =
    js: output.toString()
    map: output.generateMap
      includeContent: true
      sourceRoot: opts.sourceRoot
      source: opts.filename
      file: opts.sourceMapTarget

  mapURL =
    if opts.sourceMaps isnt true
      res.map.toUrl()
    else if opts.filename and opts.sourceMapTarget
      relative dirname(opts.filename), opts.sourceMapTarget

  if mapURL
    res.js += '\n//# sourceMappingURL=' + mapURL

  return res if opts.sourceMaps isnt 'inline'
  return res.js

mergeVisitors = (plugins) ->
  visitors = Object.create null
  for plugin in plugins
    if !isObject plugin
      throw Error 'Plugins must be objects'
    for type, visitor of plugin
      if arr = visitors[type]
      then arr.push visitor
      else visitors[type] = [visitor]
  return visitors
