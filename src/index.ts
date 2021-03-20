/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import { relative, dirname } from 'path'
import { MagicString } from 'magic-string'
import { AcornMixin } from './mixin'
import * as isObject from 'is-object'
import { Walker } from './walker'

const nebu = {}
export { nebu }

Object.defineProperty(nebu, 'acorn', {
  writable: true,
  value: null,
})

nebu.process = function (input, opts) {
  let acorn, plugins
  if (!Array.isArray(opts.plugins)) {
    throw Error('The `plugins` option must be an array')
  }

  // Fast plugin search by node type
  if (mergePlugins((plugins = {}), opts.plugins) === 0) {
    throw Error('No plugins provided a visitor')
  }

  // Ensure acorn is loaded.
  if (!(acorn = nebu.acorn)) {
    nebu.acorn = acorn = require('acorn')
  }

  // Let caller pass their own AST
  const ast =
    opts.ast ||
    acorn.parse(input, {
      // ...opts.parser,
      sourceType: 'module',
      ecmaVersion: 9,
    })

  // Fast mutation with sourcemap support
  const output = new MagicString(input)

  // Traversal controller
  const walker = new Walker(opts.state, plugins)

  // Temporarily extend Node.prototype
  const mixin = AcornMixin.init(acorn, output, walker)

  ast.depth = 0
  walker.walk(ast)
  AcornMixin.remove(acorn, mixin)

  if (!opts.sourceMaps) {
    return output.toString()
  }

  const res = {
    js: output.toString(),
    map: output.generateMap({
      file: opts.generatedFile,
      source: opts.filename,
      includeContent: opts.includeContent !== false,
    }),
  }

  const mapURL = (() => {
    if (opts.sourceMaps !== true) {
      return res.map.toUrl()
    } else if (opts.filename && opts.sourceMapTarget) {
      return relative(dirname(opts.filename), opts.sourceMapTarget)
    }
  })()

  if (mapURL) {
    res.js += '\n//# sourceMappingURL=' + mapURL
  }

  if (opts.sourceMaps !== 'inline') {
    return res
  }
  return res.js
}

var mergePlugins = function (visitors, plugins) {
  let count = 0
  for (let plugin of Array.from(plugins)) {
    if (Array.isArray(plugin)) {
      count += mergePlugins(visitors, plugin)
    } else if (isObject(plugin)) {
      for (let type in plugin) {
        var arr
        const visitor = plugin[type]
        count += 1
        if ((arr = visitors[type])) {
          arr.push(visitor)
        } else {
          visitors[type] = [visitor]
        }
      }
    }
  }
  return count
}
