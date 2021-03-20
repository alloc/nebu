import { Any } from '@alloc/types'
import { is } from '@alloc/is'
import { KEYS } from 'eslint-visitor-keys'
import {
  ESTree,
  NodeConstructor,
  NodeProp,
  NodeProps,
  Plugin,
  Singular,
} from './types'
import {
  DeclarationStatement,
  ExportDeclaration,
  Expression,
  IterationStatement,
  LeftHandSideExpression,
  LiteralExpression,
  PrimaryExpression,
  Statement,
} from './composite'
import {
  getArray,
  greedyRange,
  indent,
  mergePlugins,
  noop,
  parseDepth,
  stripIndent,
} from './utils'
import { Walker } from './Walker'
import { MagicSlice } from './MagicSlice'
import { NodeProperties } from './NodeProperties'
import { getContext, popContext, pushContext } from './context'
import './types'

export class NebuNode<T extends ESTree.Node = ESTree.Node> {
  /** The node type. */
  readonly type: T['type']
  /** The character index where this node starts. */
  readonly start: number
  /** The character index where this node ends. */
  readonly end: number
  /** When true, this node will not exist in the output. */
  removed!: boolean
  /** The node that contains this node. */
  parent!: Node
  /** The key on `parent` that references this node. */
  ref!: string
  /** @internal */
  yields?: (() => void)[]
  /** @internal */
  depth?: number

  constructor(node: T) {
    this.type = node.type
    this.start = node.start!
    this.end = node.end!

    Object.defineProperty(this, 'n', {
      value: node,
    })
  }

  toString() {
    const { input, tab } = getContext()
    return stripIndent(input.slice(this.start, this.end), tab)
  }

  process(plugins: readonly Plugin[]): this
  process<State>(state: State, plugins: readonly Plugin<State>[]): this
  process(state: any, plugins?: readonly Plugin[]) {
    if (is.array(state)) {
      plugins = state
      state = null
    }
    if (!is.array(plugins)) {
      throw TypeError('"plugins" must be an array')
    }
    if (!this.removed) {
      const { output } = getContext()
      const slice = new MagicSlice(output, this.start, this.end)
      const walker = new Walker(state, mergePlugins(plugins))
      pushContext(slice, walker)
      walker.walk(this)
      popContext()
    }
    return this
  }

  walk<P extends NodeProp<T>>(
    prop: P,
    iter: (node: Singular<NodeProps<T>[P]>, i: number) => void = noop
  ) {
    const val: any = this[prop as keyof this]
    if (val == null) {
      return this
    }

    if (Array.isArray(val)) {
      val.forEach((val, i) => {
        val.parent = this
        val.ref = prop
        iter(val, i)
      })
    } else if (typeof val.type === 'string') {
      val.parent = this
      val.ref = prop
      iter(val, 0)
    }

    return this
  }

  yield(resume: () => void) {
    if (this.yields) {
      this.yields.push(resume)
    } else {
      this.yields = [resume]
    }
    return this
  }

  set(prop: NodeProp<T>, code: string) {
    const val: any = this[prop as keyof this]
    if (val == null) {
      return this
    }

    if (is.array(val)) {
      return this.splice(prop, 0, Infinity, code)
    }

    if (Node.isBlockStatement(val)) {
      val.parent = this
      val.ref = prop
      return val.splice('body', 0, Infinity, code)
    }

    if (Node.isNode(val)) {
      const { output, walker } = getContext()
      output.overwrite(val.start, val.end, code)
      walker.drop(val)
    }

    return this
  }

  push(prop: NodeProp<T>, code: string) {
    const arr = getArray(this, prop)

    let node = arr[arr.length - 1]
    if (Node.isNode(node)) {
      node.after(code)
    } else {
      const val: any = this[prop as keyof this]
      node = arr === val ? this : val
      if (Node.isNode(node)) {
        const { output } = getContext()
        output.appendRight(node.start + 1, code)
      }
    }

    return this
  }

  unshift(prop: NodeProp<T>, code: string) {
    const arr = getArray(this, prop)

    let node = arr[0]
    if (Node.isNode(node)) {
      node.before(code)
    } else {
      const val: any = this[prop as keyof this]
      node = arr === val ? this : val
      if (Node.isNode(node)) {
        const { output } = getContext()
        output.appendLeft(node.start + 1, code)
      }
    }

    return this
  }

  splice(prop: NodeProp<T>, i: number, n: number, code: string) {
    const arr = getArray(this, prop)
    const len = arr.length

    if (i < 0) {
      i = (i % (len + 1)) + len
    } else if (i >= len) {
      if (!code) {
        return this
      }
      return this.push(prop, code)
    }

    const { input, output, tab, removeNodes } = getContext()
    if (n > 0) {
      const val: any = this[prop as keyof this]
      if (arr !== val) {
        val.parent = this
        val.ref = prop
        removeNodes(val.body, val, 'body', i, n)
      } else {
        removeNodes(val, this, prop, i, n)
      }
    }

    if (code) {
      if (i !== 0) {
        output.appendLeft(arr[i - 1].end, code)
        return this
      }

      if (Node.isBlockStatement(this)) {
        this.depth ??= parseDepth(this, tab, input)
        code = indent('\n' + code, tab, this.depth)
      }
      return this.unshift(prop, code)
    }
    return this
  }

  before(code: string) {
    const { input, output, tab } = getContext()
    this.depth ??= parseDepth(this, tab, input)
    output.prependLeft(this.start, indent(code, tab, this.depth))
    return this
  }

  after(code: string) {
    const { input, output, tab } = getContext()
    this.depth ??= parseDepth(this, tab, input)
    output.appendRight(this.end, indent(code, tab, this.depth))
    return this
  }

  indent(depth = 1) {
    const { input, output, tab } = getContext()
    const [start, end] = Array.from(greedyRange(input, this))
    const prefix = tab.repeat(depth)
    let i = start - 1
    while (true) {
      i = input.indexOf('\n', i + 1)
      if (i === -1 || i >= end) {
        break
      }
      output.appendLeft(i + 1, prefix)
    }
    return this
  }

  dedent(depth = 1) {
    const { input, output, tab } = getContext()
    this.depth ??= parseDepth(this, tab, input)
    depth = Math.min(depth, this.depth)
    if (depth <= 0) {
      return this
    }
    const [start, end] = Array.from(greedyRange(input, this))
    const width = tab.length * depth
    let i = start - 1
    while (true) {
      i = input.indexOf('\n', i + 1)
      if (i === -1 || i >= end) {
        break
      }
      output.remove(i, i + width)
    }
    return this
  }

  replace(code: string) {
    const { output, walker } = getContext()
    output.overwrite(this.start, this.end, code)
    walker.drop(this)
    return this
  }

  remove(prop?: NodeProp<T>) {
    if (this.removed) {
      return this
    }

    const { input, output, walker, removeNodes } = getContext()
    if (!prop) {
      output.remove(...greedyRange(input, this))
      walker.drop(this)
      return this
    }

    const val: any = this[prop as keyof this]
    if (val == null) {
      return this
    }

    if (is.array(val)) {
      removeNodes(val, this, prop, 0, Infinity)
    } else if (val.type === 'BlockStatement') {
      val.parent = this
      val.ref = prop
      removeNodes(val.body, val, 'body', 0, Infinity)
    } else if (typeof val.type === 'string') {
      output.remove(val.start, val.end)
      walker.drop(val)
    }

    return this
  }

  isLiteral(type?: string) {
    return type == null
      ? this.type == 'Literal'
      : this.isLiteral() && type == is.what(this.value)
  }
  isDeclarationStatement() {
    return Node.isDeclarationStatement(this)
  }
  isExportDeclaration() {
    return Node.isExportDeclaration(this)
  }
  isExpression() {
    return Node.isExpression(this)
  }
  isIterationStatement() {
    return Node.isIterationStatement(this)
  }
  isLeftHandSideExpression() {
    return Node.isLeftHandSideExpression(this)
  }
  isLiteralExpression() {
    return Node.isLiteralExpression(this)
  }
  isPrimaryExpression() {
    return Node.isPrimaryExpression(this)
  }
  isStatement() {
    return Node.isStatement(this)
  }

  static isNode(arg: any) {
    return Boolean(arg && arg.type)
  }
  static isDeclarationStatement(arg: any) {
    return Boolean(arg) && DeclarationStatement.includes(arg.type)
  }
  static isExportDeclaration(arg: any) {
    return Boolean(arg) && ExportDeclaration.includes(arg.type)
  }
  static isExpression(arg: any) {
    return Boolean(arg) && Expression.includes(arg.type)
  }
  static isIterationStatement(arg: any) {
    return Boolean(arg) && IterationStatement.includes(arg.type)
  }
  static isLeftHandSideExpression(arg: any) {
    return Boolean(arg) && LeftHandSideExpression.includes(arg.type)
  }
  static isLiteralExpression(arg: any) {
    return Boolean(arg) && LiteralExpression.includes(arg.type)
  }
  static isPrimaryExpression(arg: any) {
    return Boolean(arg) && PrimaryExpression.includes(arg.type)
  }
  static isStatement(arg: any) {
    return Boolean(arg) && Statement.includes(arg.type)
  }
}

export type Node<T extends ESTree.Node = any> = [T] extends [Any]
  ? NebuNode
  : NebuNode<T> & NodeProps<T>

export const Node: NodeConstructor = NebuNode as any

// These properties are Nebu-specific.
Object.assign(Node.prototype, {
  type: undefined,
  start: undefined,
  end: undefined,
  removed: false,
  parent: undefined,
  ref: undefined,
  yields: undefined,
  depth: undefined,
})

// Forward all other properties to the ESTree node.
Object.setPrototypeOf(Node.prototype, NodeProperties)

for (const type in KEYS) {
  // Add type guards
  Object.defineProperty(Node.prototype, 'is' + type, {
    value: function (this: Node) {
      return this.type == type
    },
  })
  // Add static type guards
  Object.defineProperty(Node, 'is' + type, {
    value: function (arg: any) {
      return Boolean(arg) && arg.type == type
    },
  })
}
