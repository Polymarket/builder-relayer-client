import { concat, Hex, keccak256, toHex } from "viem";
import { IAbstractSigner } from "@polymarket/builder-abstract-signer";

import {
    ProxyTransactionArgs,
    SignatureParams,
    TransactionRequest,
    TransactionType
} from "../types";
import { deriveProxyWallet } from "./derive";
import { ProxyContractConfig } from "../config";

function createStructHash(
    from: string,
    to: string,
    data: string,
    txFee: string,
    gasPrice: string,
    gasLimit: string,
    nonce: string,
    relayHubAddress: string,
    relayAddress: string,
  ): Hex {
    const relayHubPrefix = toHex("rlx:");
    const encodedFrom = from as Hex;
    const encodedTo = to as Hex;
    const encodedData = data as Hex;
    const encodedTxFee = toHex(BigInt(txFee), { size: 32 });
    const encodedGasPrice = toHex(BigInt(gasPrice), { size: 32 });
    const encodedGasLimit = toHex(BigInt(gasLimit), { size: 32 });
    const encodedNonce = toHex(BigInt(nonce), { size: 32 });
    const encodedRelayHubAddress = relayHubAddress as Hex;
    const encodedRelayAddress = relayAddress as Hex;

    const dataToHash = concat([
        relayHubPrefix,
        encodedFrom,
        encodedTo,
        encodedData,
        encodedTxFee,
        encodedGasPrice,
        encodedGasLimit,
        encodedNonce,
        encodedRelayHubAddress,
        encodedRelayAddress,
    ]);
    return keccak256(dataToHash);
}

async function createProxySignature(
    signer: IAbstractSigner,
    structHash: string,
): Promise<string> {
    return signer.signMessage(structHash);
}

export async function buildProxyTransactionRequest(
    signer: IAbstractSigner,
    args: ProxyTransactionArgs,
    proxyContractConfig: ProxyContractConfig,
    metadata?: string,
) :Promise<TransactionRequest> {
    const proxyWalletFactory = proxyContractConfig.ProxyFactory;
    const to = proxyWalletFactory;
    const proxy = deriveProxyWallet(args.from, proxyWalletFactory);
    const relayerFee = "0";
    const relayHub = proxyContractConfig.RelayHub;
    const gasLimit = args.gasLimit ? args.gasLimit: await signer.estimateGas({
            from: args.from,
            to: to,
            data: args.data,
        }
    );
    const gasLimitStr = gasLimit.toString();
    const sigParams: SignatureParams = {
        gasPrice: args.gasPrice,
        gasLimit: gasLimitStr,
        relayerFee: relayerFee,
        relayHub: relayHub,
        relay: args.relay,
    };

    const txHash = createStructHash(
        args.from,
        to,
        args.data,
        relayerFee,
        args.gasPrice,
        gasLimitStr,
        args.nonce,
        relayHub,
        args.relay
    );

    const sig = await createProxySignature(signer, txHash);

    if(metadata == undefined){
        metadata = "";
    }

    const req = {
        from: args.from,
        to: to,
        proxyWallet: proxy,
        data: args.data,
        nonce: args.nonce,
        signature: sig,
        signatureParams: sigParams,
        type: TransactionType.PROXY,
        metadata: metadata,
    };

    console.log(`Created Proxy Transaction Request:`);
    console.log(req);
    return req;
}