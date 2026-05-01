import { Hex } from "viem";
import { IAbstractSigner } from "@polymarket/builder-abstract-signer";
import { DEPOSIT_WALLET_DOMAIN_NAME, DEPOSIT_WALLET_DOMAIN_VERSION } from "../constants";
import { DepositWalletContractConfig } from "../config";
import {
    DepositWalletBatchRequest,
    DepositWalletCall,
    DepositWalletCreateRequest,
    DepositWalletTransactionArgs,
    TransactionType,
} from "../types";

const DEPOSIT_WALLET_TYPES = {
    Call: [
        { name: "target", type: "address" },
        { name: "value", type: "uint256" },
        { name: "data", type: "bytes" },
    ],
    Batch: [
        { name: "wallet", type: "address" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
        { name: "calls", type: "Call[]" },
    ],
};

async function signBatch(
    signer: IAbstractSigner,
    chainId: number,
    walletAddress: string,
    nonce: string,
    deadline: string,
    calls: DepositWalletCall[],
): Promise<string> {
    const domain = {
        name: DEPOSIT_WALLET_DOMAIN_NAME,
        version: DEPOSIT_WALLET_DOMAIN_VERSION,
        chainId,
        verifyingContract: walletAddress as Hex,
    };

    const message = {
        wallet: walletAddress,
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
        calls: calls.map(c => ({
            target: c.target,
            value: BigInt(c.value),
            data: c.data,
        })),
    };

    return signer.signTypedData(domain, DEPOSIT_WALLET_TYPES, message, "Batch");
}

export async function buildDepositWalletBatchRequest(
    signer: IAbstractSigner,
    args: DepositWalletTransactionArgs,
    config: DepositWalletContractConfig,
): Promise<DepositWalletBatchRequest> {
    const signature = await signBatch(
        signer,
        args.chainId,
        args.walletAddress,
        args.nonce,
        args.deadline,
        args.calls,
    );

    return {
        type: TransactionType.WALLET,
        from: args.from,
        to: config.DepositWalletFactory,
        nonce: args.nonce,
        signature,
        depositWalletParams: {
            depositWallet: args.walletAddress,
            deadline: args.deadline,
            calls: args.calls,
        },
    };
}

export function buildDepositWalletCreateRequest(
    from: string,
    config: DepositWalletContractConfig,
): DepositWalletCreateRequest {
    return {
        type: TransactionType.WALLET_CREATE,
        from,
        to: config.DepositWalletFactory,
    };
}
