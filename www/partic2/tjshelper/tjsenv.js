//import this module to Initialize pxseed environment on txiki.js platform.
define("partic2/tjshelper/tjsenv", ["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/base", "pxprpc/base", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/nodehelper/kvdb", "partic2/pxprpcBinding/utils"], function (require, exports, base_1, jsutils1base, base_2, base_3, webutils_1, kvdb_1, utils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports.TjsWidccRuntime = exports.TjsWidccModule = exports.TjsWidccSymbol = exports.TjsTlsServer = exports.TjsTlsClient = exports.txikijsPxprpc = exports.PxprpcRtbIo = void 0;
    exports.setupImpl = setupImpl;
    exports.widccReadMemory = widccReadMemory;
    exports.widccWriteMemory = widccWriteMemory;
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
            jsutils1base.assert(this.index.get() >= 0);
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(4, this.index.get(), buf);
            if (r < 0)
                throw new Error('embedtls error:' + r);
            return r;
        }
        async readPlain(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(5, this.index.get(), buf);
            if (r < 0)
                throw new Error('embedtls error:' + r);
            return r;
        }
        async close() {
            let index = this.index.get();
            if (index < 0)
                return;
            this.index.set(-1);
            __pxprpc4tjs__.freeObjStore(index);
        }
    }
    exports.TjsTlsClient = TjsTlsClient;
    //Server side TLS. crtPem/keyPem are PEM encoded certificate and private key.
    class TjsTlsServer {
        constructor(crtPem, keyPem) {
            this.index = new jsutils1base.Ref2(-1);
            jsutils1base.assert(__pxprpc4tjs__.embedtlsSslFunc2026 != undefined);
            jsutils1base.assert(__pxprpc4tjs__.embedtlsSslFunc2026(0) >= 12);
            this.index.set(__pxprpc4tjs__.embedtlsSslFunc2026(6, crtPem, keyPem));
            tjstlscleanup.register(this, this.index);
        }
        //Read cipher text produced by handshake/readPlain/writePlain, should be sent to client.
        async readCipherSendBuffer(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            return __pxprpc4tjs__.embedtlsSslFunc2026(7, this.index.get(), buf);
        }
        //Write cipher text received from client.
        async writeCipherRecvBuffer(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            return __pxprpc4tjs__.embedtlsSslFunc2026(8, this.index.get(), buf);
        }
        async writePlain(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(9, this.index.get(), buf);
            if (r < 0)
                throw new Error('embedtls error:' + r);
            return r;
        }
        async readPlain(buf) {
            jsutils1base.assert(this.index.get() >= 0);
            let r = __pxprpc4tjs__.embedtlsSslFunc2026(10, this.index.get(), buf);
            if (r < 0)
                throw new Error('embedtls error:' + r);
            return r;
        }
        //Returns 0 while the handshake needs more data, positive/negative result otherwise.
        async handshake() {
            jsutils1base.assert(this.index.get() >= 0);
            return __pxprpc4tjs__.embedtlsSslFunc2026(11, this.index.get());
        }
        async close() {
            let index = this.index.get();
            if (index < 0)
                return;
            this.index.set(-1);
            __pxprpc4tjs__.freeObjStore(index);
        }
    }
    exports.TjsTlsServer = TjsTlsServer;
    let widccjitcleanup = new FinalizationRegistry((index) => {
        if (index.get() >= 0)
            __pxprpc4tjs__.freeObjStore(index.get());
    });
    function ensureWidccjit() {
        jsutils1base.assert(__pxprpc4tjs__.widccjitFunc2026 != undefined, 'widccjit is not available on this txiki.js build.');
        return __pxprpc4tjs__.widccjitFunc2026;
    }
    class TjsWidccSymbol {
        constructor(name, index) {
            this.name = name;
            this.index = new jsutils1base.Ref2(-1);
            this.index.set(index);
            widccjitcleanup.register(this, this.index);
        }
        get address() {
            jsutils1base.assert(this.index.get() >= 0);
            return ensureWidccjit()(11, this.index.get());
        }
        //argTypes/resultTypes use one char per value: 'i' int32, 'l' int64, 'p' pointer,
        //result type 'v' means void. Results are always returned as an array.
        call(argTypes, args, resultTypes = '') {
            jsutils1base.assert(this.index.get() >= 0);
            return ensureWidccjit()(12, this.index.get(), argTypes, args, resultTypes);
        }
        close() {
            let index = this.index.get();
            if (index < 0)
                return;
            this.index.set(-1);
            __pxprpc4tjs__.freeObjStore(index);
        }
    }
    exports.TjsWidccSymbol = TjsWidccSymbol;
    class TjsWidccModule {
        constructor(index) {
            this.index = new jsutils1base.Ref2(-1);
            this.index.set(index);
            widccjitcleanup.register(this, this.index);
        }
        unload() {
            let index = this.index.get();
            if (index < 0)
                return false;
            return ensureWidccjit()(10, index);
        }
        close() {
            let index = this.index.get();
            if (index < 0)
                return;
            this.index.set(-1);
            __pxprpc4tjs__.freeObjStore(index);
        }
    }
    exports.TjsWidccModule = TjsWidccModule;
    class TjsWidccRuntime {
        constructor() {
            this.index = new jsutils1base.Ref2(-1);
            let func = ensureWidccjit();
            jsutils1base.assert(func(0) >= 15);
            this.index.set(func(1));
            widccjitcleanup.register(this, this.index);
        }
        addHostFunction(name, address) {
            jsutils1base.assert(this.index.get() >= 0);
            return ensureWidccjit()(3, this.index.get(), name, address);
        }
        addHostVariable(name, address) {
            jsutils1base.assert(this.index.get() >= 0);
            return ensureWidccjit()(4, this.index.get(), name, address);
        }
        lookup(name) {
            jsutils1base.assert(this.index.get() >= 0);
            let id = ensureWidccjit()(5, this.index.get(), name);
            if (id === null || id === undefined)
                return null;
            return new TjsWidccSymbol(name, id);
        }
        listSymbols() {
            jsutils1base.assert(this.index.get() >= 0);
            return ensureWidccjit()(6, this.index.get());
        }
        setIncludePaths(paths) {
            jsutils1base.assert(this.index.get() >= 0);
            ensureWidccjit()(7, this.index.get(), paths);
        }
        loadCode(path, source) {
            jsutils1base.assert(this.index.get() >= 0);
            return new TjsWidccModule(ensureWidccjit()(8, this.index.get(), path, source));
        }
        loadCodeFile(path) {
            jsutils1base.assert(this.index.get() >= 0);
            return new TjsWidccModule(ensureWidccjit()(9, this.index.get(), path));
        }
        //Free the native runtime. Modules/symbols still hold their own reference to it.
        deleteRuntime() {
            let index = this.index.get();
            if (index < 0)
                return;
            ensureWidccjit()(2, index);
        }
        close() {
            let index = this.index.get();
            if (index < 0)
                return;
            this.index.set(-1);
            __pxprpc4tjs__.freeObjStore(index);
        }
    }
    exports.TjsWidccRuntime = TjsWidccRuntime;
    function widccReadMemory(address, length) {
        return ensureWidccjit()(13, address, length);
    }
    function widccWriteMemory(address, data) {
        ensureWidccjit()(14, address, data);
    }
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
