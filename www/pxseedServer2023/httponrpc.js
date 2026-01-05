define(["require", "exports", "partic2/jsutils1/base", "pxprpc/extend", "./pxseedhttpserver", "partic2/CodeRunner/jsutils2", "partic2/pxprpcClient/registry"], function (require, exports, base_1, extend_1, pxseedhttpserver_1, jsutils2_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.HttpOnRpcFunction = void 0;
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
                            return await this.websocketRecv.queueBlockShift();
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
        let req = new Request(url, { headers, method, body });
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
    }).typedecl('ob->');
    extend_1.defaultFuncMap[__name__ + '.fetchHttpResponse'] = new extend_1.RpcExtendServerCallable(async (session) => {
        if (session.protocol === 'http') {
            await session.doFetch();
            let headers = {};
            let { status, statusText, headers: header2 } = session.response;
            header2.forEach((v, k) => {
                headers[k] = v;
            });
            return (0, jsutils2_1.utf8conv)(JSON.stringify({ status, statusText, headers }));
        }
        else if (session.protocol === 'ws') {
            await session.doWebsocket();
            return (0, jsutils2_1.utf8conv)(JSON.stringify({ websocketAccepted: session.websocketAccepted }));
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
    }).typedecl('o->b');
    class HttpOnRpcFunction {
        constructor(client1) {
            this.client1 = client1;
        }
        async fetch(req) {
            let { url, method, headers: headers2 } = req;
            let headers = {};
            headers2.forEach((v, k) => {
                headers[k] = v;
            });
            let newHttpSession = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.newHttpSession', 'b->o');
            let httpSession = await newHttpSession.call((0, jsutils2_1.utf8conv)(JSON.stringify({ url, method, headers, protocol: 'http' })));
            try {
                if (req.body != null) {
                    let writeHttpRequestBody = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.writeHttpRequestBody', 'ob->');
                    (async () => {
                        let reader = req.body.getReader();
                        for (let readResult = await reader.read(); !readResult.done; readResult = await reader.read()) {
                            await writeHttpRequestBody.call(httpSession, readResult.value);
                        }
                    })();
                }
                let fetchHttpResponse = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.fetchHttpResponse', 'o->b');
                let readHttpResponseBody = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.readHttpResponseBody', 'o->b');
                let { status, statusText } = JSON.parse((0, jsutils2_1.utf8conv)(await fetchHttpResponse.call(httpSession)));
                let resp2 = new Response(new ReadableStream({
                    pull: async (controller) => {
                        let chunk = await readHttpResponseBody.call(httpSession);
                        if (chunk.length > 0) {
                            controller.enqueue(chunk);
                        }
                        else {
                            controller.close();
                            httpSession.free();
                        }
                    }
                }), { status, statusText });
                new FinalizationRegistry((session) => session.free()).register(resp2, httpSession);
                return resp2;
            }
            catch (err) {
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
            let newHttpSession = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.newHttpSession', 'b->o');
            let httpSession = await newHttpSession.call((0, jsutils2_1.utf8conv)(JSON.stringify({ url, method, headers, protocol: 'ws' })));
            let fetchHttpResponse = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.fetchHttpResponse', 'o->b');
            let readHttpResponseBody = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.readHttpResponseBody', 'o->b');
            let writeHttpRequestBody = await (0, registry_1.getRpcFunctionOn)(this.client1, __name__ + '.writeHttpRequestBody', 'ob->');
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
                    })()]).finally(() => {
                    httpSession.free();
                });
            }
        }
    }
    exports.HttpOnRpcFunction = HttpOnRpcFunction;
});
//# sourceMappingURL=httponrpc.js.map