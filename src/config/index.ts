export interface SafeContractConfig {
    SafeFactory: string;
    SafeMultisend: string;
}

export interface ContractConfig {
    SafeContracts: SafeContractConfig;
};

const AMOY: ContractConfig = {
    SafeContracts: {
        SafeFactory: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
        SafeMultisend: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
    }
};

const POL: ContractConfig = {
    SafeContracts: {
        SafeFactory: "0xaacFeEa03eb1561C4e67d661e40682Bd20E3541b",
        SafeMultisend: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
    }
};


export const getContractConfig = (chainId: number): ContractConfig => {
    switch (chainId) {
        case 137:
            return POL;
        case 80002:
            return AMOY;
        default:
            throw new Error("Invalid network");
    }
};