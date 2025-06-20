//import this module to Initialize pxseed environment on txiki.js platform.
define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/CodeRunner/Inspector", "partic2/pxprpcClient/registry"], function (require, exports, base_1, base_2, webutils_1, Inspector_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PxprpcRtbIo = exports.FsBasedKvDbV1 = void 0;
    exports.setupImpl = setupImpl;
    var __name__ = base_1.requirejs.getLocalRequireModule(require);
    //txiki.js has bugly eventTarget, patch it before upstream fix it.
    Object.defineProperty(Event.prototype, 'target', { get: function () { return this.currentTarget; } });
    async function writeFile(path, data) {
        let fh = await tjs.open(path, 'w');
        try {
            await fh.write(data);
        }
        finally {
            fh.close();
        }
    }
    class FsBasedKvDbV1 {
        constructor() {
            this.baseDir = '';
        }
        async init(baseDir) {
            this.baseDir = baseDir;
            try {
                let data = await tjs.readFile(baseDir + '/config.json');
                this.config = { fileList: {}, ...JSON.parse(new TextDecoder().decode(data)) };
            }
            catch (e) {
                this.config = { fileList: {} };
                await writeFile(baseDir + '/config.json', new TextEncoder().encode('{}'));
            }
        }
        async setItem(key, val) {
            if (!(key in this.config.fileList)) {
                this.config.fileList[key] = { fileName: (0, base_2.GenerateRandomString)(), type: 'json' };
            }
            let { fileName } = this.config.fileList[key];
            if (val instanceof ArrayBuffer) {
                this.config.fileList[key].type = 'ArrayBuffer';
                await writeFile(`${this.baseDir}/${fileName}`, new Uint8Array(val));
            }
            else if (val instanceof Uint8Array) {
                this.config.fileList[key].type = 'Uint8Array';
                await writeFile(`${this.baseDir}/${fileName}`, val);
            }
            else if (val instanceof Int8Array) {
                this.config.fileList[key].type = 'Int8Array';
                await writeFile(`${this.baseDir}/${fileName}`, new Uint8Array(val.buffer, val.byteOffset, val.length));
            }
            else {
                let data = JSON.stringify((0, Inspector_1.toSerializableObject)(val, { maxDepth: 0x7fffffff, enumerateMode: 'for in', maxKeyCount: 0x7fffffff }));
                await writeFile(`${this.baseDir}/${fileName}`, new TextEncoder().encode(data));
            }
            await writeFile(this.baseDir + '/config.json', new TextEncoder().encode(JSON.stringify(this.config)));
        }
        async getItem(key) {
            if (!(key in this.config.fileList)) {
                return undefined;
            }
            let { fileName, type } = this.config.fileList[key];
            try {
                if (type === 'ArrayBuffer') {
                    return (await tjs.readFile(`${this.baseDir}/${fileName}`)).buffer;
                }
                else if (type === 'Uint8Array') {
                    return new Uint8Array((await tjs.readFile(`${this.baseDir}/${fileName}`)).buffer);
                }
                else if (type === 'Int8Array') {
                    return new Int8Array((await tjs.readFile(`${this.baseDir}/${fileName}`)).buffer);
                }
                else if (type === 'json') {
                    let data = await tjs.readFile(`${this.baseDir}/${fileName}`);
                    let r = (0, Inspector_1.fromSerializableObject)(JSON.parse(new TextDecoder().decode(data)), {});
                    return r;
                }
            }
            catch (e) {
                delete this.config.fileList[key];
                return undefined;
            }
        }
        getAllKeys(onKey, onErr) {
            for (let file in this.config.fileList) {
                let next = onKey(file);
                if (next.stop === true) {
                    break;
                }
            }
            onKey(null);
        }
        async delete(key) {
            let { fileName } = this.config.fileList[key];
            await tjs.remove(this.baseDir + '/' + fileName);
            delete this.config.fileList[key];
            await writeFile(this.baseDir + '/config.json', new TextEncoder().encode(JSON.stringify(this.config)));
        }
        async close() {
            await writeFile(this.baseDir + '/config.json', new TextEncoder().encode(JSON.stringify(this.config)));
        }
    }
    exports.FsBasedKvDbV1 = FsBasedKvDbV1;
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
                    }
                }
            });
            await this.waitReady.get();
            await this.runScript(`this.__workerId='${this.workerId}'`);
            webutils_1.lifecycle.addEventListener('pause', () => {
                this.runScript(`require(['${__name__}'],function(webutils){
                webutils.lifecycle.dispatchEvent(new Event('pause'));
            })`);
            });
            webutils_1.lifecycle.addEventListener('resume', () => {
                this.runScript(`require(['${__name__}'],function(webutils){
                webutils.lifecycle.dispatchEvent(new Event('resume'));
            })`);
            });
            webutils_1.lifecycle.addEventListener('exit', () => {
                this.runScript(`require(['${__name__}'],function(webutils){
                webutils.lifecycle.dispatchEvent(new Event('exit'));
            })`);
            });
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
    let cachePath = webutils_1.path.join((0, webutils_1.getWWWRoot)(), __name__, '..');
    function setupImpl() {
        (0, webutils_1.setKvStoreBackend)(async (dbname) => {
            await tjs.makeDir(webutils_1.path.join(cachePath, 'data'), { recursive: true });
            let dbMap = {};
            let filename = (0, base_2.GenerateRandomString)();
            try {
                dbMap = JSON.parse(new TextDecoder().decode(await tjs.readFile(webutils_1.path.join(cachePath, 'data', 'meta-dbMap'))));
            }
            catch (e) { }
            ;
            if (dbname in dbMap) {
                filename = dbMap[dbname];
            }
            else {
                dbMap[dbname] = filename;
            }
            await writeFile(webutils_1.path.join(cachePath, 'data', 'meta-dbMap'), new TextEncoder().encode(JSON.stringify(dbMap)));
            let db = new FsBasedKvDbV1();
            await tjs.makeDir(webutils_1.path.join(cachePath, 'data', filename), { recursive: true });
            await db.init(webutils_1.path.join(cachePath, 'data', filename));
            return db;
        });
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
                if (target == '_self') {
                    new Function(jscode)();
                }
                else {
                    if (target == '_blank' || target == undefined) {
                        target = (0, base_2.GenerateRandomString)();
                    }
                    let worker = new registry_1.RpcWorker(target);
                    let workerClient = await worker.ensureClient();
                    let workerFuncs = await (0, registry_1.getAttachedRemoteRigstryFunction)(workerClient);
                    await workerFuncs.jsExec(`new Function(${JSON.stringify(jscode)})();`, null);
                }
            });
        }
        if (!registry_1.rpcWorkerInitModule.includes(__name__)) {
            registry_1.rpcWorkerInitModule.push(__name__);
        }
    }
    class PxprpcRtbIo {
        static async connect(pipeServer) {
            let conn = __pxprpc4tjs__.pipeConnect(pipeServer);
            if (conn == BigInt(0)) {
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
            __pxprpc4tjs__.ioClose(this.pipeAddr);
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