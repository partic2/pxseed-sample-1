define("partic2/JsNotebook/workerinit", ["require", "exports", "partic2/CodeRunner/JsEnviron", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "partic2/CodeRunner/CodeContext", "partic2/CodeRunner/RemoteCodeContext", "partic2/CodeRunner/jsutils2", "pxprpc/extend", "pxprpc/base", "partic2/jsutils1/webutils"], function (require, exports, JsEnviron_1, base_1, registry_1, CodeContext_1, RemoteCodeContext_1, jsutils2_1, extend_1, base_2, webutils_1) {
    "use strict";
    var _a;
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OpenedJsNotebookFile = exports.runningRunCodeContextForNotebookFile = exports.NotebookFileData = exports.__internal__ = exports.__inited__ = exports.ensureInited = exports.__name__ = void 0;
    exports.initNotebookCodeEnv = initNotebookCodeEnv;
    exports.openNotebookFile = openNotebookFile;
    exports.runNotebook = runNotebook;
    exports.__name__ = 'partic2/JsNotebook/workerinit';
    exports.ensureInited = new base_1.future();
    exports.__inited__ = (async () => {
        if (typeof (globalThis.importScripts) === 'function' || globalThis.document != undefined) {
            await (0, JsEnviron_1.ensureDefaultFileSystem)();
            await JsEnviron_1.defaultFileSystem.ensureInited();
            await (0, JsEnviron_1.installRequireProvider)(JsEnviron_1.defaultFileSystem);
        }
        registry_1.rpcWorkerInitModule.push(exports.__name__);
    })();
    class LoopbackRpcClient extends registry_1.ClientInfo {
        constructor() {
            super(...arguments);
            this.client = null;
        }
        async ensureConnected() {
            if (!this.connected()) {
                let [c2s, s2c] = (0, registry_1.createIoPipe)();
                new extend_1.RpcExtendServer1(new base_2.Server(s2c)).serve().catch(() => { });
                this.client = await new extend_1.RpcExtendClient1(new base_2.Client(c2s)).init();
            }
            return this.client;
        }
    }
    exports.__internal__ = {
        LoopbackRpcClient
    };
    class NotebookFileData {
        constructor() {
            this.cells = null;
            this.startupScript = '';
        }
        dump() {
            return (0, jsutils2_1.utf8conv)(JSON.stringify({ ver: 1, rpc: this.rpc, startupScript: this.startupScript, cells: this.cells }));
        }
        load(data) {
            let r = JSON.parse((0, jsutils2_1.utf8conv)(data));
            if (r.rpc != undefined)
                this.rpc = r.rpc;
            this.startupScript = r.startupScript ?? '';
            this.cells = r.cells ?? CodeContext_1.newCodeCellListData.get()().saveTo();
        }
        getCellsData() {
            let cld = CodeContext_1.newCodeCellListData.get()();
            if (this.cells != null) {
                cld.loadFrom(this.cells);
            }
            return cld;
        }
        setCellsData(ccld) {
            this.cells = ccld.saveTo();
        }
    }
    exports.NotebookFileData = NotebookFileData;
    exports.runningRunCodeContextForNotebookFile = new Map();
    //treat both slash and back slash as sep
    function dirname2(path) {
        for (let t1 = path.length - 1; t1 >= 0; t1--) {
            let ch = path.charAt(t1);
            if ('\\/'.includes(ch)) {
                return path.substring(0, t1);
            }
        }
        return '';
    }
    async function initNotebookCodeEnv(_ENV, opt) {
        if (_ENV == undefined) {
            _ENV = CodeContext_1.TaskLocalEnv.get();
        }
        await (0, JsEnviron_1.ensureDefaultFileSystem)();
        let fs = {
            simple: JsEnviron_1.defaultFileSystem,
            codePath: opt?.codePath,
            loadScript: async function (path) {
                (0, base_1.assert)(this.simple != undefined);
                if (path.startsWith('.')) {
                    (0, base_1.assert)(this.codePath != undefined);
                    path = dirname2(this.codePath) + path.substring(1);
                }
                let jsbin = await this.simple.readAll(path);
                if (jsbin == null) {
                    throw new Error('File not existed');
                }
                let js = new TextDecoder().decode(jsbin);
                let cc = _ENV.__priv_codeContext;
                let savedCodePath = this.codePath;
                this.codePath = path;
                await cc.runCode(js, '');
                this.codePath = savedCodePath;
            },
            loadNotebook: async function (path) {
                (0, base_1.assert)(this.simple != undefined);
                if (path.startsWith('.')) {
                    (0, base_1.assert)(this.codePath != undefined);
                    path = dirname2(this.codePath) + path.substring(1);
                }
                let codeContext = await runNotebook(path, 'all cells');
                return codeContext.localScope;
            }
        };
        _ENV.fs = fs;
        _ENV.import2env = async (moduleName) => {
            let mod = await new Promise((resolve_1, reject_1) => { require([moduleName], resolve_1, reject_1); });
            for (let [k1, v1] of Object.entries(mod)) {
                _ENV[k1] = v1;
            }
        };
        _ENV.globalThis = globalThis;
        _ENV.fetch = webutils_1.defaultHttpClient.fetch.bind(webutils_1.defaultHttpClient);
        _ENV.restartThisWorker = async () => {
            _ENV.jsnotebook?.notebookViewer?.reconnectCodeContextSoon?.();
            await (0, base_1.sleep)(100);
            globalThis.close();
        };
        let callMethodAttachedOnNotebookViewer = (name, argv) => {
            _ENV.event.dispatchEvent(new CodeContext_1.CodeContextEvent(`${webutils_1.path.join(exports.__name__, '../notebook')}.NotebookViewer`, { data: { call: name, argv: argv ?? [] } }));
        };
        let jsnotebook = {
            callMethodAttachedOnNotebookViewer,
            callFunctionInNotebookWebui: function (...argv) { callMethodAttachedOnNotebookViewer('callFunctionInNotebookWebui', argv); },
            notebookViewer: {
                openRpcChooser: () => callMethodAttachedOnNotebookViewer('openRpcChooser', []),
                updateNotebookCodeCellsData: () => callMethodAttachedOnNotebookViewer('updateNotebookCodeCellsData', []),
                setCodeCellsDataOnRemoteJsNotebook: () => callMethodAttachedOnNotebookViewer('setCodeCellsDataOnRemoteJsNotebook', []),
                reconnectCodeContextSoon: () => callMethodAttachedOnNotebookViewer('reconnectCodeContextSoon', [])
            },
            startupScript: opt?.startupScript ?? '',
        };
        _ENV.jsnotebook = jsnotebook;
        if (opt?.startupScript != undefined) {
            let cc = _ENV.__priv_codeContext;
            await cc.runCode(opt.startupScript, '');
        }
    }
    class OpenedJsNotebookFile {
        constructor(notebookFilePath, opt) {
            this.notebookFilePath = notebookFilePath;
            this.opt = opt;
            this[_a] = {};
            this.connector = null;
            this.notebookFileData = new NotebookFileData();
            this.closed = new base_1.future();
        }
        ;
        async loadFromFile() {
            await (0, JsEnviron_1.ensureDefaultFileSystem)();
            try {
                let data = await JsEnviron_1.defaultFileSystem.readAll(this.notebookFilePath);
                if (data != undefined) {
                    this.notebookFileData.load(data);
                }
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
            }
        }
        async saveToFile() {
            await (0, JsEnviron_1.ensureDefaultFileSystem)();
            try {
                let c1 = await this.ensureRunCodeContextConnector();
                let { startupScript } = JSON.parse((await c1.runCode(`
return JSON.stringify({startupScript:jsnotebook.startupScript})
`)).stringResult ?? '{}');
                if (startupScript != undefined) {
                    this.notebookFileData.startupScript = startupScript;
                }
                await JsEnviron_1.defaultFileSystem.writeAll(this.notebookFilePath, this.notebookFileData.dump());
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
            }
        }
        async ensureRunCodeContextConnector() {
            if (this.connector == null) {
                if (this.opt?.noRpc === true) {
                    await this.useRpc(null);
                }
                else {
                    await this.useRpc(this.notebookFileData.rpc ?? null);
                }
            }
            return this.connector;
        }
        async useRpc(name) {
            if (this.connector != null) {
                let c1 = this.connector;
                this.connector = null;
                c1.close?.();
            }
            this.notebookFileData.rpc = name ?? undefined;
            if (this.notebookFileData.rpc == undefined) {
                this.connector = await (0, RemoteCodeContext_1.createConnectorWithNewRunCodeContext)();
            }
            else {
                let client = await (0, registry_1.getPersistentRegistered)(this.notebookFileData.rpc);
                (0, base_1.assert)(client != undefined);
                this.connector = await (0, registry_1.easyCallRemoteJsonFunction)(await client.ensureConnected(), 'partic2/CodeRunner/RemoteCodeContext', 'createConnectorWithNewRunCodeContext', []);
            }
            this.connector.runCode(`return new Promise((resolve)=>event.addEventListener('close',()=>resolve(${this.connector.connectorId})))`, '').then((r) => {
                if (this.connector?.connectorId === r.stringResult) {
                    this.closed.setResult();
                }
            }).catch((err) => console.warn(err.stack));
            await this.connector.runCode(`await (await import('partic2/JsNotebook/workerinit')).initNotebookCodeEnv(_ENV,${JSON.stringify({ codePath: this.notebookFilePath, startupScript: this.notebookFileData.startupScript })});`, '');
        }
        async setRawCellsData(data) {
            this.notebookFileData.cells = data;
        }
        async getRpcName() {
            return this.notebookFileData.rpc ?? null;
        }
        async getRawCellsData() {
            return this.notebookFileData.cells;
        }
        async waitClose() {
            await this.closed.get();
        }
    }
    exports.OpenedJsNotebookFile = OpenedJsNotebookFile;
    _a = registry_1.RpcSerializeMagicMark;
    async function openNotebookFile(notebookFilePath, opt) {
        await exports.__inited__;
        if (!exports.runningRunCodeContextForNotebookFile.has(notebookFilePath)) {
            await (0, JsEnviron_1.ensureDefaultFileSystem)();
            let onbf = new OpenedJsNotebookFile(notebookFilePath, { noRpc: opt?.noRpc });
            await onbf.loadFromFile();
            let c1 = await onbf.ensureRunCodeContextConnector();
            exports.runningRunCodeContextForNotebookFile.set(notebookFilePath, onbf);
            onbf.waitClose().then(() => {
                exports.runningRunCodeContextForNotebookFile.delete(notebookFilePath);
            });
            if (opt?.setupInspectorHelper === true) {
                c1.runCode(`(await import('partic2/JsNotebook/inspector')).setupInspectorHelper(cc.localScope)`, '');
            }
        }
        return exports.runningRunCodeContextForNotebookFile.get(notebookFilePath);
    }
    async function runNotebook(notebookFilePath, cellsIndex) {
        let notebook1 = await openNotebookFile(notebookFilePath, { noRpc: true });
        let cld = notebook1.notebookFileData.getCellsData();
        let cc = await notebook1.ensureRunCodeContextConnector();
        if (cellsIndex === 'all cells') {
            for (let t1 of cld.cellList) {
                let { err } = await cc.runCode(t1.cellInput, '');
            }
        }
        else {
            for (let t1 of cellsIndex) {
                let cellInput = cld.cellList.at(t1)?.cellInput;
                if (cellInput != undefined) {
                    let { err } = await cc.runCode(cellInput);
                }
            }
        }
        return cc.value;
    }
});
