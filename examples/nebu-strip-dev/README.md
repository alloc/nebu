# nebu-strip-dev

A simple plugin that removes `process.env.NODE_ENV !== 'production'` blocks.

- uses the `replace` method for multi-condition blocks
- uses the `toString` method when moving conditional branches

```sh
./try nebu-strip-dev
```
