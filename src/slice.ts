/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
const MagicString = require('magic-string')

const def = Object.defineProperty
const props = {
  original: {
    get() {
      return this.source.original
    },
  },
}

class MagicSlice {
  constructor(source, start, length) {
    this.source = source
    this.start = start
    this.end = start + length
    this.indentStr = source.indentStr
    def(this, 'original', props.original)
  }

  append(content) {
    this.source.appendRight(this.end, content)
    return this
  }

  appendLeft(index, content) {
    this.source.appendLeft(this.start + index, content)
    return this
  }

  appendRight(index, content) {
    this.source.appendRight(this.start + index, content)
    return this
  }

  move(start, end, index) {
    this.source.move(this.start + start, this.start + end, index)
    return this
  }

  overwrite(start, end, content, opts) {
    this.source.overwrite(this.start + start, this.start + end, content, opts)
    return this
  }

  prepend(content) {
    this.source.prependLeft(this.start, content)
    return this
  }

  prependLeft(index, content) {
    this.source.prependLeft(this.start + index, content)
    return this
  }

  prependRight(index, content) {
    this.source.prependRight(this.start + index, content)
    return this
  }

  remove(start, end) {
    this.source.remove(this.start + start, this.start + end)
    return this
  }

  addSourcemapLocation(index) {
    return this.source.addSourcemapLocation(this.start + index)
  }
}

exports.MagicSlice = MagicSlice
