# Polymarket Builder Relayer Client Examples

This directory contains comprehensive examples demonstrating how to use the Polymarket Builder Relayer Client. All examples follow SOLID principles and implement proper error handling, configuration management, and code reusability.

## Architecture

The examples are built on a shared utility framework that implements:

- **SOLID Principles**: Single responsibility, open/closed, dependency inversion
- **DRY Principle**: No code duplication through shared utilities
- **Strategy Pattern**: Pluggable error handling strategies
- **Factory Method Pattern**: Consistent object creation
- **Template Method Pattern**: Standardized operation execution

## Shared Utilities (`shared/utils.ts`)

### Core Classes

- **EnvironmentValidator**: Validates environment variables
- **ConfigurationFactory**: Creates configuration objects
- **RelayClientFactory**: Creates RelayClient instances
- **BaseExample**: Abstract base class for all operations
- **ErrorHandler**: Strategy pattern for error handling

### Key Features

- Automatic environment validation
- Centralized configuration management
- Consistent error handling
- Type-safe interfaces
- Reusable components

## Examples

### 1. Safe Deployment (`deploy.ts`)

Demonstrates how to deploy a new Gnosis Safe contract.

```bash
bun run examples/deploy.ts
```

**Key Features:**
- Environment validation
- Builder authentication support
- Deployment result display
- Comprehensive error handling

### 2. Transaction Execution (`execute.ts`)

Shows how to execute transactions through the Safe.

```bash
bun run examples/execute.ts
```

**Key Features:**
- ERC20 token approval example
- Transaction factory pattern
- Execution result tracking
- Gas and status reporting

### 3. Transaction Retrieval (`getTransaction.ts`)

Retrieves details of a specific transaction.

```bash
bun run examples/getTransaction.ts [transaction-id]
```

**Key Features:**
- Command line argument support
- Detailed transaction information
- Graceful handling of missing transactions

### 4. Transaction Listing (`getTransactions.ts`)

Lists all transactions with status summaries.

```bash
bun run examples/getTransactions.ts
```

**Key Features:**
- Transaction enumeration
- Status summary statistics
- Empty result handling

### 5. Transaction Polling (`poll.ts`)

Polls for transaction state changes.

```bash
bun run examples/poll.ts [transaction-id]
```

**Key Features:**
- Configurable target states
- Duration tracking
- Timeout handling

## Configuration

All examples use the same environment variables. Copy `.env.example` to `.env` and configure:

```bash
# Required
RELAYER_URL=https://clob.relay.polymarket.com
CHAIN_ID=137
RPC_URL=https://polygon-rpc.com
PK=your_private_key_here

# Optional (for builder authentication)
BUILDER_API_KEY=your_builder_api_key_here
BUILDER_SECRET=your_builder_secret_here
BUILDER_PASS_PHRASE=your_builder_pass_phrase_here
```

## Code Quality Standards

### SOLID Principles Implementation

1. **Single Responsibility**: Each class has one reason to change
2. **Open/Closed**: Extensible through inheritance and composition
3. **Liskov Substitution**: Base classes can be substituted by derived classes
4. **Interface Segregation**: Small, focused interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions

### Error Handling Strategy

The examples implement a Strategy pattern for error handling:

- **ConsoleErrorHandler**: Default handler with detailed error messages
- **ErrorHandler Interface**: Allows for custom error handling strategies
- **Specific Error Types**: Connection, configuration, authorization, etc.

### Best Practices

- No code duplication (DRY principle)
- Comprehensive input validation
- Type safety with TypeScript
- Consistent logging and output
- Graceful error recovery
- Clear separation of concerns

## Adding New Examples

When creating new examples:

1. Extend the `BaseExample` class
2. Use `RelayClientFactory` for client creation
3. Implement the `performOperation()` method
4. Follow the existing error handling patterns
5. Add proper JSDoc documentation
6. Include configuration validation

### Example Template

```typescript
import {
    ConfigurationFactory,
    RelayClientFactory,
    BaseExample,
    ConsoleErrorHandler,
    OperationResult
} from "./shared/utils";

class NewOperation extends BaseExample {
    private client: RelayClient;

    constructor() {
        super(new ConsoleErrorHandler());
        this.client = RelayClientFactory.createClient(); // or createReadOnlyClient()
    }

    protected async performOperation(): Promise<any> {
        // Implementation here
        return result;
    }
}

async function main(): Promise<void> {
    try {
        const config = ConfigurationFactory.createEnvironmentConfig();
        console.log('Environment configuration validated');

        const operation = new NewOperation();
        const result = await operation.execute();

        if (!result.success) {
            process.exit(1);
        }

    } catch (error) {
        if (error instanceof Error) {
            console.error('Setup failed:', error.message);
        } else {
            console.error('Setup failed:', error);
        }
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
```