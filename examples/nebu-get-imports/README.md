# nebu-get-imports

Collect dependencies of the given module.

- uses the `state` object to store dependencies
- uses the `yield` method to print dependencies at the end
- uses the `before/after` methods to wrap `require` calls with a try statement
- uses the `indent` method to indent `require` calls in their try statements

```sh
./try nebu-get-imports
```

`require` calls are wrapped with a try statement to avoid runtime errors.
`import` statements are converted into comments to avoid runtime errors.
