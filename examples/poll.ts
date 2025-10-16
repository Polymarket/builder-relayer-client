import { RelayerTransactionState } from "../src/types";
import {
    ConfigurationFactory,
    RelayClientFactory,
    BaseExample,
    ConsoleErrorHandler,
    OperationResult
} from "./shared/utils";

/**
 * Transaction polling operation following Single Responsibility Principle
 */
class TransactionPoller extends BaseExample {
    private client: RelayClient;
    private transactionId: string;
    private targetStates: string[];

    constructor(transactionId: string, targetStates: string[]) {
        super(new ConsoleErrorHandler());
        this.client = RelayClientFactory.createReadOnlyClient();
        this.transactionId = transactionId;
        this.targetStates = targetStates;
    }

    protected async performOperation(): Promise<OperationResult> {
        console.log(`Polling transaction ID: ${this.transactionId}`);
        console.log(`Waiting for transaction to reach state: ${this.targetStates.join(' or ')}`);
        console.log('This may take several minutes...\n');

        const startTime = Date.now();

        const result = await this.client.pollUntilState(this.transactionId, this.targetStates);

        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        if (result) {
            this.displayPollingResults(result, duration);
            return { success: true, data: result };
        } else {
            console.log('Polling completed but transaction is not in target state');
            console.log('Tip: The transaction may have failed or timed out');
            return { success: false, error: 'Transaction not in target state' };
        }
    }

    private displayPollingResults(result: any, duration: string): void {
        console.log('Transaction reached target state!');
        console.log('Polling Results:');
        console.log(`   Transaction ID: ${result.id}`);
        console.log(`   Final State: ${result.state}`);
        console.log(`   Polling Duration: ${duration} seconds`);
        console.log(`   Created At: ${result.createdAt}`);
        console.log(`   Updated At: ${result.updatedAt}`);

        if (result.executedAt) {
            console.log(`   Executed At: ${result.executedAt}`);
        }

        if (result.transactionHash) {
            console.log(`   Transaction Hash: ${result.transactionHash}`);
        }

        if (result.safeAddress) {
            console.log(`   Safe Address: ${result.safeAddress}`);
        }
    }
}

/**
 * Entry point for transaction polling example
 * @param transactionId - The transaction ID to poll (optional, can be passed as command line argument)
 */
async function main(transactionId?: string): Promise<void> {
    try {
        const config = ConfigurationFactory.createEnvironmentConfig();
        console.log('Environment configuration validated');

        const txId = transactionId || "0190e61a-bb93-7c3f-88e2-e29e1c569fb1";

        // Define target states to poll for
        const targetStates = [
            RelayerTransactionState.STATE_CONFIRMED.valueOf(),
            // Alternative: Uncomment to also poll for executed state
            // RelayerTransactionState.STATE_EXECUTED.valueOf(),
        ];

        const poller = new TransactionPoller(txId, targetStates);
        const result = await poller.execute();

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