import { SyntaxHooksVisitor } from './hooks'
import { getContext } from './context'
import { toRelativeIndex } from './MagicSlice'
import { searchString } from './utils/index'

export const builtinHooks: SyntaxHooksVisitor = {
  JSXOpeningElement: {
    pushFirst(node, prop, code) {
      // Append the attribute after the tag name.
      if (prop == 'attributes') {
        const { output } = getContext()
        output.appendRight(toRelativeIndex(output, node.name.end), code)
        return true
      }
    },
  },
  default: {
    removeFromArray(_node, removedRange) {
      const { input } = getContext()

      // Absorb all whitespace to the right.
      removedRange[1] =
        searchString(input, removedRange[1], (char, offset) =>
          /\s/.test(char) ? false : offset
        ) ?? removedRange[1]
    },
  },
}
