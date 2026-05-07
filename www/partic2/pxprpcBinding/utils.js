define("partic2/pxprpcBinding/utils", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.getRpcLocalVariable = getRpcLocalVariable;
    exports.setRpcLocalVariable = setRpcLocalVariable;
    exports.getRpcFunctionOn = getRpcFunctionOn;
    let rpcInternalProp = Symbol('partic2/pxprpcBinding/utils.rpcInternalProp');
    function getRpcLocalVariable(client, name) {
        let ip = {};
        if (client[rpcInternalProp] != undefined) {
            ip = client[rpcInternalProp];
        }
        else {
            client[rpcInternalProp] = ip;
        }
        return ip['v:' + name];
    }
    function setRpcLocalVariable(client, name, v) {
        let ip = {};
        if (client[rpcInternalProp] != undefined) {
            ip = client[rpcInternalProp];
        }
        else {
            client[rpcInternalProp] = ip;
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
});
