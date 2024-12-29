define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.errorCode = exports.JsonRpcResponse = exports.JsonRpcRequest = exports.JsonRpcError = void 0;
    class JsonRpcError extends Error {
        constructor(code, message, data) {
            super(message);
            this.code = code;
            this.data = data;
        }
    }
    exports.JsonRpcError = JsonRpcError;
    class JsonRpcRequest {
        constructor(method, params) {
            this.jsonrpc = "2.0";
            this.id = (0, base_1.GenerateRandomString)();
            this.method = '';
            if (method !== undefined) {
                this.method = method;
            }
            if (params !== undefined) {
                this.params = params;
            }
        }
        fromRaw(raw) {
            for (let t1 in raw) {
                this[t1] = raw[t1];
            }
            return this;
        }
        toRaw() {
            return (0, base_1.partial)(this, ['jsonrpc', 'id', 'method', 'params']);
        }
    }
    exports.JsonRpcRequest = JsonRpcRequest;
    class JsonRpcResponse {
        constructor(id) {
            this.jsonrpc = '2.0';
            this.id = 0;
            this.result = undefined;
            this.error = undefined;
            this.id = id;
        }
        setResult(result) {
            this.result = result;
            this.error = undefined;
        }
        setError(code, message, data) {
            this.error = { code, message, data };
            this.result = undefined;
        }
        fromRaw(raw) {
            for (let t1 in raw) {
                this[t1] = raw[t1];
            }
            return this;
        }
        toRaw() {
            return (0, base_1.partial)(this, ['jsonrpc', 'id', 'result', 'error']);
        }
    }
    exports.JsonRpcResponse = JsonRpcResponse;
    exports.errorCode = {
        parseError: -32700,
        invalidRequest: -32600,
        methodNotFound: -32601,
        invalidParams: -32602,
        internalError: -32603,
        firstServerError: -32000,
        lastServerError: -32099
    };
});
//# sourceMappingURL=prot.js.map