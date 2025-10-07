import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { RelayClient } from "../../src/client";
import { BuilderApiKeyCreds, BuilderConfig } from "@polymarket/builder-signing-sdk";
import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, Hex, http } from "viem";
import { polygon } from "viem/chains";

// Load environment variables once
dotenvConfig({ path: resolve(__dirname, "../../.env") });

export interface EnvironmentConfig {
    relayerUrl: string;
    chainId: number;
    rpcUrl: string;
    privateKey: string;
    builderCredentials?: BuilderApiKeyCreds;
}

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
}

/**
 * Environment validator following Single Responsibility Principle
 */
export class EnvironmentValidator {
    private static readonly REQUIRED_VARS = ['RELAYER_URL', 'CHAIN_ID', 'PK', 'RPC_URL'];

    static validate(): ValidationResult {
        const errors: string[] = [];

        for (const variable of this.REQUIRED_VARS) {
            if (!process.env[variable]) {
                errors.push(`Missing required environment variable: ${variable}`);
            }
        }

        // Validate chainId is a valid number
        const chainId = process.env.CHAIN_ID;
        if (chainId && isNaN(parseInt(chainId))) {
            errors.push(`CHAIN_ID must be a valid number, got: ${chainId}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

/**
 * Configuration factory following Factory Method pattern
 */
export class ConfigurationFactory {
    static createEnvironmentConfig(): EnvironmentConfig {
        const validation = EnvironmentValidator.validate();
        if (!validation.isValid) {
            throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
        }

        return {
            relayerUrl: process.env.RELAYER_URL!,
            chainId: parseInt(process.env.CHAIN_ID!),
            rpcUrl: process.env.RPC_URL!,
            privateKey: process.env.PK!,
            builderCredentials: this.createBuilderCredentials()
        };
    }

    private static createBuilderCredentials(): BuilderApiKeyCreds | undefined {
        const key = process.env.BUILDER_API_KEY;
        const secret = process.env.BUILDER_SECRET;
        const passphrase = process.env.BUILDER_PASS_PHRASE;

        if (key && secret && passphrase) {
            return { key, secret, passphrase };
        }

        return undefined;
    }
}

/**
 * RelayClient factory following Factory Method pattern
 */
export class RelayClientFactory {
    static createClient(config?: EnvironmentConfig): RelayClient {
        const envConfig = config || ConfigurationFactory.createEnvironmentConfig();

        const account = privateKeyToAccount(envConfig.privateKey as Hex);
        const wallet = createWalletClient({
            account,
            chain: polygon,
            transport: http(envConfig.rpcUrl)
        });

        let builderConfig: BuilderConfig | undefined;

        if (envConfig.builderCredentials) {
            builderConfig = new BuilderConfig({
                localBuilderCreds: envConfig.builderCredentials
            });
        }

        return new RelayClient(envConfig.relayerUrl, envConfig.chainId, wallet, builderConfig);
    }

    static createReadOnlyClient(config?: EnvironmentConfig): RelayClient {
        const envConfig = config || ConfigurationFactory.createEnvironmentConfig();
        return new RelayClient(envConfig.relayerUrl, envConfig.chainId);
    }
}

/**
 * Error handling strategy following Strategy pattern
 */
export abstract class ErrorHandler {
    abstract handle(error: Error): void;
}

export class ConsoleErrorHandler extends ErrorHandler {
    handle(error: Error): void {
        console.error('\nOperation failed:');

        if (error.message.includes('connection error')) {
            console.error('Connection Error: Unable to reach the relayer service');
            console.error('Solution: Check your internet connection and relayer URL');
        } else if (error.message.includes('Configuration validation failed')) {
            console.error('Configuration Error: Missing or invalid environment variables');
            console.error('Solution: Copy .env.example to .env and fill in the required values');
        } else if (error.message.includes('Missing required environment variables')) {
            console.error('Configuration Error: Missing environment variables');
            console.error('Solution: Copy .env.example to .env and fill in the required values');
        } else if (error.message.includes('404') || error.message.includes('not found')) {
            console.error('Not Found: The resource does not exist or you do not have permission to view it');
            console.error('Solution: Verify the transaction ID is correct');
        } else if (error.message.includes('timeout')) {
            console.error('Timeout Error: Operation timed out');
            console.error('Solution: The operation may be stuck or taking longer than expected');
        } else if (error.message.includes('insufficient funds')) {
            console.error('Insufficient Funds: Not enough MATIC for gas');
            console.error('Solution: Add MATIC to your wallet');
        } else if (error.message.includes('unauthorized')) {
            console.error('Authorization Error: You do not have permission to perform this operation');
            console.error('Solution: Check your credentials or contact the administrator');
        } else {
            console.error(`Error: ${error.message}`);
        }
    }
}

/**
 * Operation result wrapper
 */
export interface OperationResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Base class for example operations following Template Method pattern
 */
export abstract class BaseExample {
    protected errorHandler: ErrorHandler;

    constructor(errorHandler?: ErrorHandler) {
        this.errorHandler = errorHandler || new ConsoleErrorHandler();
    }

    async execute(): Promise<OperationResult> {
        try {
            console.log('Starting operation...\n');

            const result = await this.performOperation();

            console.log('\nOperation completed successfully!');
            return { success: true, data: result };

        } catch (error) {
            if (error instanceof Error) {
                this.errorHandler.handle(error);
            } else {
                console.error('Unknown error:', error);
            }
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }

    protected abstract performOperation(): Promise<any>;
}