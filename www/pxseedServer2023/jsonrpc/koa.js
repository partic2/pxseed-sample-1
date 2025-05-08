define(["require", "exports", "partic2/nodehelper/nodeio", "./prot"], function (require, exports, nodeio_1, prot_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Koa2SimpleHttp = exports.SimpleHttpJsonRpc = exports.KoaJsonRpc = void 0;
    exports.handleJsonRpcRequestWithHttpInfo = handleJsonRpcRequestWithHttpInfo;
    const decoder = new TextDecoder();
    async function handleJsonRpcRequestWithHttpInfo(handlers, req, info) {
        let handler = handlers.get(req.method);
        let resp = new prot_1.JsonRpcResponse(req.id);
        if (handler == null) {
            resp = new prot_1.JsonRpcResponse(req.id);
            resp.setError(prot_1.errorCode.methodNotFound, 'Method Not Found.');
        }
        else {
            try {
                let result;
                result = await handler(req.params, info);
                resp.setResult(result);
            }
            catch (e) {
                if (e instanceof prot_1.JsonRpcError) {
                    resp.setError(e.code, e.message);
                }
                else {
                    resp.setError(prot_1.errorCode.internalError, e.toString());
                }
            }
            ;
        }
        return resp;
    }
    class KoaJsonRpc {
        constructor() {
            this.handlers = new Map();
        }
        setHandler(method, handler) {
            this.handlers.set(method, handler);
            return this;
        }
        middleware() {
            return [async (ctx, next) => {
                    let r = (0, nodeio_1.wrapReadable)(ctx.req);
                    let body = await r.readAll();
                    try {
                        let parsedBody = JSON.parse(decoder.decode(body));
                        if (parsedBody instanceof Array) {
                            let jreq = new Array();
                            for (let t1 of parsedBody) {
                                let t2 = new prot_1.JsonRpcRequest().fromRaw(t1);
                                jreq.push(t2);
                            }
                            let jresp = await Promise.all(jreq.map(t1 => handleJsonRpcRequestWithHttpInfo(this.handlers, t1, { headers: ctx.header, sourceIp: ctx.ip, koa: ctx })));
                            ctx.response.body = JSON.stringify(jresp.map(v => v.toRaw()));
                        }
                        else {
                            let jreq = new prot_1.JsonRpcRequest().fromRaw(parsedBody);
                            let jresp = await handleJsonRpcRequestWithHttpInfo(this.handlers, jreq, { headers: ctx.header, sourceIp: ctx.ip, koa: ctx });
                            ctx.response.body = JSON.stringify(jresp.toRaw());
                        }
                        await next();
                    }
                    catch (e) {
                        ctx.response.status = 400;
                    }
                }];
        }
    }
    exports.KoaJsonRpc = KoaJsonRpc;
    //To make request proxy easier
    class SimpleHttpJsonRpc {
        constructor() {
            this.registry = {};
        }
        async handleSimpleHttp(header, body) {
            let parsedHeader = JSON.parse(header);
            if (parsedHeader.method === 'POST') {
                let handlers = this.registry[parsedHeader.path];
                if (handlers != undefined) {
                    let req = new prot_1.JsonRpcRequest();
                    req.fromRaw(JSON.parse(new TextDecoder().decode(body)));
                    let resp = await handleJsonRpcRequestWithHttpInfo(handlers, req, parsedHeader);
                    return [JSON.stringify({
                            status: 200,
                            headers: { 'content-type': 'application/json; charset=utf-8' }
                        }), new TextEncoder().encode(JSON.stringify(resp.toRaw()))];
                }
                else {
                    return [JSON.stringify({
                            status: 404,
                            headers: { 'content-type': 'text/plain; charset=utf-8' }
                        }), new TextEncoder().encode("path not found")];
                }
            }
            else {
                return [JSON.stringify({
                        status: 404,
                        headers: { 'content-type': 'text/plain; charset=utf-8' }
                    }), new TextEncoder().encode("path not found")];
            }
        }
    }
    exports.SimpleHttpJsonRpc = SimpleHttpJsonRpc;
    class Koa2SimpleHttp {
        constructor() {
            this.simpleHttpHandler = async (header, body) => {
                return [
                    JSON.stringify({
                        status: 404
                    }),
                    new TextEncoder().encode('No handler')
                ];
            };
        }
        middleware() {
            return [async (ctx, next) => {
                    let r = (0, nodeio_1.wrapReadable)(ctx.req);
                    let body = await r.readAll();
                    try {
                        let [rheader, rbody] = await this.simpleHttpHandler(JSON.stringify({
                            method: ctx.method,
                            path: ctx.path,
                            sourceIp: ctx.ip,
                            headers: ctx.header
                        }), new Uint8Array(body));
                        let parsedHeader = JSON.parse(rheader);
                        ctx.response.status = parsedHeader.status;
                        if (parsedHeader.headers != undefined) {
                            for (let t1 in parsedHeader.headers) {
                                if (t1.toLowerCase() == 'content-type') {
                                    ctx.response.type = parsedHeader.headers[t1];
                                }
                                else {
                                    ctx.response.header[t1] = parsedHeader.headers[t1];
                                }
                            }
                        }
                        let { Readable } = await new Promise((resolve_1, reject_1) => { require(['stream'], resolve_1, reject_1); });
                        ctx.response.body = Readable.from([rbody]);
                        await next();
                    }
                    catch (e) {
                        ctx.response.status = 502;
                    }
                }];
        }
    }
    exports.Koa2SimpleHttp = Koa2SimpleHttp;
});
//# sourceMappingURL=koa.js.map