import type { Falsy, Lookup } from '@alloc/types'
import type { ESTree } from 'meriyah'
import type { Node } from './Node'
import type { StaticTypeGuards, TypeGuards, TypeLookup } from './typeGuards'

export type { ESTree }

export interface ESNode extends ESTree._Node {
  type: string
}

export type NodeProp<T extends ESNode> = string &
  (Exclude<keyof T, keyof ESNode> extends infer P
    ? [P] extends [never]
      ? unknown // coerce "never" to "unknown"
      : P
    : never)

export type NodeProps<T extends ESNode> = {
  [P in NodeProp<T> & keyof T]: Nebufy<T[P]>
}

// Convert property into Nebu type.
type Nebufy<T, U = T> = U extends ESNode
  ? ResolveNodeType<Extract<T, ESNode>['type']>
  : U extends ReadonlyArray<infer Element>
  ? ReadonlyArray<Nebufy<Element>>
  : U

export type CompositeNode<T> = T extends ESTree.Node
  ? ResolveNodeType<T['type']>
  : never

export interface NodeConstructor extends StaticTypeGuards {
  new <T extends ESNode>(node: T, parent?: Node, ref?: string): Node<T>

  isNode(arg: any): arg is Node
  isDeclarationStatement(arg: any): arg is Node.DeclarationStatement
  isExportDeclaration(arg: any): arg is Node.ExportDeclaration
  isExpression(arg: any): arg is Node.Expression
  isIterationStatement(arg: any): arg is Node.IterationStatement
  isLeftHandSideExpression(arg: any): arg is Node.LeftHandSideExpression
  isLiteralExpression(arg: any): arg is Node.LiteralExpression
  isParameter(arg: any): arg is Node.Parameter
  isPrimaryExpression(arg: any): arg is Node.PrimaryExpression
  isStatement(arg: any): arg is Node.Statement
}

declare module './Node' {
  export namespace Node {
    type LiteralValue = string | number | boolean | null | RegExp | bigint

    export interface Literal<T extends LiteralValue = LiteralValue>
      extends Node<ESTree.Literal> {
      value: T
    }
    export interface RegExpLiteral extends Node<ESTree.RegExpLiteral> {
      value: RegExp
    }
    export interface BigIntLiteral extends Node<ESTree.BigIntLiteral> {
      value: bigint
    }

    // Fix "any" type of callee in meriyah.
    export interface CallExpression {
      callee: Node.Expression | Node.Super
    }

    export type DeclarationStatement = CompositeNode<ESTree.DeclarationStatement>
    export type ExportDeclaration = CompositeNode<ESTree.ExportDeclaration>
    export type Expression = CompositeNode<ESTree.Expression>
    export type IterationStatement = CompositeNode<ESTree.IterationStatement>
    export type LeftHandSideExpression = CompositeNode<ESTree.LeftHandSideExpression>
    export type LiteralExpression = CompositeNode<ESTree.LiteralExpression>
    export type Parameter = CompositeNode<ESTree.Parameter>
    export type PrimaryExpression = CompositeNode<ESTree.PrimaryExpression>
    export type Statement = CompositeNode<ESTree.Statement>
  }
  export interface NebuNode extends TypeGuards {}
  export interface NebuNode {
    isLiteral(type: 'string'): this is Node.Literal<string>
    isLiteral(type: 'number'): this is Node.Literal<number>
    isLiteral(type: 'boolean'): this is Node.Literal<boolean>
    isLiteral(type: 'null'): this is Node.Literal<null>
    isLiteral(type: 'RegExp'): this is Node.RegExpLiteral
    isLiteral(type: 'bigint'): this is Node.BigIntLiteral
    isLiteral(): this is Node.Literal
  }
}

export type PluginOption<
  State = Lookup,
  T extends { type: string } = AnyNode
> = { default: Plugin<State, T> } | Plugin<State, T> | Falsy

export type AnyNode = TypeLookup[keyof TypeLookup]

export type Plugin<State = Lookup, T extends { type: string } = AnyNode> = {
  [P in T['type']]?: Visitor<State, Extract<T, { type: P }>>
}

export interface Visitor<State = Lookup, T extends { type: string } = AnyNode> {
  (node: T, state: State): void
}

export type VisitorMap<
  State = Lookup,
  T extends { type: string } = AnyNode
> = Map<string, readonly Visitor<State, T>[]>

export type NodeType = ESTree.Node['type']
export type ResolveNodeType<T extends string> = unknown &
  TypeLookup[T & keyof TypeLookup]

// All possible properties of a node.
export type AllNodeProps = ESTree.Node extends infer T
  ? T extends infer Node
    ? Exclude<keyof Node, 'type' | keyof ESTree._Node>
    : never
  : never

// Find the node types with a specific property.
export type FindNode<P extends string> = ESTree.Node extends infer T
  ? T extends { [K in P]: any } & { type: string }
    ? TypeLookup[T['type']]
    : never
  : never

export type Singular<T> = T extends ReadonlyArray<infer U>
  ? U
  : Exclude<T, void>

export type ArrayProp<
  T extends ESNode,
  P extends NodeProp<T> & keyof T
> = ReadonlyArray<
  Nebufy<
    T[P] extends infer U
      ? U extends ReadonlyArray<any>
        ? U[number]
        : U extends Node.BlockStatement
        ? Node.BlockStatement['body'][number]
        : U
      : never
  >
>
