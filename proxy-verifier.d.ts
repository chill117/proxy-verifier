import {Options as RequestOptions} from "request";

declare class ProxyVerifier {
    static testAll(proxy: ProxyVerifier.IProxy & ProxyVerifier.IProtocolsProxy, options: RequestOptions, cb: (error: any, result: ProxyVerifier.IAllResults) => void): void;
    static testAll(proxy: ProxyVerifier.IProxy & ProxyVerifier.IProtocolsProxy, cb: (error: any, result: ProxyVerifier.IAllResults) => void): void;

    static testProtocol(proxy: ProxyVerifier.IProtocolsProxy, options: RequestOptions, cb: (error: any, result: ProxyVerifier.Result) => void): void;
    static testProtocol(proxy: ProxyVerifier.IProtocolsProxy, cb: (error: any, result: ProxyVerifier.Result) => void): void;

    static testProtocols(proxy: ProxyVerifier.IProxy, options: RequestOptions, cb: (error: any, result: ProxyVerifier.IProtocolResult) => void): void;
    static testProtocols(proxy: ProxyVerifier.IProxy, cb: (error: any, result: ProxyVerifier.IProtocolResult) => void): void;

    static testAnonymityLevel(proxy: ProxyVerifier.IProxy, options: RequestOptions, cb: (error: any, result: string) => void): void;
    static testAnonymityLevel(proxy: ProxyVerifier.IProxy, cb: (error: any, result: string) => void): void;

    static testTunnel(proxy: ProxyVerifier.IProxy, options: RequestOptions, cb: (error: any, result: ProxyVerifier.Result) => void): void;
    static testTunnel(proxy: ProxyVerifier.IProxy, cb: (error: any, result: ProxyVerifier.Result) => void): void;

    static test(proxy: ProxyVerifier.IProxy, options: ProxyVerifier.ITestOptions, cb: (error: any, result: ProxyVerifier.ICustomTestResult) => void): void;
    static test(proxy: ProxyVerifier.IProxy, cb: (error: any, result: ProxyVerifier.ICustomTestResult) => void): void;
}

export = ProxyVerifier;

declare namespace ProxyVerifier {
    interface IBaseProxy {
        ipAddress: string;
        port: number;
        /**
         * Proxy-Authorization header
         */
        auth?: string
    }

    export interface IProxy extends IBaseProxy {
        protocol?: Protocol;
    }

    export interface IProtocolsProxy extends IBaseProxy {
        protocols?: Protocol[];
    }

    export type Protocol = "http" | "https" | "socks5" | "socks4";

    export type AnonymityLevel = "transparent" | "anonymous" | "elite";


    export interface IAllResults {
        anonymityLevel?: AnonymityLevel;
        protocols?: IProtocolResult;
        tunnel?: Result
    }

    export type Result = IWorkingResult | INotWorkingResult;

    interface IWorkingResult {
        ok: true
    }

    interface INotWorkingResult {
        ok: false;
        error: {
            message: string;
            code: string;
        }
    }

    export interface IProtocolResult {
        [key: string]: Result;
    }

    export interface ITestOptions {
        testUrl: string;
        testFn: (data: string, status: number, headers: IHeaders) => void;
    }

    interface IHeaders {
        [key: string]: string
    }

    interface ICustomTestBaseResult {
        data: string;
        status: number;
        headers: IHeaders;
    }

    export type ICustomTestResult = ICustomTestWorkingResult | ICustomTestNotWorkingResult;

    interface ICustomTestWorkingResult extends ICustomTestBaseResult {
        ok: true
    }

    interface ICustomTestNotWorkingResult extends ICustomTestBaseResult {
        ok: false;
        error: {
            message: string;
            code: string;
        }
    }

}
