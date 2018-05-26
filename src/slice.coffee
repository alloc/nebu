MagicString = require 'magic-string'

def = Object.defineProperty
props =
  original: {get: -> @source.original}

class MagicSlice
  constructor: (source, start, length) ->
    @source = source
    @start = start
    @end = start + length
    @indentStr = source.indentStr
    def this, 'original', props.original

  append: (content) ->
    @source.appendRight @end, content
    return this

  appendLeft: (index, content) ->
    @source.appendLeft @start + index, content
    return this

  appendRight: (index, content) ->
    @source.appendRight @start + index, content
    return this

  move: (start, end, index) ->
    @source.move @start + start, @start + end, index
    return this

  overwrite: (start, end, content, opts) ->
    @source.overwrite @start + start, @start + end, content, opts
    return this

  prepend: (content) ->
    @source.prependLeft @start, content
    return this

  prependLeft: (index, content) ->
    @source.prependLeft @start + index, content
    return this

  prependRight: (index, content) ->
    @source.prependRight @start + index, content
    return this

  remove: (start, end) ->
    @source.remove @start + start, @start + end
    return this

  addSourcemapLocation: (index) ->
    @source.addSourcemapLocation @start + index

module.exports = MagicSlice
