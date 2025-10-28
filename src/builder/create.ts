import { 
    SafeCreateTransactionArgs,
    SignatureParams,
    TransactionRequest,
    TransactionType
} from "../types";
import { SAFE_FACTORY_NAME } from "../constants";
import { deriveSafe } from "./derive";
import { IAbstractSigner } from "@polymarket/builder-abstract-signer";
import { SafeContractConfig } from "../config";
import { Hex } from "viem";


async function createSafeCreateSignature(
    signer: IAbstractSigner,
    safeFactory: string,
    chainId: number,
    paymentToken: string,
    payment: string,
    paymentReceiver: string
): Promise<string> {
    const domain = {
        name: SAFE_FACTORY_NAME,
        chainId: BigInt(chainId),
        verifyingContract: safeFactory as Hex,
    };
    const types = {
        CreateProxy: [
            { name: "paymentToken", type: "address" },
            { name: "payment", type: "uint256" },
            { name: "paymentReceiver", type: "address" },
        ],
    };

    const values = {
        paymentToken,
        payment: BigInt(payment),
        paymentReceiver,
    };
    const sig = await signer.signTypedData(domain, types, values, "CreateProxy");

    console.log(`Sig: ${sig}`);
    return sig;
}


export async function buildSafeCreateTransactionRequest(
    signer: IAbstractSigner,
    safeContractConfig: SafeContractConfig,
    args: SafeCreateTransactionArgs,
) :Promise<TransactionRequest> {
    const safeFactory = safeContractConfig.SafeFactory;
    const sig = await createSafeCreateSignature(
        signer,
        safeFactory,
        args.chainId,
        args.paymentToken,
        args.payment,
        args.paymentReceiver
    );

    const sigParams: SignatureParams = {
        paymentToken: args.paymentToken,
        payment: args.payment,
        paymentReceiver: args.paymentReceiver,
    };

    const safeAddress = deriveSafe(args.from, safeFactory);

    const request: TransactionRequest = {
        from: args.from,
        to: safeFactory,
        // Note: obviously the safe here does not exist yet but useful to have this data in the db
        proxyWallet: safeAddress, 
        data: "0x",
        signature: sig,
        signatureParams: sigParams,
        type: TransactionType.SAFE_CREATE,
    };

    console.log(`Created a SAFE-CREATE Transaction:`);
    console.log(request);
    return request;
}