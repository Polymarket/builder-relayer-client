import { Wallet } from "@ethersproject/wallet";
import { JsonRpcSigner } from "@ethersproject/providers";
import { WalletClient, zeroAddress } from "viem";
import { createAbstractSigner, IAbstractSigner } from "@polymarket/builder-abstract-signer";
import {
    GET,
    POST,
    HttpClient,
    RequestOptions,
} from "./http-helpers";
import { 
    GetDeployedResponse,
    NoncePayload,
    RelayerTransaction,
    RelayerTransactionResponse,
    SafeCreateTransactionArgs,
    SafeTransaction,
    SafeTransactionArgs,
    TransactionType
} from "./types";
import { 
    GET_DEPLOYED,
    GET_NONCE,
    GET_TRANSACTION,
    GET_TRANSACTIONS,
    SUBMIT_TRANSACTION,
} from "./endpoints";
import { 
    buildSafeTransactionRequest,
    buildSafeCreateTransactionRequest,
    deriveSafe,
} from "./builder";
import { sleep } from "./utils";
import { ClientRelayerTransactionResponse } from "./response";
import { ContractConfig, getContractConfig } from "./config";
import { BuilderConfig, BuilderHeaderPayload } from "@polymarket/builder-signing-sdk";
import { SAFE_DEPLOYED, SAFE_NOT_DEPLOYED, SIGNER_UNAVAILABLE } from "./errors";


export class RelayClient {
    readonly relayerUrl: string;

    readonly chainId: number;

    readonly contractConfig: ContractConfig;

    readonly httpClient: HttpClient;

    readonly signer?: IAbstractSigner;

    readonly builderConfig?: BuilderConfig;

    __deployed: boolean;

    constructor(
        relayerUrl: string,
        chainId: number,
        signer?: Wallet | JsonRpcSigner | WalletClient,
        builderConfig?: BuilderConfig,
    ) {
        this.relayerUrl = relayerUrl.endsWith("/") ? relayerUrl.slice(0, -1) : relayerUrl;
        this.chainId = chainId;
        this.contractConfig = getContractConfig(chainId);
        this.httpClient = new HttpClient();
        this.__deployed = false;
        
        if (signer != undefined) {
            this.signer = createAbstractSigner(chainId, signer);
        }

        if (builderConfig !== undefined) {
            this.builderConfig = builderConfig;
        }
    }

    public async getNonce(signerAddress: string, signerType: string): Promise<NoncePayload> {
        return this.send(
            `${GET_NONCE}`,
            GET,
            {params: { address: signerAddress, type: signerType }},
        );
    }

    public async getTransaction(transactionId: string): Promise<RelayerTransaction[]> {
        return this.send(
            `${GET_TRANSACTION}`,
            GET,
            {params: { id: transactionId }},
        );
    }

    public async getTransactions(): Promise<RelayerTransaction[]> {
        return this.sendAuthedRequest(GET, GET_TRANSACTIONS);
    }

    /**
     * Executes a batch of safe transactions
     * @param txns 
     * @param metadata 
     * @returns 
     */
    public async execute(txns: SafeTransaction[], metadata?: string): Promise<RelayerTransactionResponse> {
        this.signerNeeded();
        const safe = await this.getExpectedSafe();

        const deployed = await this.getDeployed(safe);
        if (!deployed) {
            throw SAFE_NOT_DEPLOYED;
        }
        
        const start = Date.now();
        const from = await (this.signer as IAbstractSigner).getAddress();

        const noncePayload = await this.getNonce(from, TransactionType.SAFE);

        const args: SafeTransactionArgs = {
            transactions: txns,
            from,
            nonce: noncePayload.nonce,
            chainId: this.chainId,
        }

        const safeContractConfig = this.contractConfig.SafeContracts;

        const request = await buildSafeTransactionRequest(
            this.signer as IAbstractSigner,
            args,
            safeContractConfig,
            metadata,
        );

        console.log(`Client side safe request creation took: ${(Date.now() - start) / 1000} seconds`);
        
        const requestPayload = JSON.stringify(request);
        
        const resp: RelayerTransactionResponse = await this.sendAuthedRequest(POST, SUBMIT_TRANSACTION, requestPayload)
        
        return new ClientRelayerTransactionResponse(
            resp.transactionID,
            resp.state,
            resp.transactionHash,
            this,
        );
    }

    /**
     * Deploys a safe 
     * @returns 
     */
    public async deploy(): Promise<RelayerTransactionResponse> {
        this.signerNeeded();
        const safe = await this.getExpectedSafe();

        const deployed = await this.getDeployed(safe);
        if (deployed) {
            throw SAFE_DEPLOYED;
        }
        console.log(`Deploying safe ${safe}...`);
        return this._deploy();
    }

    private async _deploy(): Promise<RelayerTransactionResponse> {
        const start = Date.now();
        const from = await (this.signer as IAbstractSigner).getAddress();
        const args: SafeCreateTransactionArgs = {
            from: from,
            chainId: this.chainId,
            paymentToken: zeroAddress,
            payment: "0",
            paymentReceiver: zeroAddress,
        };
        const safeContractConfig = this.contractConfig.SafeContracts;

        const request = await buildSafeCreateTransactionRequest(
            this.signer as IAbstractSigner,
            safeContractConfig,
            args
        );

        console.log(`Client side deploy request creation took: ${(Date.now() - start) / 1000} seconds`);
        
        const requestPayload = JSON.stringify(request);

        const resp: RelayerTransactionResponse = await this.sendAuthedRequest(POST, SUBMIT_TRANSACTION, requestPayload)
        
        return new ClientRelayerTransactionResponse(
            resp.transactionID,
            resp.state,
            resp.transactionHash,
            this,
        );
    }

    public async getDeployed(safe: string): Promise<boolean> {        
        const resp: GetDeployedResponse = await this.send(
            `${GET_DEPLOYED}`,
            GET,
            {params: { address: safe }},
        );
        return resp.deployed;
    }

    /**
     * Periodically polls the transaction id until it reaches a desired state
     * Returns the relayer transaction if it does each the desired state
     * Returns undefined if the transaction hits the failed state
     * Times out after maxPolls is reached
     * @param transactionId 
     * @param states 
     * @param failState
     * @param maxPolls 
     * @param pollFrequency 
     * @returns 
     */
    public async pollUntilState(transactionId: string, states: string[], failState?: string, maxPolls?: number, pollFrequency?: number): Promise<RelayerTransaction | undefined> {
        console.log(`Waiting for transaction ${transactionId} matching states: ${states}...`)
        const maxPollCount = maxPolls != undefined ? maxPolls : 10;
        let pollFreq = 2000; // Default to polling every 2 seconds
        if (pollFrequency != undefined) {
            if (pollFrequency >= 1000) {
                pollFreq = pollFrequency;
            }
        }
        let pollCount = 0;
        while(pollCount < maxPollCount) {
            const txns = await this.getTransaction(transactionId);
            if(txns.length > 0) {
                const txn = txns[0];
                if(states.includes(txn.state)) {
                    return txn;
                }
                if (failState != undefined && txn.state == failState) {
                    console.error(`txn ${transactionId} failed onchain! Transaction hash: ${txn.transactionHash}`);
                    return undefined;
                }
            }
            pollCount++
            await sleep(pollFreq);
        }
        console.log(`Transaction not found or not in given states, timing out!`);
    }

    private async sendAuthedRequest(
        method: string,
        path: string,
        body?: string
    ): Promise<any> {        
        // builders auth
        if (this.canBuilderAuth()) {
            const builderHeaders = await this._generateBuilderHeaders(method, path, body);
            if (builderHeaders !== undefined) {
                return this.send(
                    path,
                    method, 
                    { headers: builderHeaders, data: body }
                );    
            }
        }

        return this.send(
            path,
            method,
            {data: body}
        );
    }

    private async _generateBuilderHeaders(
        method: string,
        path: string,
        body?: string
    ): Promise<BuilderHeaderPayload | undefined> {
        if (this.builderConfig !== undefined) {
            const builderHeaders = await this.builderConfig.generateBuilderHeaders(
                method,
                path,
                body,
            );
            if (builderHeaders == undefined) {
                return undefined;
            }
            return builderHeaders;
        }

        return undefined;
    }

    private canBuilderAuth(): boolean {
        return (this.builderConfig != undefined && this.builderConfig.isValid());
    }

    private async send(
        endpoint: string,
        method: string,
        options?: RequestOptions
    ): Promise<any> {
        const resp = await this.httpClient.send(`${this.relayerUrl}${endpoint}`, method, options);
        return resp.data;
    }

    private signerNeeded(): void {
        if (this.signer === undefined) {
            throw SIGNER_UNAVAILABLE;
        }
    }

    private async getExpectedSafe(): Promise<string> {
        const address = await (this.signer as IAbstractSigner).getAddress();
        return deriveSafe(address, this.contractConfig.SafeContracts.SafeFactory);
    }
}
