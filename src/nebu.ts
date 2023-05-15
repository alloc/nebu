import { Lookup } from '@alloc/types'
import MagicString, { SourceMap } from 'magic-string'
import { dirname, relative } from 'path'
import { Node } from './Node'
import { Walker } from './Walker'
import { popContext, pushContext } from './context'
import { ESTree, Plugin, PluginOption } from './types'
import { mergePlugins } from './utils'
import { SyntaxHooksVisitor } from './hooks'

export type { PluginOption, Visitor, AnyNode } from './types'
export { Node, Plugin }

export interface NebuOptions<State = Lookup> {
  ast?: ESTree.Program
  jsx?: boolean
  state?: State
  hooks?: SyntaxHooksVisitor
  plugins: PluginOption<State>[]
  sourceMap?: boolean | 'inline'
  sourceMapHiRes?: boolean
  sourceMapTarget?: string
  includeContent?: boolean
  generatedFile?: string
  filename?: string
}

export interface NebuResult {
  js: string
  map?: SourceMap
}

interface Nebu {
  process<State extends object>(
    input: string,
    plugin: Plugin<State> | PluginOption<State>[]
  ): NebuResult
  process<State extends object>(
    input: string,
    opts: NebuOptions<State>
  ): NebuResult
  process(input: string, plugin: Plugin | PluginOption[]): NebuResult
  process(input: string, opts: NebuOptions): NebuResult

  /**
   * This method is useful for collecting ESTree nodes before you make
   * any changes with `nebu.process`. When you separate the collection
   * and mutation phases, you're able to *asynchronously* generate
   * metadata needed to inform how you'll mutate the AST.
   */
  walk(
    rootNode: ESTree.Node,
    plugins: Plugin<void, ESTree.Node> | Plugin<void, ESTree.Node>[]
  ): void
}

export const nebu: Nebu = {
  process(
    input: string,
    opts: NebuOptions<any> | Plugin<any> | PluginOption<any>[]
  ): NebuResult {
    if (Array.isArray(opts)) {
      opts = { plugins: opts }
    } else if (!('plugins' in opts)) {
      opts = { plugins: [opts] }
    }

    const visitors = mergePlugins(opts.plugins)
    if (!visitors.size) {
      return { js: input }
    }

    const program = new Node(
      opts.ast ||
        require('meriyah').parse(input, {
          next: true,
          ranges: true,
          module: true,
          jsx: opts.jsx,
        })
    )

    const output = new MagicString(input)
    const walker = new Walker<any, Node>(opts.state || {}, visitors as any)

    program.depth = 0
    pushContext(output, walker, opts.hooks)
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
        hires: opts.sourceMapHiRes,
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
  walk(rootNode, plugins) {
    const visitors = mergePlugins(Array.isArray(plugins) ? plugins : [plugins])
    if (visitors.size) {
      const walker = new Walker(undefined, visitors)
      walker.walk(rootNode)
    }
  },
}

declare global {
  interface NodeRequire {
    (name: 'meriyah'): typeof import('meriyah')
  }
}
