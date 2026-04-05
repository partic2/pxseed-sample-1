//import this module to Initialize pxseed environment on txiki.js platform.
define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/base", "pxprpc/base", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/nodehelper/kvdb", "partic2/pxprpcBinding/utils"], function (require, exports, base_1, jsutils1base, base_2, base_3, webutils_1, kvdb_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports.TjsTlsClient = exports.txikijsPxprpc = exports.PxprpcRtbIo = void 0;
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
    class TjsDefaultWebWorkerThread extends webutils_1.WebWorkerThread {
        async _createWorker() {
            return new Worker(workerEntryUrl);
        }
    }
    class CTxikijsPxprpcBinding {
        //Safe to call multitimes.
        async init() {
            if (this.rpc == undefined) {
                let { getRpc4RuntimeBridge0 } = await new Promise((resolve_1, reject_1) => { require(["partic2/pxprpcBinding/rpcregistry"], resolve_1, reject_1); });
                this.rpc = await getRpc4RuntimeBridge0();
            }
        }
        async NewRuntime() {
            let param = new base_2.Serializer().prepareSerializing(8);
            param.putInt(0);
            return await (await (0, utils_1.getRpcFunctionOn)(this.rpc, 'pxprpc_txikijs.NewRuntime', 'b->o')).call(param.build());
        }
        async RunJs(rt, jsCode) {
            await (await (0, utils_1.getRpcFunctionOn)(this.rpc, 'pxprpc_txikijs.RunJs', 'os->')).call(rt, jsCode);
        }
    }
    class PRtbWorkerMessagePort extends EventTarget {
        constructor(wt) {
            super();
            this.wt = wt;
        }
        ;
        postMessage(message) {
            this.wt.conn.send([tjs.engine.serialize(message)]);
        }
    }
    //Pxprpc runtime bridge based worker
    class PRtbWorkerThread extends webutils_1.WebWorkerThread {
        constructor() {
            super(...arguments);
            this.running = true;
        }
        static async serveAsWorkerParent() {
            let rtb = await new Promise((resolve_2, reject_2) => { require(['partic2/pxprpcBinding/pxprpc_rtbridge'], resolve_2, reject_2); });
            await rtb.ensureDefaultInvoker();
            PRtbWorkerThread.pipeServer = await rtb.defaultInvoker.pipe_serve(PRtbWorkerThread.thisPipeServerId);
            while (true) {
                let newConn = await rtb.defaultInvoker.pipe_accept(PRtbWorkerThread.pipeServer);
                let childWorkerId = new TextDecoder().decode(await rtb.defaultInvoker.io_receive(newConn));
                let connIo = {
                    conn: newConn,
                    send: async function (data) {
                        await rtb.defaultInvoker.io_send(this.conn, new Uint8Array((0, base_1.ArrayBufferConcat)(data)));
                    },
                    receive: async function () {
                        return await rtb.defaultInvoker.io_receive(this.conn);
                    },
                    close: function () {
                        this.conn.free().catch(() => { });
                    }
                };
                let cb = this.childrenWorkerConnected[childWorkerId];
                if (typeof cb === 'function') {
                    cb(connIo);
                }
                else {
                    connIo.close();
                }
            }
        }
        async _createWorker() {
            if (PRtbWorkerThread.pipeServer === null) {
                PRtbWorkerThread.serveAsWorkerParent();
                await (0, base_1.WaitUntil)(() => PRtbWorkerThread.pipeServer !== null, 16, 2000);
            }
            await exports.txikijsPxprpc.init();
            let rt1 = await exports.txikijsPxprpc.NewRuntime();
            if (PRtbWorkerThread.childrenWorkerConnected[this.workerId] == undefined) {
                let childConnected = new Promise((resolve) => {
                    PRtbWorkerThread.childrenWorkerConnected[this.workerId] = resolve;
                });
                let jsCode = `(async ()=>{
                globalThis.__workerId='${this.workerId}';
                globalThis.__PRTBParentPipeServerId='${PRtbWorkerThread.thisPipeServerId}';
                let {main}=await import(String.raw\`${(0, webutils_1.getWWWRoot)().replace(/\\/g, '/')}/txikirun.js\`);
                main('partic2/tjshelper/workerentry')
            })()`;
                exports.txikijsPxprpc.RunJs(rt1, jsCode);
                this.conn = await childConnected;
                (async () => {
                    while (this.running) {
                        let msg = await this.conn.receive();
                        let data = tjs.engine.deserialize(msg);
                        this.port.dispatchEvent(new MessageEvent('message', { data }));
                    }
                })();
                return new PRtbWorkerMessagePort(this);
            }
            else {
                throw new Error('Worker with same name is created.');
            }
        }
    }
    PRtbWorkerThread.thisPipeServerId = '/pxprpc/txikijs/worker/' + (0, base_3.GenerateRandomString)();
    PRtbWorkerThread.pipeServer = null;
    PRtbWorkerThread.childrenWorkerConnected = {};
    async function setupImpl() {
        (0, kvdb_1.setupImpl)();
        if (globalThis.__pxprpc4tjs__ == undefined) {
            (0, webutils_1.setWorkerThreadImplementation)(TjsDefaultWebWorkerThread);
        }
        else {
            (0, webutils_1.setWorkerThreadImplementation)(PRtbWorkerThread);
        }
        if (globalThis.close == undefined) {
            globalThis.close = () => {
                globalThis[Symbol.for('tjs.internal.core')]?.tjsClose?.();
            };
        }
        if (tjs.engine.bufferToBase64 != undefined) {
            jsutils1base.ArrayBufferToBase64 = function (buffer) {
                let bytes;
                if (buffer instanceof ArrayBuffer) {
                    bytes = new Uint8Array(buffer);
                }
                else {
                    bytes = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
                }
                return new TextDecoder().decode(tjs.engine.bufferToBase64(bytes));
            };
            jsutils1base.Base64ToArrayBuffer = function (base64) {
                let b64buf = new TextEncoder().encode(base64);
                return tjs.engine.base64ToBuffer(b64buf).buffer;
            };
        }
        let { polyfill } = await new Promise((resolve_3, reject_3) => { require(['partic2/tjshelper/tjsutil'], resolve_3, reject_3); });
        globalThis.fetch = polyfill.fetch;
        globalThis.WebSocket = polyfill.WebSocket;
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
    let tjstlscleanup = new FinalizationRegistry((index) => {
        if (index.get() >= 0)
            __pxprpc4tjs__.freeObjStore(index.get());
    });
    exports.txikijsPxprpc = new CTxikijsPxprpcBinding();
    class TjsTlsClient {
        constructor(servername) {
            this.index = new jsutils1base.Ref2(-1);
            jsutils1base.assert(__pxprpc4tjs__.embedtlsSslFunc2026 != undefined);
            jsutils1base.assert(__pxprpc4tjs__.embedtlsSslFunc2026(0) >= 6);
            this.index.set(__pxprpc4tjs__.embedtlsSslFunc2026(1, servername ?? ''));
            tjstlscleanup.register(this, this.index);
        }
        async readCipherSendBuffer(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(2, this.index.get(), buf);
            return r;
        }
        async writeCipherRecvBuffer(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(3, this.index.get(), buf);
            return r;
        }
        async writePlain(buf) {
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(4, this.index.get(), buf);
            if (r < 0)
                new Error('embedtls error:' + r);
            return r;
        }
        async readPlain(buf) {
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(5, this.index.get(), buf);
            if (r < 0)
                new Error('embedtls error:' + r);
            return r;
        }
        async close() {
            let index = this.index.get();
            this.index.set(-1);
            __pxprpc4tjs__.freeObjStore(index);
        }
    }
    exports.TjsTlsClient = TjsTlsClient;
    exports.__inited__ = (async () => {
        if (globalThis.tjs == undefined) {
            console.warn('This module is only used to initialize pxseed environment on txiki.js,' +
                ' and has no effect on other platform.' +
                'Also avoid to import this module on other platform.');
        }
        else {
            await setupImpl();
        }
    })();
});
//# sourceMappingURL=tjsenv.js.map