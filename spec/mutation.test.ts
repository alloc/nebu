import { describe, expect, test } from 'vitest'
import endent from 'endent'
import { nebu } from '../src/nebu'
import util from 'util'

describe('node.set:', () => {
  test('node child', () => {
    const input = 'let a = 1'
    const output = nebu.process(input, {
      VariableDeclarator: node => {
        node.set('id', 'b')
      },
    })

    expect(output.js).toBe('let b = 1')
  })

  describe('array child', () => {
    test('(array destructuring)', () => {
      const input = 'let [a, b] = [1, 2]'
      const output = nebu.process(input, {
        ArrayPattern: node => {
          node.set('elements', 'c, d')
        },
      })

      expect(output.js).toBe('let [c, d] = [1, 2]')
    })

    test('(empty array literal)', () => {
      const input = 'let a = []'
      const output = nebu.process(input, {
        ArrayExpression: node => {
          node.set('elements', '1, 2')
        },
      })

      expect(output.js).toBe('let a = [1, 2]')
    })

    test.only('(multi-line array literal)', () => {
      const input = endent`
        let a = [
          1, 2, 3,
          4, 5, 6,
        ]
      `
      const output = nebu.process(input, {
        ArrayExpression: node => {
          node.set('elements', '')
        },
      })

      expect(output.js).toBe('let a = []')
    })
  })

  test('block statement child', () => {
    const input = endent`
      try {
        a()
        b()
      } catch(e) {}
    `
    const output = nebu.process(input, {
      TryStatement: node => {
        node.set(
          'block',
          endent`
            if (a()) {
              return b()
            }
          `
        )
      },
    })

    expect(output.js).toBe(endent`
      try {
        if (a()) {
          return b()
        }
      } catch(e) {}
    `)
  })
})
// describe('node.push:', () => {
// });

// describe('node.unshift:', () => {
// });

// describe('node.splice:', () => {
// });

describe('node.before:', () => {
  test('one-line block body', () => {
    const input = 'if (true) foo()'
    const output = nebu.process(input, {
      CallExpression: node => {
        node.before('bar() && ')
      },
    })

    expect(output.js).toBe('if (true) bar() && foo()')
  })

  test('two calls', () => {
    const input = 'x'
    const output = nebu.process(input, {
      Identifier: node => {
        node.before('y')
        node.before('z')
      },
    })

    expect(output.js).toBe('zyx')
  })
})

describe('node.after:', () => {
  test('two calls', () => {
    const input = 'x'
    const output = nebu.process(input, {
      Identifier: node => {
        node.after('y')
        node.after('z')
      },
    })

    expect(output.js).toBe('xyz')
  })

  test('array element', () => {
    const input = 'let a = [1, 2, 3]'
    const output = nebu.process(input, {
      ArrayExpression: node => {
        node.elements[1]!.after('4')
      },
    })

    expect(output.js).toBe('let a = [1, 24, 3]')
  })
})

// describe('node.indent:', () => {
// });

// describe('node.dedent:', () => {
// });

// describe('node.replace:', () => {
// });

// describe('node.remove:', () => {
// });

function inspect(obj: any) {
  console.log(util.inspect(obj, false, 5, true))
}
