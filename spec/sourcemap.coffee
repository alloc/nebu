nebu = require '..'

code = 'let a = 1'
plugins = [{}]
mapUrlRE = /\/\/# sourceMappingURL=(.+)/

tp.group 'sourceMaps: true', ->

  tp.test '(no filenames)', (t) ->
    res = nebu.process code,
      plugins: plugins
      sourceMaps: true
    t.eq res and typeof res, 'object'
    t.eq typeof res.js, 'string'
    t.eq mapUrlRE.test(res.js), false
    t.eq res.map and typeof res.map, 'object'

  tp.test '(with filenames)', (t) ->
    res = nebu.process code,
      plugins: plugins
      filename: 'src/a.js'
      sourceRoot: process.cwd()
      sourceMaps: true
      sourceMapTarget: 'map/a.js.map'
    t.eq res and typeof res, 'object'
    t.eq typeof res.js, 'string'
    t.eq mapUrlRE.exec(res.js)[1], '../map/a.js.map'
    t.eq res.map and typeof res.map, 'object'
    t.eq res.map.sources[0], '../src/a.js'
    t.eq res.map.sourceRoot, process.cwd()

tp.test 'sourceMaps: "inline"', (t) ->
  res = nebu.process code,
    plugins: plugins
    sourceMaps: 'inline'
  t.eq typeof res, 'string'
  t.ne url = mapUrlRE.exec(res), null
  t.eq url[1].startsWith('data:application/json;'), true

tp.test 'sourceMaps: "both"', (t) ->
  res = nebu.process code,
    plugins: plugins
    sourceMaps: 'both'
  t.eq res and typeof res, 'object'
  t.eq typeof res.js, 'string'
  t.eq res.map and typeof res.map, 'object'
  t.ne url = mapUrlRE.exec(res.js), null
  t.eq url[1].startsWith('data:application/json;'), true
