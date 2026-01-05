//import this module to Initialize pxseed environment on txiki.js platform.
define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/jsutils1/webutils", "partic2/nodehelper/kvdb"], function (require, exports, base_1, base_2, webutils_1, webutils_2, kvdb_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxprpcRtbIo = void 0;
    exports.setupImpl = setupImpl;
    var __name__ = base_1.requirejs.getLocalRequireModule(require);
    //txiki.js has bugly eventTarget, patch it before upstream fix it.
    Object.defineProperty(Event.prototype, 'target', { get: function () { return this.currentTarget; } });
    let workerEntryUrl = function () {
        try {
            return (0, webutils_1.getWWWRoot)() + '/txikirun.js';
        }
        catch (e) { }
        ;
        return '';
    }();
    const WorkerThreadMessageMark = '__messageMark_WorkerThread';
    class WebWorkerThread {
        constructor(workerId) {
            this.workerId = '';
            this.waitReady = new base_1.future();
            this.exitListener = () => {
                this.runScript(`require(['${webutils_2.__name__}'],function(webutils){
            webutils.lifecycle.dispatchEvent(new Event('exit'));
        })`);
            };
            this.processingScript = {};
            this.workerId = workerId ?? (0, base_2.GenerateRandomString)();
        }
        ;
        async start() {
            this.tjsWorker = new Worker(workerEntryUrl);
            this.port = this.tjsWorker;
            this.port.addEventListener('message', (msg) => {
                if (typeof msg.data === 'object' && msg.data[WorkerThreadMessageMark]) {
                    let { type, scriptId } = msg.data;
                    switch (type) {
                        case 'run':
                            this.onHostRunScript(msg.data.script);
                            break;
                        case 'onScriptResolve':
                            this.onScriptResult(msg.data.result, scriptId);
                            break;
                        case 'onScriptReject':
                            this.onScriptReject(msg.data.reason, scriptId);
                            break;
                        case 'ready':
                            this.waitReady.setResult(0);
                            break;
                        case 'closing':
                            webutils_1.lifecycle.removeEventListener('exit', this.exitListener);
                            this.onExit?.();
                            break;
                        case 'tjs-close':
                            this.tjsWorker?.terminate();
                            break;
                    }
                }
            });
            await this.waitReady.get();
            await this.runScript(`this.__workerId='${this.workerId}'`);
            webutils_1.lifecycle.addEventListener('exit', this.exitListener);
        }
        onHostRunScript(script) {
            (new Function('workerThread', script))(this);
        }
        async runScript(script, getResult) {
            let scriptId = '';
            if (getResult === true) {
                scriptId = (0, base_2.GenerateRandomString)();
                this.processingScript[scriptId] = new base_1.future();
            }
            this.port?.postMessage({ [WorkerThreadMessageMark]: true, type: 'run', script, scriptId });
            if (getResult === true) {
                return await this.processingScript[scriptId].get();
            }
        }
        onScriptResult(result, scriptId) {
            if (scriptId !== undefined && scriptId in this.processingScript) {
                let fut = this.processingScript[scriptId];
                delete this.processingScript[scriptId];
                fut.setResult(result);
            }
        }
        onScriptReject(reason, scriptId) {
            if (scriptId !== undefined && scriptId in this.processingScript) {
                let fut = this.processingScript[scriptId];
                delete this.processingScript[scriptId];
                fut.setException(new Error(reason));
            }
        }
        requestExit() {
            this.runScript('globalThis.close()');
        }
    }
    function setupImpl() {
        (0, kvdb_1.setupImpl)();
        (0, webutils_1.setWorkerThreadImplementation)(WebWorkerThread);
        if (globalThis.open == undefined) {
            globalThis.open = (async (url, target) => {
                let jscode = '';
                if (url.startsWith('http://') || url.startsWith('https://')) {
                    let resp = await fetch(url);
                    if (resp.ok) {
                        jscode = await resp.text();
                    }
                    else {
                        throw new Error(await resp.text());
                    }
                }
                else if (url.startsWith('file://')) {
                    let path = url.substring(7);
                    if (tjs.system.platform == 'windows') {
                        path = path.substring(1);
                    }
                    jscode = new TextDecoder().decode(await tjs.readFile(path));
                }
                new Function(jscode)();
            });
        }
    }
    class PxprpcRtbIo {
        static async connect(pipeServer) {
            let conn = __pxprpc4tjs__.pipeConnect(pipeServer);
            if (conn === 0n) {
                return null;
            }
            else {
                return new PxprpcRtbIo(conn);
            }
        }
        constructor(pipeAddr) {
            this.pipeAddr = pipeAddr;
        }
        ;
        receive() {
            if (this.pipeAddr === 0n)
                throw new Error('Not connected');
            return new Promise((resolve, reject) => {
                __pxprpc4tjs__.ioReceive(this.pipeAddr, (buf) => {
                    if (typeof buf === 'string') {
                        reject(new Error(buf));
                    }
                    else {
                        resolve(new Uint8Array(buf));
                    }
                });
            });
        }
        async send(data) {
            let res;
            if (this.pipeAddr === 0n)
                throw new Error('Not connected');
            if (data.length == 1 && data[0].byteOffset == 0 && data[0].length == data[0].buffer.byteLength) {
                res = __pxprpc4tjs__.ioSend(this.pipeAddr, data[0].buffer);
            }
            else {
                res = __pxprpc4tjs__.ioSend(this.pipeAddr, (0, base_1.ArrayBufferConcat)(data));
            }
            if (res != undefined) {
                throw new Error(res);
            }
        }
        close() {
            if (this.pipeAddr !== 0n) {
                __pxprpc4tjs__.ioClose(this.pipeAddr);
                this.pipeAddr = 0n;
            }
        }
    }
    exports.PxprpcRtbIo = PxprpcRtbIo;
    if (globalThis.tjs == undefined) {
        console.warn('This module is only used to initialize pxseed environment on txiki.js,' +
            ' and has no effect on other platform.' +
            'Also avoid to import this module on other platform.');
    }
    else {
        setupImpl();
    }
});
//# sourceMappingURL=tjsenv.js.map