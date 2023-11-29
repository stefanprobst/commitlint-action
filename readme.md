# commitlint github action

lint commit messages.

## how to set up

```yml
# .github/workflows/validate.yml
name: Validate
on:
  push:
jobs:
  validate:
		runs-on: ubuntu-latest
		steps:
		  # this action expects a valid commitlint config in the repository.
		  - uses: actions/checkout@v4

      # if the commitlint config extends from a preset like `@commitlint/config-conventional`,
			# the package needs to be installed.
			- uses: actions/setup-node@v4
			- run: npm ci

			- uses: stefanprobst/commitlint-action@v1
```
