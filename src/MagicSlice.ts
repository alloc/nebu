import MagicString, { OverwriteOptions } from 'magic-string'

export class MagicSlice {
  readonly end: number

  constructor(
    readonly source: MagicSlice | MagicString,
    readonly start: number,
    length: number
  ) {
    this.end = start + length
  }

  get original(): string {
    return this.source.original.slice(this.start, this.end)
  }

  getIndentString(): string {
    return this.source.getIndentString()
  }

  append(content: string) {
    this.source.appendRight(this.end, content)
    return this
  }

  appendLeft(index: number, content: string) {
    this.source.appendLeft(this.start + index, content)
    return this
  }

  appendRight(index: number, content: string) {
    this.source.appendRight(this.start + index, content)
    return this
  }

  move(start: number, end: number, index: number) {
    this.source.move(this.start + start, this.start + end, index)
    return this
  }

  overwrite(
    start: number,
    end: number,
    content: string,
    options?: boolean | OverwriteOptions
  ) {
    this.source.overwrite(
      this.start + start,
      this.start + end,
      content,
      options
    )
    return this
  }

  prepend(content: string) {
    this.source.prependLeft(this.start, content)
    return this
  }

  prependLeft(index: number, content: string) {
    this.source.prependLeft(this.start + index, content)
    return this
  }

  prependRight(index: number, content: string) {
    this.source.prependRight(this.start + index, content)
    return this
  }

  remove(start: number, end: number) {
    this.source.remove(this.start + start, this.start + end)
    return this
  }

  addSourcemapLocation(index: number) {
    this.source.addSourcemapLocation(this.start + index)
  }
}
