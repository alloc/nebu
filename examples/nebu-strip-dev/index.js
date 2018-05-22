const re = /(^|(&&|\|\|) )process\.env\.NODE_ENV !==? ['"]production['"]/;

module.exports = {
  IfStatement(node) {
    let {test} = node;
    if (isDevCondition(test)) {
      copyAlternate(node);
      // TODO: Add closing } when parent is an IfStatement.
      // TODO: Avoid removing alternates when parent is an IfStatement.
      node.remove();
    } else {
      findDevConditions(test);
    }
  }
};

function isDevCondition(cond) {
  return cond.type == 'BinaryExpression' &&
    cond.operator.startsWith('!=') &&
    cond.right.value == 'production' &&
    cond.left.toString() == 'process.env.NODE_ENV';
}

function copyAlternate(cond) {
  const alt = cond.alternate;
  if (!alt) return;
  if (alt.type == 'BlockStatement') {
    if (alt.body.length) {
      // TODO: Preserve blank lines.
      alt.body.forEach(alt => {
        cond.after('\n' + alt.toString());
      });
    }
  } else {
    cond.after('\n' + alt.toString());
  }
}

function findDevConditions(cond) {
  while (cond.type == 'LogicalExpression') {
    // TODO: Remove branch if expression has only && operators.
    if (isDevCondition(cond.left)) {
      cond.left.replace('false');
    } else {
      findDevConditions(cond.left);
    }
    if (isDevCondition(cond.right)) {
      return cond.right.replace('false');
    } else {
      cond = cond.right;
    }
  }
}
