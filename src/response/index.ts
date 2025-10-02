import { RelayClient } from "../client";
import { RelayerTransaction, RelayerTransactionResponse, RelayerTransactionState } from "../types";


export class ClientRelayerTransactionResponse implements RelayerTransactionResponse {

    readonly client: RelayClient;
    readonly transactionID: string;
    readonly transactionHash: string;
    readonly hash: string;
    readonly state: string;

    constructor(transactionID: string, state: string, transactionHash: string, client: RelayClient) {
        this.transactionID = transactionID;
        this.state = state;
        this.transactionHash = transactionHash;
        this.hash = transactionHash;
        this.client = client;
    }

    public async getTransaction(): Promise<RelayerTransaction[]> {
        return this.client.getTransaction(this.transactionID);
    }

    public async wait(): Promise<RelayerTransaction | undefined> {
        return this.client.pollUntilState(
            this.transactionID,
            [
                RelayerTransactionState.STATE_MINED,
                RelayerTransactionState.STATE_CONFIRMED,
            ],
            RelayerTransactionState.STATE_FAILED,
            30,
        );
    }
}
