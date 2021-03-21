export const Parameter = [
  'ArrayPattern',
  'AssignmentPattern',
  'Identifier',
  'ObjectPattern',
  'RestElement',
] as const

export const ExportDeclaration = [
  'ClassDeclaration',
  'ClassExpression',
  'FunctionDeclaration',
  'VariableDeclaration',
] as const

export const LiteralExpression = [
  'Literal',
  'TemplateLiteral', //
] as const

export const PrimaryExpression = [
  'ArrayExpression',
  'ArrayPattern',
  'ClassExpression',
  'FunctionExpression',
  'Identifier',
  'Import',
  'JSXElement',
  'JSXFragment',
  'JSXOpeningElement',
  ...LiteralExpression,
  'MetaProperty',
  'ObjectExpression',
  'ObjectPattern',
  'Super',
  'ThisExpression',
] as const

export const LeftHandSideExpression = [
  'CallExpression',
  'ChainExpression',
  'ClassExpression',
  'ClassDeclaration',
  'FunctionExpression',
  'ImportExpression',
  'MemberExpression',
  ...PrimaryExpression,
  'TaggedTemplateExpression',
] as const

export const Expression = [
  'ArrowFunctionExpression',
  'AssignmentExpression',
  'AwaitExpression',
  'BinaryExpression',
  'ConditionalExpression',
  'JSXClosingElement',
  'JSXClosingFragment',
  'JSXExpressionContainer',
  'JSXOpeningElement',
  'JSXOpeningFragment',
  'JSXSpreadChild',
  ...LeftHandSideExpression,
  'LogicalExpression',
  'MetaProperty',
  'NewExpression',
  'RestElement',
  'SequenceExpression',
  'SpreadElement',
  'UnaryExpression',
  'UpdateExpression',
  'YieldExpression',
] as const

export const DeclarationStatement = [
  'ClassDeclaration',
  'ClassExpression',
  'ExportDefaultDeclaration',
  'ExportAllDeclaration',
  'ExportNamedDeclaration',
  'FunctionDeclaration',
] as const

export const IterationStatement = [
  'DoWhileStatement',
  'ForInStatement',
  'ForOfStatement',
  'ForStatement',
  'WhileStatement',
] as const

export const Statement = [
  'BlockStatement',
  'BreakStatement',
  'ContinueStatement',
  'DebuggerStatement',
  ...DeclarationStatement,
  'EmptyStatement',
  'ExpressionStatement',
  'IfStatement',
  ...IterationStatement,
  'ImportDeclaration',
  'LabeledStatement',
  'ReturnStatement',
  'SwitchStatement',
  'ThrowStatement',
  'TryStatement',
  'VariableDeclaration',
  'WithStatement',
] as const
