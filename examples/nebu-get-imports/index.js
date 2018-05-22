
module.exports = {
  Program(node, state) {
    state.imports = [];
    node.yield(() => {
      // Print the imports once finished.
      process.nextTick(() => {
        inspect(state.imports);
      });
    });
  },
  CallExpression(node, state) {
    if (node.callee.name == 'require') {
      let src = node.arguments[0];
      if (src && src.isLiteral('string')) {
        state.imports.push({
          es: false,
          ref: src.value,
          start: src.start,
          end: src.end,
        });
      }

      // Wrap the entire variable declaration (if we're in one).
      while (/^Variable/.test(node.parent.type)) {
        node = node.parent;
      }
      node.before('try {\n');
      node.indent();
      node.after('\n} catch(e) {}');
    }
  },
  ImportDeclaration(node, state) {
    const src = node.source;
    if (src && src.isLiteral('string')) {
      state.imports.push({
        es: true,
        ref: src.value,
        start: src.start,
        end: src.end,
      });
    }
    // Remove for testing purposes.
    node.before('// ');
  }
};
