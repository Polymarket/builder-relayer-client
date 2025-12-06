import { proxyWalletFactory } from "../abis";
import { ProxyTransaction } from "../types";
import { encodeFunctionData, prepareEncodeFunctionData } from "viem";

const proxy = prepareEncodeFunctionData({
    abi: proxyWalletFactory,
    functionName: 'proxy',
});


export function encodeProxyTransactionData(txns: ProxyTransaction[]) : string {
    return encodeFunctionData({
        ...proxy,
        args: [txns],
      });
}
