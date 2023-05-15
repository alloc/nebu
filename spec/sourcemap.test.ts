import { describe, expect, test } from 'vitest'
import { nebu } from '../src/nebu'

const code = 'let a = 1'
const plugins = [{ Program() {} }]
const mapUrlRE = /\/\/# sourceMappingURL=(.+)/

describe('sourceMap: true', () => {
  test('(no filenames)', () => {
    const res = nebu.process(code, {
      plugins,
      sourceMap: true,
    })

    expect(res && typeof res).toBe('object')
    expect(typeof res.js).toBe('string')
    expect(mapUrlRE.test(res.js)).toBe(false)
    expect(res.map && typeof res.map).toBe('object')
  })

  test('(with filenames)', () => {
    const res = nebu.process(code, {
      plugins,
      filename: 'src/a.js',
      sourceMap: true,
      sourceMapTarget: 'map/a.js.map',
    })

    expect(res && typeof res).toBe('object')
    expect(typeof res.js).toBe('string')
    expect(mapUrlRE.exec(res.js)?.[1]).toBe('../map/a.js.map')
    expect(res.map && typeof res.map).toBe('object')
    expect(res.map!.sources[0]).toBe('../src/a.js')
  })
})

test('sourceMap: "inline"', () => {
  const res = nebu.process(code, {
    plugins,
    sourceMap: 'inline',
  })

  expect(typeof res).toBe('object')
  const url = mapUrlRE.exec(res.js)!
  expect(url).toBeTruthy()
  expect(url[1].startsWith('data:application/json;')).toBe(true)
})
