define(["require", "exports", "partic2/jsutils1/base"], function (require, exports, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.httpHandler = exports.allHttpSessions = void 0;
    exports.httpRequest = httpRequest;
    exports.httpSendBodyB64 = httpSendBodyB64;
    exports.httpWaitResponse = httpWaitResponse;
    exports.httpRecvBodyB64 = httpRecvBodyB64;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    class HttpSession {
        constructor() {
            this.requestHeaders = {};
            this.responseHeaders = {};
            this.requestBody = new base_1.ArrayWrap2();
            this.responseBody = new base_1.ArrayWrap2();
            this.status = new base_1.future();
            this.method = 'GET';
            this.path = '';
            this.processing = false;
        }
        async process() {
            this.processing = true;
            let req = new Request('http://0.0.0.0' + this.path, {
                method: this.method,
                headers: this.requestHeaders,
                body: new ReadableStream({
                    pull: async (controller) => {
                        let chunk = await this.requestBody.queueBlockShift();
                        if (chunk.length > 0) {
                            controller.enqueue(chunk);
                        }
                        else {
                            controller.close();
                        }
                    }
                })
            });
            let resp = await exports.httpHandler.onfetch(req);
            resp.headers.forEach((v, k) => { this.responseHeaders[k] = v; });
            if (resp.body == undefined) {
                this.responseBody.queueSignalPush(new Uint8Array(0));
            }
            else {
                let reader = resp.body.getReader();
                while (this.processing) {
                    let result = await reader.read();
                    if (result.value != undefined && result.value.length > 0) {
                        this.responseBody.queueSignalPush(result.value);
                    }
                    if (result.done) {
                        break;
                    }
                }
                this.responseBody.queueSignalPush(new Uint8Array(0));
            }
        }
    }
    exports.allHttpSessions = {};
    async function httpRequest(req) {
        let s = new HttpSession();
        s.method = req.method;
        s.path = req.path;
        s.requestHeaders = req.headers;
        let sid = (0, base_1.GenerateRandomString)();
        exports.allHttpSessions[sid] = s;
        s.process();
        return sid;
    }
    //Consider better binary transfer
    async function httpSendBodyB64(sid, b64body) {
        let s = exports.allHttpSessions[sid];
        s.requestBody.queueSignalPush(new Uint8Array((0, base_1.Base64ToArrayBuffer)(b64body)));
    }
    async function httpWaitResponse(sid) {
        let s = exports.allHttpSessions[sid];
        let [status, statusText] = await s.status.get();
        return {
            status, statusText,
            headers: s.responseHeaders
        };
    }
    async function httpRecvBodyB64(sid) {
        let chunk = await exports.allHttpSessions[sid].responseBody.queueBlockShift();
        if (chunk.length == 0) {
            delete exports.allHttpSessions[sid];
        }
        return (0, base_1.ArrayBufferToBase64)(chunk);
    }
    exports.httpHandler = {
        onfetch: async () => new Response()
    };
});
//# sourceMappingURL=httponrpc.js.map