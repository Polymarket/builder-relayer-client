import { RelayClient } from "../src/client";
import {
    ConfigurationFactory,
    RelayClientFactory,
    BaseExample,
    ConsoleErrorHandler,
    OperationResult
} from "./shared/utils";

/**
 * Safe deployment operation following Single Responsibility Principle
 */
class SafeDeployer extends BaseExample {
    private client: RelayClient;

    constructor() {
        super(new ConsoleErrorHandler());
        this.client = RelayClientFactory.createClient();
    }

    protected async performOperation(): Promise<OperationResult> {
        console.log('Deploying Safe contract...');
        const deployResponse = await this.client.deploy();

        console.log('Waiting for deployment confirmation...');
        const result = await deployResponse.wait();

        if (!result) {
            throw new Error('Safe deployment failed');
        }

        this.displayDeploymentResults(result);
        return { success: true, data: result };
    }

    private displayDeploymentResults(result: any): void {
        console.log('\nSafe deployed successfully!');
        console.log('Transaction Hash:', result.transactionHash);
        console.log('Safe Address:', result.proxyAddress);
        console.log('Gas Used:', result.gasUsed);
    }
}

/**
 * Entry point for Safe deployment example
 */
async function main(): Promise<void> {
    try {
        const config = ConfigurationFactory.createEnvironmentConfig();
        console.log('Environment configuration validated');
        console.log('Builder Auth:', config.builderCredentials ? 'Enabled' : 'Disabled');

        const deployer = new SafeDeployer();
        const result = await deployer.execute();

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