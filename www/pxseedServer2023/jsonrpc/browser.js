define(["require", "exports", "partic2/jsutils1/webutils", "./prot"], function (require, exports, webutils_1, prot_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JsonRpcClient = void 0;
    class JsonRpcClient {
        constructor(url, httpClient) {
            this.url = url;
            this.httpClient = httpClient ?? webutils_1.defaultHttpClient;
        }
        async request(method, params) {
            let req = new prot_1.JsonRpcRequest(method, params);
            let httpResp = await this.httpClient.fetch(this.url, {
                method: 'POST',
                body: JSON.stringify(req.toRaw())
            });
            let respText = await httpResp.text();
            let resp = new prot_1.JsonRpcResponse(0).fromRaw(JSON.parse(respText));
            if (resp.error != null) {
                throw new prot_1.JsonRpcError(resp.error.code, resp.error.message, resp.error.data);
            }
            else {
                return resp.result;
            }
        }
    }
    exports.JsonRpcClient = JsonRpcClient;
});
//# sourceMappingURL=browser.js.map