{relative, dirname} = require 'path'
MagicString = require 'magic-string'
AcornMixin = require './mixin'
isObject = require 'is-object'
Walker = require './walker'
acorn = require 'acorn'

nebu = exports

nebu.parse = acorn.parse

nebu.process = (input, opts) ->
  if !Array.isArray opts.plugins
    throw Error 'The `plugins` option must be an array'

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
      source: opts.filename
      file: opts.generatedFile

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
  count = 0
  visitors = Object.create null
  for plugin in plugins
    if isObject plugin
      for type, visitor of plugin
        count += 1
        if arr = visitors[type]
        then arr.push visitor
        else visitors[type] = [visitor]
  if count is 0
    throw Error 'No plugins provided a visitor'
  visitors
