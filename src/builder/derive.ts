import { keccak256, getCreate2Address, Hex, encodeAbiParameters } from 'viem'
import { SAFE_INIT_CODE_HASH } from "../constants";


export const deriveSafe = (address: string, safeFactory: string) : string => {
    return getCreate2Address({
        bytecodeHash: SAFE_INIT_CODE_HASH as Hex,
        from: safeFactory as Hex,
        salt: keccak256(encodeAbiParameters([{ name: 'address', type: 'address' }], [address as Hex]))}
    );
}
