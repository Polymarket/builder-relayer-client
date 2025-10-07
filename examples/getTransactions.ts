import { RelayClient } from "../src/client";
import {
    ConfigurationFactory,
    RelayClientFactory,
    BaseExample,
    ConsoleErrorHandler,
    OperationResult
} from "./shared/utils";

/**
 * Transaction listing operation following Single Responsibility Principle
 */
class TransactionLister extends BaseExample {
    private client: RelayClient;

    constructor() {
        super(new ConsoleErrorHandler());
        this.client = RelayClientFactory.createReadOnlyClient();
    }

    protected async performOperation(): Promise<OperationResult> {
        console.log('Retrieving transaction list...');
        const transactions = await this.client.getTransactions();

        if (!transactions || transactions.length === 0) {
            console.log('No transactions found');
            console.log('Tip: Transactions will appear here once you start executing operations');
            return { success: true, data: [] };
        }

        this.displayTransactionList(transactions);
        this.displayStatusSummary(transactions);
        return { success: true, data: transactions };
    }

    private displayTransactionList(transactions: any[]): void {
        console.log(`\nFound ${transactions.length} transaction(s)!`);
        console.log('Transaction Summary:');

        transactions.forEach((tx, index) => {
            console.log(`\n${index + 1}. Transaction ID: ${tx.id}`);
            console.log(`   Status: ${tx.state}`);
            console.log(`   Created: ${tx.createdAt}`);
            console.log(`   Updated: ${tx.updatedAt}`);

            if (tx.transactionHash) {
                console.log(`   Hash: ${tx.transactionHash}`);
            }

            if (tx.safeAddress) {
                console.log(`   Safe: ${tx.safeAddress}`);
            }
        });
    }

    private displayStatusSummary(transactions: any[]): void {
        const statusCounts = transactions.reduce((acc, tx) => {
            acc[tx.state] = (acc[tx.state] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        console.log('\nStatus Summary:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   ${status}: ${count}`);
        });
    }
}

/**
 * Entry point for transaction listing example
 */
async function main(): Promise<void> {
    try {
        const config = ConfigurationFactory.createEnvironmentConfig();
        console.log('Environment configuration validated');

        const lister = new TransactionLister();
        const result = await lister.execute();

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

// Execute the main function with proper error handling
main().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});