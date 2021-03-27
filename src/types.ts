import type { Lookup } from '@alloc/types'
import type { ESTree } from 'meriyah'
import type { StaticTypeGuards, TypeGuards, TypeLookup } from './typeGuards'
import type { Node } from './Node'

export type { ESTree }

export type NodeProp<T extends ESTree.Node> = string &
  (Exclude<keyof T, 'type' | keyof ESTree._Node> extends infer P
    ? [P] extends [never]
      ? unknown // coerce "never" to "unknown"
      : P
    : never)

export type NodeProps<T extends ESTree.Node> = {
  [P in NodeProp<T> & keyof T]: Nebufy<T[P]>
}

// Convert property into Nebu type.
type Nebufy<T, U = T> = U extends ESTree.Node
  ? Node<Extract<T, ESTree.Node>>
  : U extends ReadonlyArray<infer Element>
  ? ReadonlyArray<Nebufy<Element>>
  : U

export interface NodeConstructor extends StaticTypeGuards {
  new <T extends ESTree.Node>(node: T, parent?: Node, ref?: string): Node<T>

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

    export interface DeclarationStatement
      extends Node<ESTree.DeclarationStatement> {}
    export interface ExportDeclaration extends Node<ESTree.ExportDeclaration> {}
    export interface Expression extends Node<ESTree.Expression> {}
    export interface IterationStatement
      extends Node<ESTree.IterationStatement> {}
    export interface LeftHandSideExpression
      extends Node<ESTree.LeftHandSideExpression> {}
    export interface LiteralExpression extends Node<ESTree.LiteralExpression> {}
    export interface Parameter extends Node<ESTree.Parameter> {}
    export interface PrimaryExpression extends Node<ESTree.PrimaryExpression> {}
    export interface Statement extends Node<ESTree.Statement> {}
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

export type PluginMap<State = Lookup> = {
  [P in NodeType]?: P extends keyof TypeLookup
    ? readonly Visitor<TypeLookup[P], State>[]
    : never
}

type Falsy = false | null | undefined

export type PluginOption<State = Lookup> =
  | { default: Plugin<State> }
  | Plugin<State>
  | Falsy

export type Plugin<State = Lookup> = {
  [P in NodeType]?: P extends keyof TypeLookup
    ? Visitor<TypeLookup[P], State>
    : never
}

export interface Visitor<T = any, State = Lookup> {
  (node: T, state: State): void
}

export type NodeType = ESTree.Node['type']
export type ResolveNodeType<T extends NodeType> = unknown &
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
  T extends ESTree.Node,
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
