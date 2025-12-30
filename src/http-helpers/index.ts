import axios, { AxiosInstance, RawAxiosRequestHeaders, AxiosResponse } from "axios";

export const GET = "GET";
export const POST = "POST";
export const DELETE = "DELETE";
export const PUT = "PUT";


export type QueryParams = Record<string, any>;

export interface RequestOptions {
    headers?: RawAxiosRequestHeaders;
    data?: any;
    params?: QueryParams;
}

export class HttpClient {

    readonly instance: AxiosInstance;

    constructor() {
        this.instance = axios.create({withCredentials: true});
    }

    public async send(
        endpoint: string,
        method: string,
        options?: RequestOptions,
    ): Promise<AxiosResponse> {
        if (options !== undefined) {
            if (options.headers != undefined) {
                options.headers["Access-Control-Allow-Credentials"] = true;
            }
        }

        try {
            const resp = await this.instance.request(
                {
                    url: endpoint,
                    method: method,
                    headers: options?.headers,
                    data: options?.data,
                    params: options?.params,
                }
            );
            return resp;
        } catch (err) {
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
            throw new Error(JSON.stringify({ error: err }));
        }
    }
}
