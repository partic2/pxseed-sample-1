define("partic2/pxprpcBinding/utils", ["require", "exports", "pxprpc/extend"], function (require, exports, extend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RpcExtendServerCallableWithServerContext = void 0;
    exports.getRpcLocalVariable = getRpcLocalVariable;
    exports.setRpcLocalVariable = setRpcLocalVariable;
    exports.getRpcFunctionOn = getRpcFunctionOn;
    let rpcInternalProp = Symbol('partic2/pxprpcBinding/utils.rpcInternalProp');
    function getRpcLocalVariable(rpcObj, name) {
        let ip = {};
        if (rpcObj[rpcInternalProp] != undefined) {
            ip = rpcObj[rpcInternalProp];
        }
        else {
            rpcObj[rpcInternalProp] = ip;
        }
        return ip['v:' + name];
    }
    function setRpcLocalVariable(rpcObj, name, v) {
        let ip = {};
        if (rpcObj[rpcInternalProp] != undefined) {
            ip = rpcObj[rpcInternalProp];
        }
        else {
            rpcObj[rpcInternalProp] = ip;
        }
        ip['v:' + name] = v;
    }
    async function getRpcFunctionOn(client, funcName, typ) {
        let ip = {};
        if (client[rpcInternalProp] != undefined) {
            ip = client[rpcInternalProp];
        }
        else {
            client[rpcInternalProp] = ip;
        }
        if (ip['f:' + funcName] === undefined) {
            let fn = await client.getFunc(funcName);
            if (fn != null)
                fn.typedecl(typ);
            ip['f:' + funcName] = fn;
        }
        return ip['f:' + funcName];
    }
    class RpcExtendServerCallableWithServerContext extends extend_1.RpcExtendServerCallable {
        constructor(wrapped2) {
            super(async (...args) => {
                let server = this._sessionServer;
                this._sessionServerTaked.r();
                this._sessionServerTaked = null;
                return wrapped2(server, ...args);
            });
            this._sessionServer = null;
            this._sessionServerTaked = null;
        }
        async call(req) {
            if (this._sessionServerTaked != null) {
                await this._sessionServerTaked.p;
            }
            this._sessionServerTaked = {};
            this._sessionServerTaked.p = new Promise((r) => { this._sessionServerTaked.r = r; });
            this._sessionServer = req.context;
            return super.call(req);
        }
    }
    exports.RpcExtendServerCallableWithServerContext = RpcExtendServerCallableWithServerContext;
});
