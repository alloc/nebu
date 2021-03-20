// Improve traversal speed of known nodes.
const props = {
  MemberExpression: ['object', 'property'],
  SequenceExpression: ['expressions'],
  TaggedTemplateExpression: ['tag', 'quasi'],
  ImportDeclaration: ['specifiers', 'source'],
  ImportSpecifier: ['imported', 'local'],
  VariableDeclaration: ['declarations'],
  VariableDeclarator: ['id', 'init'],
  ExportAllDeclaration: ['source'],
  ExportNamedDeclaration: ['declaration', 'specifiers'],
  ExportDefaultDeclaration: ['declaration'],
  ExportSpecifier: ['local', 'exported'],
  ForStatement: ['init', 'test', 'update', 'body'],
  TryStatement: ['block', 'handler', 'finalizer'],
  CatchClause: ['param', 'body'],
  WithStatement: ['object', 'body'],
  SwitchStatement: ['discriminant', 'cases'],
  LabeledStatement: ['label', 'body'],
  ExpressionStatement: ['expression'],
  SwitchCase: ['test', 'consequent'],
  TemplateLiteral: ['expressions', 'quasis'],
  ObjectPattern: ['properties'],
  MetaProperty: ['meta', 'property'],
}

props.Super = props.Literal = props.Identifier = props.EmptyStatement = props.ThisExpression = props.TemplateElement = []

props.ClassBody = props.BlockStatement = ['body']

props.BreakStatement = props.ContinueStatement = ['label']

props.ImportDefaultSpecifier = props.ImportNamespaceSpecifier = ['local']

props.ArrayPattern = props.ArrayExpression = ['elements']

props.RestElement = props.SpreadElement = props.ThrowStatement = props.AwaitExpression = props.ReturnStatement = props.UnaryExpression = props.YieldExpression = props.UpdateExpression = [
  'argument',
]

props.NewExpression = props.CallExpression = ['callee', 'arguments']

props.WhileStatement = props.DoWhileStatement = ['test', 'body']

props.Property = props.MethodDefinition = ['key', 'value']

props.BinaryExpression = props.AssignmentPattern = props.LogicalExpression = props.AssignmentExpression = [
  'left',
  'right',
]

props.ForInStatement = props.ForOfStatement = ['left', 'right', 'body']

props.FunctionExpression = props.FunctionDeclaration = props.ArrowFunctionExpression = [
  'id',
  'params',
  'body',
]

props.ClassExpression = props.ClassDeclaration = ['id', 'superClass', 'body']

props.IfStatement = props.ConditionalExpression = [
  'test',
  'consequent',
  'alternate',
]

export { props }
