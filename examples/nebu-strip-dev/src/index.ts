import { Plugin, Node } from '../../..'

// const re = /(^|(&&|\|\|) )process\.env\.NODE_ENV !==? ['"]production['"]/

export default <Plugin>{
  IfStatement(node) {
    let { test } = node
    if (isDevCondition(test)) {
      copyAlternate(node)
      // TODO: Add closing } when parent is an IfStatement.
      // TODO: Avoid removing alternates when parent is an IfStatement.
      node.remove()
    } else {
      findDevConditions(test)
    }
  },
}

function isDevCondition(cond: Node.Expression) {
  return (
    cond.isBinaryExpression() &&
    cond.operator.startsWith('!=') &&
    cond.right.isLiteral('string') &&
    cond.right.value == 'production' &&
    cond.left.toString() == 'process.env.NODE_ENV'
  )
}

function copyAlternate(cond: Node.IfStatement) {
  const alt = cond.alternate
  if (!alt) return
  if (alt.isBlockStatement()) {
    if (alt.body.length) {
      // TODO: Preserve blank lines.
      alt.body.forEach(alt => {
        cond.after('\n' + alt.toString())
      })
    }
  } else {
    cond.after('\n' + alt.toString())
  }
}

function findDevConditions(cond: Node.Expression) {
  while (cond.isLogicalExpression()) {
    // TODO: Remove branch if expression has only && operators.
    if (isDevCondition(cond.left)) {
      cond.left.replace('false')
    } else {
      findDevConditions(cond.left)
    }
    if (isDevCondition(cond.right)) {
      return cond.right.replace('false')
    } else {
      cond = cond.right
    }
  }
}
