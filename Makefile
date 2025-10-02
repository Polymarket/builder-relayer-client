.PHONY: build
build:
	@echo "Building ts code..."
	pnpm clean && tsc --project tsconfig.production.json

.PHONY: test
test:
	pnpm exec mocha --import=tsx 'tests/**/*.test.ts' --timeout 300000 --exit


