import { RelayClient } from "../src/client";
import {
    ConfigurationFactory,
    RelayClientFactory,
    BaseExample,
    ConsoleErrorHandler,
    OperationResult
} from "./shared/utils";

/**
 * Transaction retrieval operation following Single Responsibility Principle
 */
class TransactionRetriever extends BaseExample {
    private client: RelayClient;
    private transactionId: string;

    constructor(transactionId: string) {
        super(new ConsoleErrorHandler());
        this.client = RelayClientFactory.createReadOnlyClient();
        this.transactionId = transactionId;
    }

    protected async performOperation(): Promise<OperationResult> {
        console.log(`Querying transaction ID: ${this.transactionId}`);
        console.log('Retrieving transaction information...');

        const transaction = await this.client.getTransaction(this.transactionId);

        if (!transaction || transaction.length === 0) {
            console.log(`Transaction with ID '${this.transactionId}' not found`);
            console.log('Tip: Make sure the transaction ID is correct and the transaction exists');
            return { success: false, error: 'Transaction not found' };
        }

        this.displayTransactionDetails(transaction[0]);
        return { success: true, data: transaction[0] };
    }

    private displayTransactionDetails(transaction: any): void {
        console.log('\nTransaction details retrieved successfully!');
        console.log('Transaction Information:');
        console.log(`   ID: ${transaction.id}`);
        console.log(`   Status: ${transaction.state}`);
        console.log(`   Created At: ${transaction.createdAt}`);
        console.log(`   Updated At: ${transaction.updatedAt}`);

        if (transaction.executedAt) {
            console.log(`   Executed At: ${transaction.executedAt}`);
        }

        if (transaction.transactionHash) {
            console.log(`   Transaction Hash: ${transaction.transactionHash}`);
        }

        if (transaction.safeAddress) {
            console.log(`   Safe Address: ${transaction.safeAddress}`);
        }
    }
}

/**
 * Entry point for transaction retrieval example
 * @param transactionId - The transaction ID to query (optional, can be passed as command line argument)
 */
async function main(transactionId?: string): Promise<void> {
    try {
        const config = ConfigurationFactory.createEnvironmentConfig();
        console.log('Environment configuration validated');

        const txId = transactionId || "0191580c-6472-7266-beda-4deaebe46705";
        const retriever = new TransactionRetriever(txId);
        const result = await retriever.execute();

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

// Get transaction ID from command line arguments if provided
const transactionIdArg = process.argv[2];

// Execute the main function with proper error handling
main(transactionIdArg).catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});