{relative, dirname} = require 'path'
MagicString = require 'magic-string'
AcornMixin = require './mixin'
isObject = require 'is-object'
Walker = require './walker'

nebu = exports

Object.defineProperty nebu, 'acorn',
  writable: true
  value: null

nebu.process = (input, opts) ->
  if !Array.isArray opts.plugins
    throw Error 'The `plugins` option must be an array'

  # Fast plugin search by node type
  if mergePlugins(plugins = {}, opts.plugins) is 0
    throw Error 'No plugins provided a visitor'

  # Ensure acorn is loaded.
  if !acorn = nebu.acorn
    nebu.acorn = acorn = require 'acorn'

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
  mixin = AcornMixin.init acorn, output, walker

  ast.depth = 0
  walker.walk ast
  AcornMixin.remove acorn, mixin

  if !opts.sourceMaps
    return output.toString()

  res =
    js: output.toString()
    map: output.generateMap
      file: opts.generatedFile
      source: opts.filename
      includeContent: opts.includeContent isnt false

  if res.map
    mapURL =
      if opts.sourceMaps isnt true
        res.map.toUrl()
      else if opts.filename and opts.sourceMapTarget
        relative dirname(opts.filename), opts.sourceMapTarget

    if mapURL
      res.js += '\n//# sourceMappingURL=' + mapURL

  return res if opts.sourceMaps isnt 'inline'
  return res.js

mergePlugins = (visitors, plugins) ->
  count = 0
  for plugin in plugins
    if Array.isArray plugin
      count += mergePlugins visitors, plugin
    else if isObject plugin
      for type, visitor of plugin
        count += 1
        if arr = visitors[type]
        then arr.push visitor
        else visitors[type] = [visitor]
  count
