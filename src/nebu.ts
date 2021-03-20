import { Lookup } from '@alloc/types'
import MagicString, { SourceMap } from 'magic-string'
import { relative, dirname } from 'path'
import { ESTree, Plugin, PluginOption } from './types'
import { popContext, pushContext } from './context'
import { mergePlugins } from './utils'
import { Walker } from './Walker'
import { Node } from './Node'

export { Node, Plugin }

export interface NebuOptions<State = Lookup> {
  ast?: ESTree.Program
  jsx?: boolean
  state?: State
  plugins: PluginOption<State>[]
  sourceMap?: boolean | 'inline'
  sourceMapTarget?: string
  includeContent?: boolean
  generatedFile?: string
  filename?: string
}

export interface NebuResult {
  js: string
  map?: SourceMap
}

export const nebu = {
  process(input: string, opts: NebuOptions): NebuResult {
    const plugins = mergePlugins(opts.plugins)
    if (!Object.keys(plugins).length) {
      return { js: input }
    }

    const program = new Node(
      opts.ast ||
        require('meriyah').parse(input, {
          ranges: true,
          module: true,
          jsx: opts.jsx,
        })
    )

    const output = new MagicString(input)
    const walker = new Walker(opts.state || {}, plugins)

    program.depth = 0
    pushContext(output, walker)
    walker.walk(program)
    popContext()

    if (!opts.sourceMap)
      return {
        js: output.toString(),
      }

    const res = {
      js: output.toString(),
      map: output.generateMap({
        file: opts.generatedFile,
        source: opts.filename,
        includeContent: opts.includeContent !== false,
      }),
    }

    let mapURL: string | undefined
    if (opts.sourceMap == 'inline') {
      mapURL = res.map.toUrl()
    } else if (opts.filename && opts.sourceMapTarget) {
      mapURL = relative(dirname(opts.filename), opts.sourceMapTarget)
    }

    if (mapURL) {
      res.js += '\n//# sourceMappingURL=' + mapURL
    }

    return res
  },
}

declare global {
  interface NodeRequire {
    (name: 'meriyah'): typeof import('meriyah')
  }
}
