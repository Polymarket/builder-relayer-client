import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { RelayClient, OperationType, SafeTransaction } from "../src";
import {
    ConfigurationFactory,
    RelayClientFactory,
    BaseExample,
    ConsoleErrorHandler,
    OperationResult
} from "./shared/utils";

// ERC20 Token interface for approval transactions
const erc20Interface = new Interface([
    {
        "constant": false,
        "inputs": [
            {"name": "_spender", "type": "address"},
            {"name": "_value", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "payable": false,
        "stateMutability": "nonpayable",
        "type": "function"
    }
]);

/**
 * Factory for creating token transactions following Factory Method pattern
 */
class TransactionFactory {
    /**
     * Creates a USDC approval transaction
     * @param tokenAddress - The ERC20 token contract address
     * @param spenderAddress - The address to approve spending for
     * @returns SafeTransaction object for USDC approval
     */
    static createUsdcApprovalTransaction(
        tokenAddress: string,
        spenderAddress: string
    ): SafeTransaction {
        return {
            to: tokenAddress,
            operation: OperationType.Call,
            data: erc20Interface.encodeFunctionData("approve", [spenderAddress, ethers.constants.MaxUint256]),
            value: "0",
        };
    }
}

/**
 * Transaction execution operation following Single Responsibility Principle
 */
class TransactionExecutor extends BaseExample {
    private client: RelayClient;
    private transactions: SafeTransaction[];
    private description: string;

    constructor(transactions: SafeTransaction[], description: string) {
        super(new ConsoleErrorHandler());
        this.client = RelayClientFactory.createClient();
        this.transactions = transactions;
        this.description = description;
    }

    protected async performOperation(): Promise<OperationResult> {
        console.log(`Executing transactions: ${this.description}`);
        console.log(`Number of transactions: ${this.transactions.length}`);

        const response = await this.client.execute(this.transactions, this.description);

        console.log('Waiting for transaction confirmation...');
        const result = await response.wait();

        if (!result) {
            throw new Error('Transaction execution failed');
        }

        this.displayExecutionResults(result);
        return { success: true, data: result };
    }

    private displayExecutionResults(result: any): void {
        console.log('\nTransaction executed successfully!');
        console.log('Transaction Details:');
        console.log(`   Transaction Hash: ${result.transactionHash}`);
        console.log(`   Block Number: ${result.blockNumber}`);
        console.log(`   Gas Used: ${result.gasUsed}`);
        console.log(`   Status: ${result.status === 1 ? 'Success' : 'Failed'}`);

        if (result.safeAddress) {
            console.log(`   Safe Address: ${result.safeAddress}`);
        }
    }
}

/**
 * Entry point for transaction execution example
 */
async function main(): Promise<void> {
    try {
        const config = ConfigurationFactory.createEnvironmentConfig();
        console.log('Environment configuration validated');
        console.log('Builder Auth:', config.builderCredentials ? 'Enabled' : 'Disabled');

        // Token addresses (USDC and CTF on Polygon)
        const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const ctfAddress = "0x4d97dcd97ec945f40cf65f87097ace5ea0476045";

        console.log(`USDC Address: ${usdcAddress}`);
        console.log(`CTF Address: ${ctfAddress}`);

        // Create approval transaction
        const approvalTransaction = TransactionFactory.createUsdcApprovalTransaction(usdcAddress, ctfAddress);

        const executor = new TransactionExecutor([approvalTransaction], "Approve USDC on CTF");
        const result = await executor.execute();

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