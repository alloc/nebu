nebu = require '..'

process = (input, plugins) ->
  if !Array.isArray plugins
    plugins = [plugins]
  nebu.process input, {plugins}

util = require 'util'
global.inspect = (obj) ->
  console.log util.inspect obj, false, 5, true

tp.group 'node.set:', ->

  # replace a single node from its parent
  tp.test 'node child', (t) ->
    input = 'let a = 1'
    output = process input,

      # `id` is an `Identifier` node
      VariableDeclarator: (node) ->
        node.set 'id', 'b'

    t.eq output, 'let b = 1'

  # replace an array of nodes from their parent
  tp.group 'array child', ->

    tp.test '(array destructuring)', (t) ->
      input = 'let [a, b] = [1, 2]'
      output = process input,

        # `elements` is an array of `Identifier` nodes
        ArrayPattern: (node) ->
          node.set 'elements', 'c, d'

      t.eq output, 'let [c, d] = [1, 2]'

    tp.test '(empty array literal)', (t) ->
      input = 'let a = []'
      output = process input,

        ArrayExpression: (node) ->
          node.set 'elements', '1, 2'

      t.eq output, 'let a = [1, 2]'

    tp.test '(multi-line array literal)', (t) ->
      input = '''
        let a = [
          1, 2, 3,
          4, 5, 6,
        ]
      '''
      output = process input,

        ArrayExpression: (node) ->
          node.set 'elements', ''

      # We *could* strip the newline from emptied arrays,
      # but it's not a big priority right now.
      t.eq output, 'let a = [\n]'

  # replace the body of a BlockStatement from its parent
  tp.test 'block statement child', (t) ->
    input = '''
      try {
        a()
        b()
      } catch(e) {}
    '''
    output = process input,

      TryStatement: (node) ->
        node.set 'block', '''
          if (a()) {
            return b()
          }
        '''

    t.eq output, '''
      try {
        if (a()) {
          return b()
        }
      } catch(e) {}
    '''

# tp.group 'node.push:', ->

# tp.group 'node.unshift:', ->

# tp.group 'node.splice:', ->

tp.group 'node.before:', ->

  tp.test 'one-line block body', (t) ->
    input = 'if (true) foo()'
    output = process input,

      CallExpression: (node) ->
        node.before 'bar() && '

    t.eq output, 'if (true) bar() && foo()'

  tp.test 'two calls', (t) ->
    input = 'x'
    output = process input,

      Identifier: (node) ->
        node.before 'y'
        node.before 'z'

    t.eq output, 'zyx'

# tp.group 'node.after:', ->

# tp.group 'node.indent:', ->

# tp.group 'node.dedent:', ->

# tp.group 'node.replace:', ->

# tp.group 'node.remove:', ->
