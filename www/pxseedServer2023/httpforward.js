define("pxseedServer2023/httpforward", ["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "./pxseedhttpserver", "partic2/CodeRunner/jsutils2", "partic2/pxprpcBinding/utils", "partic2/tjshelper/httpprot", "partic2/pxprpcClient/registry"], function (require, exports, base_1, extend_1, pxseedhttpserver_1, jsutils2_1, utils_1, httpprot_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HttpRequestForwardOnRpc = void 0;
    exports.__serverHostForwardHttpRequestToRpcWorker = __serverHostForwardHttpRequestToRpcWorker;
    exports.forwardHttpRequestToRpcWorker = forwardHttpRequestToRpcWorker;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    class HttpSession {
        constructor() {
            this.request = null;
            this.response = null;
            this.requestBody = new base_1.ArrayWrap2();
            this.responseBody = null;
            this.closed = false;
            this.protocol = 'http';
            this.websocketSend = new base_1.ArrayWrap2();
            this.websocketRecv = new base_1.ArrayWrap2();
            this.websocketAccepted = false;
        }
        async doFetch() {
            this.response = await pxseedhttpserver_1.defaultHttpHandler.onfetch(this.request);
            this.responseBody = this.response.body?.getReader() ?? null;
        }
        async doWebsocket() {
            await pxseedhttpserver_1.defaultHttpHandler.onwebsocket({
                request: this.request,
                accept: async () => {
                    this.websocketAccepted = true;
                    return {
                        send: async (obj) => {
                            if (this.closed)
                                throw new Error('Websocket closed.');
                            if (obj instanceof Array) {
                                obj = new Uint8Array((0, base_1.ArrayBufferConcat)(obj));
                            }
                            else if (typeof obj === 'string') {
                                obj = (0, jsutils2_1.utf8conv)(obj);
                            }
                            this.websocketSend.queueSignalPush(obj);
                        },
                        receive: async () => {
                            if (this.closed)
                                throw new Error('Websocket closed.');
                            let r1 = await this.websocketRecv.queueBlockShift();
                            return r1;
                        },
                        close: () => {
                            this.closed = true;
                            this.websocketRecv.cancelWaiting();
                            this.websocketSend.cancelWaiting();
                        }
                    };
                }
            });
        }
        async close() {
            this.closed = true;
            this.websocketRecv.cancelWaiting();
            this.websocketSend.cancelWaiting();
            this.requestBody.cancelWaiting();
        }
    }
    extend_1.defaultFuncMap[__name__ + '.newHttpSession'] = new extend_1.RpcExtendServerCallable(async (requestInit) => {
        let { url, method, headers, protocol } = JSON.parse((0, jsutils2_1.utf8conv)(requestInit));
        let session = new HttpSession();
        session.protocol = protocol;
        let body = null;
        if (['POST', 'PUT'].includes(method)) {
            body = new ReadableStream({
                pull: async (controller) => {
                    let chunk = await session.requestBody.queueBlockShift();
                    if (chunk.length > 0) {
                        controller.enqueue(chunk);
                    }
                    else {
                        controller.close();
                    }
                }
            });
        }
        let req = new Request(url, { headers, method, body, duplex: 'half' });
        session.request = req;
        return session;
    }).typedecl('b->o');
    extend_1.defaultFuncMap[__name__ + '.writeHttpRequestBody'] = new extend_1.RpcExtendServerCallable(async (session, data) => {
        if (session.protocol === 'http') {
            session.requestBody.queueSignalPush(data);
        }
        else if (session.protocol === 'ws') {
            session.websocketRecv.queueSignalPush(data);
        }
        else {
            throw new Error('Unknown protocol:' + session.protocol);
        }
    }).typedecl('ob->');
    extend_1.defaultFuncMap[__name__ + '.fetchHttpResponse'] = new extend_1.RpcExtendServerCallable(async (session) => {
        if (session.protocol === 'http') {
            await session.doFetch();
            let headers = {};
            let { status, statusText, headers: header2 } = session.response;
            header2.forEach((v, k) => {
                headers[k] = v;
            });
            return (0, jsutils2_1.utf8conv)(JSON.stringify({ status, statusText, headers, hasBody: session.response?.body != null }));
        }
        else if (session.protocol === 'ws') {
            await session.doWebsocket();
            return (0, jsutils2_1.utf8conv)(JSON.stringify({ websocketAccepted: session.websocketAccepted }));
        }
        else {
            throw new Error('Unknown protocol:' + session);
        }
    }).typedecl('o->b');
    extend_1.defaultFuncMap[__name__ + '.readHttpResponseBody'] = new extend_1.RpcExtendServerCallable(async (session) => {
        if (session.protocol === 'http') {
            if (session.responseBody == null) {
                return new Uint8Array(0);
            }
            let readResult = await session.responseBody.read();
            if (readResult.done) {
                return new Uint8Array(0);
            }
            else {
                return readResult.value;
            }
        }
        else if (session.protocol === 'ws') {
            return await session.websocketSend.queueBlockShift();
        }
        else {
            throw new Error('Unknown protocol:' + session.protocol);
        }
    }).typedecl('o->b');
    let rpcObjectFree = new FinalizationRegistry((session) => session.free());
    class HttpRequestForwardOnRpc {
        constructor(client1) {
            this.client1 = client1;
        }
        async fetch(req) {
            let { url, method, headers: headers2 } = req;
            let headers = {};
            headers2.forEach((v, k) => {
                headers[k] = v;
            });
            let newHttpSession = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.newHttpSession', 'b->o');
            let httpSession = await newHttpSession.call((0, jsutils2_1.utf8conv)(JSON.stringify({ url, method, headers, protocol: 'http' })));
            let abortCtl = new AbortController();
            try {
                if (req.body != null) {
                    let writeHttpRequestBody = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.writeHttpRequestBody', 'ob->');
                    (async () => {
                        let reader = req.body.getReader();
                        for (let readResult = await reader.read(); !readResult.done; readResult = await reader.read()) {
                            await writeHttpRequestBody.call(httpSession, readResult.value);
                        }
                        await writeHttpRequestBody.call(httpSession, new Uint8Array(0));
                    })();
                }
                let fetchHttpResponse = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.fetchHttpResponse', 'o->b');
                let readHttpResponseBody = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.readHttpResponseBody', 'o->b');
                let { status, statusText, headers } = JSON.parse((0, jsutils2_1.utf8conv)(await fetchHttpResponse.call(httpSession)));
                let resp2 = new httpprot_1.ExtendHttpResponse(new ReadableStream({
                    pull: async (controller) => {
                        abortCtl.signal.throwIfAborted();
                        let chunk = await readHttpResponseBody.call(httpSession);
                        if (chunk.length > 0) {
                            controller.enqueue(chunk);
                        }
                        else {
                            controller.close();
                            httpSession.free();
                        }
                    }
                }), { status, statusText, headers });
                rpcObjectFree.register(resp2, httpSession);
                return resp2;
            }
            catch (err) {
                abortCtl.abort();
                httpSession.free();
                throw err;
            }
        }
        async websocket(ctl) {
            let { url, method, headers: headers2 } = ctl.request;
            let headers = {};
            headers2.forEach((v, k) => {
                headers[k] = v;
            });
            let newHttpSession = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.newHttpSession', 'b->o');
            let httpSession = await newHttpSession.call((0, jsutils2_1.utf8conv)(JSON.stringify({ url, method, headers, protocol: 'ws' })));
            let fetchHttpResponse = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.fetchHttpResponse', 'o->b');
            let readHttpResponseBody = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.readHttpResponseBody', 'o->b');
            let writeHttpRequestBody = await (0, utils_1.getRpcFunctionOn)(this.client1, __name__ + '.writeHttpRequestBody', 'ob->');
            let { websocketAccepted } = JSON.parse((0, jsutils2_1.utf8conv)(await fetchHttpResponse.call(httpSession)));
            if (websocketAccepted) {
                let conn = await ctl.accept();
                Promise.race([(async () => {
                        while (true) {
                            let chunk = await conn.receive();
                            await writeHttpRequestBody.call(httpSession, chunk);
                        }
                    })(), (async () => {
                        while (true) {
                            let chunk = await readHttpResponseBody.call(httpSession);
                            await conn.send(chunk);
                        }
                    })()]).catch((err) => {
                }).finally(() => {
                    httpSession.free();
                    conn.close();
                });
            }
        }
    }
    exports.HttpRequestForwardOnRpc = HttpRequestForwardOnRpc;
    async function __serverHostForwardHttpRequestToRpcWorker(prefix, rpc) {
        if (rpc == null) {
            pxseedhttpserver_1.defaultRouter.setHandler(prefix, null);
        }
        else {
            pxseedhttpserver_1.defaultRouter.setHandler(prefix, new HttpRequestForwardOnRpc(await (await (0, registry_1.getPersistentRegistered)(rpc)).ensureConnected()));
        }
    }
    async function forwardHttpRequestToRpcWorker(prefix, rpc) {
        let httpforward = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)).ensureConnected(), __name__);
        httpforward.__serverHostForwardHttpRequestToRpcWorker(prefix, rpc);
    }
});
