
import { IAbstractSigner } from "@polymarket/abstract-signer";
import { hashTypedData, Hex, zeroAddress } from "viem";

import { 
    OperationType,
    SafeTransaction,
    SafeTransactionArgs,
    SignatureParams,
    TransactionRequest,
    TransactionType 
} from "../types";
import { deriveSafe } from "./derive";
import { createSafeMultisendTransaction } from "../encode/safe";
import { SafeContractConfig } from "../config";
import { splitAndPackSig } from "../utils";


async function createSafeSignature(signer: IAbstractSigner, structHash: string) : Promise<string> {
    return signer.signMessage(structHash);
}

function createStructHash(
    chainId: number,
    safe: string,
    to: string,
    value: string,
    data: string,
    operation: OperationType,
    safeTxGas: string,
    baseGas: string,
    gasPrice: string,
    gasToken: string,
    refundReceiver: string,
    nonce: string
) : string {
    const domain = {
        chainId: chainId,
        verifyingContract: safe as Hex,
    };

    const types = {
        // keccak256(
        //     "SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"
        // );
        SafeTx: [
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'data', type: 'bytes' },
            { name: 'operation', type: 'uint8' },
            { name: 'safeTxGas', type: 'uint256' },
            { name: 'baseGas', type: 'uint256' },
            { name: 'gasPrice', type: 'uint256' },
            { name: 'gasToken', type: 'address' },
            { name: 'refundReceiver', type: 'address' },
            { name: 'nonce', type: 'uint256' },
        ],
    };
    const values = {
        to: to,
        value: value,
        data: data,
        operation: operation,
        safeTxGas: safeTxGas,
        baseGas: baseGas,
        gasPrice: gasPrice,
        gasToken: gasToken,
        refundReceiver: refundReceiver,
        nonce: nonce,
    };

    // // viem hashTypedData
    // const structHash = _TypedDataEncoder.hash(domain, types, values);

    const structHash = hashTypedData({primaryType: "SafeTx", domain: domain, types: types, message: values});
    return structHash;
}

export function aggregateTransaction(txns: SafeTransaction[], safeMultisend: string): SafeTransaction {
    let transaction: SafeTransaction;
    if(txns.length == 1) {
        transaction = txns[0];
    } else {
        transaction = createSafeMultisendTransaction(txns, safeMultisend);
    }
    return transaction;
}

export async function buildSafeTransactionRequest(
    signer: IAbstractSigner,
    args: SafeTransactionArgs,
    safeContractConfig: SafeContractConfig,
    metadata?: string,
) :Promise<TransactionRequest> {
    const safeFactory = safeContractConfig.SafeFactory;
    const safeMultisend = safeContractConfig.SafeMultisend;
    const transaction = aggregateTransaction(args.transactions, safeMultisend);
    const safeTxnGas = "0";
    const baseGas = "0";
    const gasPrice = "0";
    const gasToken = zeroAddress;
    const refundReceiver = zeroAddress;

    const safeAddress = deriveSafe(args.from, safeFactory);

    // Generate the struct hash
    const structHash = createStructHash(
        args.chainId,
        safeAddress,
        transaction.to,
        transaction.value,
        transaction.data,
        transaction.operation,
        safeTxnGas,
        baseGas,
        gasPrice,
        gasToken,
        refundReceiver,
        args.nonce,
    );

    const sig = await createSafeSignature(signer, structHash);

    // Split the sig then pack it into Gnosis accepted rsv format
    const packedSig = splitAndPackSig(sig)

    const sigParams: SignatureParams = {
        gasPrice,
        operation: `${transaction.operation}`,
        safeTxnGas,
        baseGas,
        gasToken,
        refundReceiver,
    }

    if(metadata == undefined){
        metadata = "";
    }

    const req =  {
        from: args.from,
        to: transaction.to,
        proxyWallet: safeAddress,
        data: transaction.data,
        nonce: args.nonce,
        signature: packedSig,
        signatureParams: sigParams,
        type: TransactionType.SAFE,
        metadata: metadata,
    }

    console.log(`Created Safe Transaction Request: `);
    console.log(req);
    return req;
}
