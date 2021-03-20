import { AllNodeProps, FindNode } from './types'

export const replacers: Replacers = {
  // TODO
}

type Replacers = {
  [P in AllNodeProps]?: FindNode<P> extends infer T
    ? P extends keyof T
      ? (this: T, oldValue: T[P], newValue: T[P]) => void
      : never
    : never
}
