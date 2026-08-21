import axios, { AxiosInstance, AxiosResponse } from "axios";

export const GET = "GET";
export const POST = "POST";
export const DELETE = "DELETE";
export const PUT = "PUT";


export type QueryParams = Record<string, unknown>;

export interface RequestOptions {
    headers?: Record<string, string>;
    data?: unknown;
    params?: QueryParams;
}

export class HttpClient {

    readonly instance: AxiosInstance;

    constructor() {
        this.instance = axios.create({withCredentials: true});
    }

    public async send<TResponse>(
        endpoint: string,
        method: string,
        options?: RequestOptions,
    ): Promise<AxiosResponse<TResponse>> {
        try {
            const resp = await this.instance.request<TResponse>(
                {
                    url: endpoint,
                    method: method,
                    headers: options?.headers,
                    data: options?.data,
                    params: options?.params,
                }
            );
            return resp;
        } catch (err: unknown) {
            if (axios.isAxiosError(err)) {
                if (err.response) {
                    const errPayload = {
                        error: "request error",
                        status: err.response?.status,
                        statusText: err.response?.statusText,
                        data: err.response?.data,
                    };
                    console.error("request error", errPayload);
                    throw new Error(JSON.stringify(errPayload));
                } else {
                    const errPayload = { error: "connection error" };
                    console.error("connection error", errPayload);
                    throw new Error(JSON.stringify(errPayload));
                }
            }
            const message = err instanceof Error ? err.message : String(err);
            throw new Error(JSON.stringify({ error: message }));
        }
    }
}
