
export enum RelayerTxType {
    SAFE = "SAFE",
    PROXY = "PROXY"
}

export enum TransactionType {
    SAFE = "SAFE",
    PROXY = "PROXY",
    SAFE_CREATE = "SAFE-CREATE"
}

export interface SignatureParams {
    gasPrice?: string;

    // Proxy RelayHub sig params
    relayerFee?: string;
    // gasPrice: string; // User supplied minimum gas price
    gasLimit?: string; // User supplied gas limit
    relayHub?: string; // Relay Hub Address
    relay?: string; // Relayer address

	// SAFE sig parameters
	operation?: string;
    safeTxnGas?: string;
    baseGas?: string;
    // gasPrice: string;
    gasToken?: string;
    refundReceiver?: string;

	// SAFE CREATE sig parameters
    paymentToken?: string;
    payment?: string;
    paymentReceiver?: string;
}

export interface AddressPayload {
    address: string;
}

export interface NoncePayload {
    nonce: string;
}

export interface RelayPayload {
    address: string;
    nonce: string;
}

export interface TransactionRequest {
    type:               string;
	from:               string;
    to:                 string;
    proxyWallet?:        string;
    data:               string;
    nonce?:              string;
    signature:          string;
    signatureParams:    SignatureParams;
    metadata?:          string;
}

export enum CallType {
    Invalid = "0",
    Call = "1",
    DelegateCall = "2",
}
  
export interface ProxyTransaction {
    to: string;
    typeCode: CallType;
    data: string;
    value: string;
}

// Safe Transactions
export enum OperationType {
    Call, // 0
    DelegateCall, // 1
}  

export interface SafeTransaction {
    to: string;
    operation: OperationType
    data: string;
    value: string;
}

export interface Transaction {
    to: string;
    data: string;
    value: string;
}

export interface SafeTransactionArgs {
    from: string;
    nonce: string;
    chainId: number;
    transactions: SafeTransaction[];
}

export interface SafeCreateTransactionArgs {
    from: string;
    chainId: number;
    paymentToken: string;
    payment: string;
    paymentReceiver: string;
}

export interface ProxyTransactionArgs {
    from: string;
    nonce: string;
    gasPrice: string;
    gasLimit?: string;
    data: string;
    relay: string;
}

export enum RelayerTransactionState {
    STATE_NEW       = "STATE_NEW",
	STATE_EXECUTED  = "STATE_EXECUTED",
    STATE_MINED     = "STATE_MINED",
	STATE_INVALID   = "STATE_INVALID",
	STATE_CONFIRMED = "STATE_CONFIRMED",
	STATE_FAILED    = "STATE_FAILED",
}

export interface RelayerTransaction {
    transactionID: string;
    transactionHash: string;
    from: string;
    to: string;
    proxyAddress: string;
    data: string;
    nonce: string;
    value: string;
    state: string;
    type: string;
    metadata: string;
    createdAt: Date;
    updatedAt: Date;
}


export interface RelayerTransactionResponse {
    transactionID: string;
    state: string;
    hash: string;
    transactionHash: string;
    getTransaction: () => Promise<RelayerTransaction[]>
    wait: () => Promise<RelayerTransaction | undefined>
}


export interface GetDeployedResponse {
    deployed: boolean;
}