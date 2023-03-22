import MagicString, { OverwriteOptions } from 'magic-string'

export class MagicSlice {
  readonly sourceStart: number
  readonly sourceEnd: number

  constructor(
    readonly source: MagicSlice | MagicString,
    readonly start: number,
    readonly end: number
  ) {
    const offset = source instanceof MagicSlice ? source.start : 0
    this.sourceStart = start - offset
    this.sourceEnd = end - offset
  }

  get original(): string {
    return this.source.original.slice(this.sourceStart, this.sourceEnd)
  }

  getIndentString(): string {
    return this.source.getIndentString()
  }

  append(content: string) {
    this.source.appendRight(this.sourceEnd, content)
    return this
  }

  appendLeft(index: number, content: string) {
    this.source.appendLeft(this.sourceStart + index, content)
    return this
  }

  appendRight(index: number, content: string) {
    this.source.appendRight(this.sourceStart + index, content)
    return this
  }

  move(start: number, end: number, index: number) {
    this.source.move(this.sourceStart + start, this.sourceStart + end, index)
    return this
  }

  overwrite(
    start: number,
    end: number,
    content: string,
    options?: boolean | OverwriteOptions
  ) {
    this.source.overwrite(
      this.sourceStart + start,
      this.sourceStart + end,
      content,
      options
    )
    return this
  }

  prepend(content: string) {
    this.source.prependLeft(this.sourceStart, content)
    return this
  }

  prependLeft(index: number, content: string) {
    this.source.prependLeft(this.sourceStart + index, content)
    return this
  }

  prependRight(index: number, content: string) {
    this.source.prependRight(this.sourceStart + index, content)
    return this
  }

  remove(start: number, end: number) {
    this.source.remove(this.sourceStart + start, this.sourceStart + end)
    return this
  }

  addSourcemapLocation(index: number) {
    this.source.addSourcemapLocation(this.sourceStart + index)
  }
}

export function toRelativeIndex(
  output: MagicSlice | MagicString,
  absoluteIndex: number
) {
  if (output instanceof MagicSlice) {
    return absoluteIndex - output.start
  }
  return absoluteIndex
}
