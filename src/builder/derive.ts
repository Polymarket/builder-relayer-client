import { keccak256, getCreate2Address, encodePacked, Hex, encodeAbiParameters } from 'viem'
import { SAFE_INIT_CODE_HASH, PROXY_INIT_CODE_HASH } from "../constants";

export const deriveProxyWallet = (address: string, proxyFactory: string): string => {
    return getCreate2Address({
        bytecodeHash: PROXY_INIT_CODE_HASH as Hex,
        from: proxyFactory as Hex,
        salt: keccak256(encodePacked(["address"], [address as Hex]))}
    );
}

export const deriveSafe = (address: string, safeFactory: string) : string => {
    return getCreate2Address({
        bytecodeHash: SAFE_INIT_CODE_HASH as Hex,
        from: safeFactory as Hex,
        salt: keccak256(encodeAbiParameters([{ name: 'address', type: 'address' }], [address as Hex]))}
    );
}
