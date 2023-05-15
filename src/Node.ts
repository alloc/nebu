import { Any } from '@alloc/types'
import {
  isArray,
  isString,
  isNumber,
  isBoolean,
  isRegExp,
  isBigint,
  isNull,
} from '@alloc/is'
import { KEYS } from 'eslint-visitor-keys'
import {
  ESNode,
  NodeConstructor,
  ResolveNodeType,
  NodeProp,
  NodeProps,
  NodeType,
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
  Parameter,
  PrimaryExpression,
  Statement,
} from './composite'
import {
  findParent,
  getArray,
  indent,
  mergePlugins,
  noop,
  parseDepth,
  stripIndent,
} from './utils'
import { Walker } from './Walker'
import { MagicSlice, toRelativeIndex } from './MagicSlice'
import { NodeProperties } from './NodeProperties'
import { getContext, popContext, pushContext } from './context'
import { greedyRange } from './utils/greedyRange'

const literalTypes = {
  string: isString,
  number: isNumber,
  boolean: isBoolean,
  null: isNull,
  RegExp: isRegExp,
  bigint: isBigint,
}

export class NebuNode<T extends ESNode = any> {
  /** The node type. */
  readonly type: [T] extends [Any] ? NodeType : Extract<T['type'], NodeType>
  /** The character index where this node starts. */
  readonly start: number
  /** The character index where this node ends. */
  readonly end: number
  /** When true, this node will not exist in the output. */
  removed!: boolean
  /** The node that contains this node. */
  parent: Node
  /** The key on `parent` that references this node. */
  ref: string
  /** @internal */
  yields?: (() => void)[]
  /** @internal */
  depth?: number

  constructor(node: T, parent?: Node, ref?: string) {
    this.type = node.type as any
    this.start = node.start!
    this.end = node.end!
    this.parent = parent!
    this.ref = ref!

    Object.defineProperty(this, 'n', {
      value: node,
    })
  }

  toString() {
    const { input, tab } = getContext()
    return stripIndent(input.slice(this.start, this.end), tab)
  }

  toJSON() {
    return Reflect.get(this, 'n')
  }

  process(plugin: Plugin): void
  process(plugins: readonly Plugin[]): void
  process<State>(state: State, plugins: readonly Plugin<State>[]): void
  process(state: any, plugins?: readonly Plugin[]) {
    if (!plugins) {
      plugins = isArray(state) ? state : [state]
      state = null
    }
    if (!this.removed) {
      const { output } = getContext()
      const slice = new MagicSlice(output, this.start, this.end)
      const visitors = mergePlugins(plugins)
      const walker = new Walker<any, Node>(state, visitors as any)
      pushContext(slice, walker)
      walker.walk(this)
      popContext()
    }
  }

  walk<P extends NodeProp<T> & Exclude<keyof T, keyof ESNode>>(
    prop: P,
    iter: (node: Singular<NodeProps<T>[P]>, i: number) => void
  ): void

  walk<P extends Exclude<keyof this, keyof Node | ESNode>>(
    prop: P,
    iter: (node: Singular<this[P]>, i: number) => void
  ): void

  walk(prop: keyof this, iter: (node: any, i: number) => void = noop) {
    const val: any = this[prop]
    if (val == null) {
      return
    }

    if (isArray(val)) {
      val.forEach(iter)
    } else if (val.type) {
      iter(val, 0)
    }
  }

  yield(resume: () => void) {
    if (this.yields) {
      this.yields.push(resume)
    } else {
      this.yields = [resume]
    }
  }

  findParent(match: (node: Node) => boolean): Node | null
  findParent<T extends NodeType>(match: T): ResolveNodeType<T> | null
  findParent(match: NodeType | ((node: Node) => boolean)) {
    return findParent(this, match)
  }

  set(prop: NodeProp<T>, code: string) {
    const val: any = this[prop as keyof this]
    if (val == null) {
      return
    }

    if (isArray(val)) {
      return this.splice(prop, 0, Infinity, code)
    }

    if (Node.isBlockStatement(val)) {
      return val.splice('body', 0, Infinity, code)
    }

    if (Node.isNode(val)) {
      const { output, walker } = getContext()
      output.overwrite(
        toRelativeIndex(output, val.start),
        toRelativeIndex(output, val.end),
        code
      )
      walker.drop(val)
    }
  }

  push(prop: NodeProp<T>, code: string) {
    const { applyHook, output } = getContext()
    const arr = getArray(this, prop)

    if (!arr.length && applyHook('pushFirst', this, prop, code)) {
      return
    }

    let node = arr[arr.length - 1]
    if (Node.isNode(node)) {
      node.after(code)
    } else {
      // By default, if the array property is empty, we assume this node
      // has braces and append the code after the opening brace.
      const val: any = this[prop as keyof this]
      node = arr === val ? this : val
      if (Node.isNode(node)) {
        output.appendRight(toRelativeIndex(output, node.start) + 1, code)
      }
    }
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
        output.appendLeft(toRelativeIndex(output, node.start) + 1, code)
      }
    }
  }

  splice(prop: NodeProp<T>, i: number, n: number, code: string) {
    const arr = getArray(this, prop)
    const len = arr.length

    if (i < 0) {
      i = (i % (len + 1)) + len
    } else if (i >= len) {
      if (code) this.push(prop, code)
      return
    }

    const { input, output, tab, removeNodes } = getContext()
    if (n > 0) {
      const val: any = this[prop as keyof this]
      if (arr !== val) {
        removeNodes(val.body, val, 'body', i, n)
      } else {
        removeNodes(val, this, prop, i, n)
      }
    }

    if (code) {
      if (i !== 0) {
        output.appendLeft(toRelativeIndex(output, arr[i - 1].end), code)
      } else {
        if (Node.isBlockStatement(this)) {
          this.depth ??= parseDepth(this, tab, input)
          code = indent('\n' + code, tab, this.depth)
        }
        this.unshift(prop, code)
      }
    }
  }

  before(code: string, index = this.start) {
    const { input, output, tab } = getContext()
    this.depth ??= parseDepth(this, tab, input)
    index = toRelativeIndex(output, index)
    if (code.endsWith('\n')) {
      // Use appendLeft to avoid removing this code if this node is
      // later removed.
      output.appendLeft(index, indent(code, tab, this.depth))
      return
    }
    // By using prependRight, this code will be removed if this node is
    // later removed. After this method returns, appendRight on the same
    // index will insert after this code, but before this node.
    output.prependRight(index, indent(code, tab, this.depth))
  }

  after(code: string, index = this.end) {
    const { input, output, tab } = getContext()
    this.depth ??= parseDepth(this, tab, input)
    index = toRelativeIndex(output, index)
    if (code.startsWith('\n')) {
      // Use prependRight to avoid removing this code if this node is
      // later removed.
      output.prependRight(index, indent(code, tab, this.depth))
      return
    }
    // By using appendLeft, this code will be removed if this node is
    // later removed. After this method returns, prependLeft on the same
    // index will insert before this code, but after this node.
    output.appendLeft(index, indent(code, tab, this.depth))
  }

  indent(depth = 1) {
    const { input, output, tab } = getContext()
    const [start, end] = Array.from(greedyRange(output, this))
    const prefix = tab.repeat(depth)
    let i = start - 1
    while (true) {
      i = input.indexOf('\n', i + 1)
      if (i === -1 || i >= end) {
        break
      }
      output.appendLeft(i + 1, prefix)
    }
  }

  dedent(depth = 1) {
    const { input, output, tab } = getContext()
    this.depth ??= parseDepth(this, tab, input)
    depth = Math.min(depth, this.depth)
    if (depth <= 0) {
      return
    }
    const [start, end] = Array.from(greedyRange(output, this))
    const width = tab.length * depth
    let i = start - 1
    while (true) {
      i = input.indexOf('\n', i + 1)
      if (i === -1 || i >= end) {
        break
      }
      output.remove(i, i + width)
    }
  }

  replace(code: string) {
    const { output, walker } = getContext()
    output.overwrite(
      toRelativeIndex(output, this.start),
      toRelativeIndex(output, this.end),
      code
    )
    walker.drop(this)
  }

  remove(prop?: NodeProp<T>) {
    if (this.removed) {
      return
    }

    const { output, walker, removeNodes } = getContext()
    if (!prop) {
      output.remove(...greedyRange(output, this))
      walker.drop(this)
      return
    }

    const val: any = this[prop as keyof this]
    if (val == null) {
      return
    }

    if (isArray(val)) {
      removeNodes(val, this, prop, 0, Infinity)
    } else if (val.type === 'BlockStatement') {
      removeNodes(val.body, val, 'body', 0, Infinity)
    } else if (typeof val.type === 'string') {
      output.remove(
        toRelativeIndex(output, val.start),
        toRelativeIndex(output, val.end)
      )
      walker.drop(val)
    }
  }

  isLiteral(
    type?: 'string' | 'number' | 'boolean' | 'null' | 'RegExp' | 'bigint'
  ): this is Node.Literal {
    return (
      this.type === 'Literal' &&
      (type == null || literalTypes[type]((this as any).value))
    )
  }
  isDeclarationStatement(): this is Node.DeclarationStatement {
    return Node.isDeclarationStatement(this)
  }
  isExportDeclaration(): this is Node.ExportDeclaration {
    return Node.isExportDeclaration(this)
  }
  isExpression(): this is Node.Expression {
    return Node.isExpression(this)
  }
  isIterationStatement(): this is Node.IterationStatement {
    return Node.isIterationStatement(this)
  }
  isLeftHandSideExpression(): this is Node.LeftHandSideExpression {
    return Node.isLeftHandSideExpression(this)
  }
  isLiteralExpression(): this is Node.LiteralExpression {
    return Node.isLiteralExpression(this)
  }
  isParameter(): this is Node.Parameter {
    return Node.isParameter(this)
  }
  isPrimaryExpression(): this is Node.PrimaryExpression {
    return Node.isPrimaryExpression(this)
  }
  isStatement(): this is Node.Statement {
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
  static isParameter(arg: any) {
    return Boolean(arg) && Parameter.includes(arg.type)
  }
  static isPrimaryExpression(arg: any) {
    return Boolean(arg) && PrimaryExpression.includes(arg.type)
  }
  static isStatement(arg: any) {
    return Boolean(arg) && Statement.includes(arg.type)
  }
}

export interface NebuNode<T extends ESNode> {
  /** The underlying ESTree node. */
  readonly n: T
}

export type Node<T extends ESNode = any> = [T] extends [Any]
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
