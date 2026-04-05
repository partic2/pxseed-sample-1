define(["require", "exports", "partic2/CodeRunner/JsEnviron", "partic2/jsutils1/base", "partic2/pxprpcClient/registry", "partic2/CodeRunner/CodeContext", "partic2/CodeRunner/RemoteCodeContext", "partic2/CodeRunner/jsutils2", "pxprpc/extend", "pxprpc/base", "partic2/CodeRunner/Inspector"], function (require, exports, JsEnviron_1, base_1, registry_1, CodeContext_1, RemoteCodeContext_1, jsutils2_1, extend_1, base_2, Inspector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.runningRunCodeContextForNotebookFile = exports.NotebookFileData = exports.__internal__ = exports.__inited__ = exports.ensureInited = exports.__name__ = void 0;
    exports.initNotebookCodeEnv = initNotebookCodeEnv;
    exports.createRunCodeContextConnectorForNotebookFile = createRunCodeContextConnectorForNotebookFile;
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
            this.rpc = 'local window';
            this.startupScript = '';
        }
        dump() {
            let rpcString = 'local window';
            if (this.rpc instanceof registry_1.ClientInfo) {
                rpcString = this.rpc.name;
            }
            else {
                rpcString = this.rpc;
            }
            return (0, jsutils2_1.utf8conv)(JSON.stringify({ ver: 1, rpc: rpcString, startupScript: this.startupScript, cells: this.cells }));
        }
        load(data) {
            let r = JSON.parse((0, jsutils2_1.utf8conv)(data));
            if (r.rpc != undefined)
                this.rpc = r.rpc;
            this.startupScript = r.startupScript ?? '';
            this.cells = r.cells ?? new Inspector_1.CodeCellListData().saveTo();
        }
        getCellsData() {
            let cld = new Inspector_1.CodeCellListData();
            if (this.cells != null) {
                cld.loadFrom(this.cells);
            }
            return cld;
        }
        setCellsData(ccld) {
            this.cells = ccld.saveTo();
        }
        async getRpcClient() {
            if (this.rpc instanceof registry_1.ClientInfo) {
                return this.rpc;
            }
            else if (this.rpc == 'local window') {
                return new LoopbackRpcClient('local window', 'loopback:local window');
            }
            else {
                return (0, registry_1.getPersistentRegistered)(this.rpc);
            }
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
    //Used in workerinit.createRunCodeContextConnectorForNotebookFile
    async function initNotebookCodeEnv(_ENV, opt) {
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
                await cc.runCode(js);
                this.codePath = savedCodePath;
            }
        };
        _ENV.fs = fs;
        _ENV.import2env = async (moduleName) => {
            let mod = await new Promise((resolve_1, reject_1) => { require([moduleName], resolve_1, reject_1); });
            for (let [k1, v1] of Object.entries(mod)) {
                _ENV[k1] = v1;
            }
        };
        let { CustomFunctionParameterCompletionSymbol, importNameCompletion, makeFunctionCompletionWithFilePathArg0 } = (await new Promise((resolve_2, reject_2) => { require(['partic2/CodeRunner/Inspector'], resolve_2, reject_2); }));
        _ENV.import2env[CustomFunctionParameterCompletionSymbol] = async (context) => {
            let param = context.code.substring(context.funcParamStart, context.caret);
            let importName2 = param.match(/\(\s*(['"])([^'"]+)$/);
            if (importName2 != null) {
                let replaceRange = [context.funcParamStart + param.lastIndexOf(importName2[1]) + 1, 0];
                replaceRange[1] = replaceRange[0] + importName2[2].length;
                let importName = importName2[2];
                let t1 = await importNameCompletion(importName);
                context.completionItems.push(...t1.map(v => ({ type: 'literal', candidate: v, replaceRange })));
            }
        };
        let { path } = await new Promise((resolve_3, reject_3) => { require(['partic2/jsutils1/webutils'], resolve_3, reject_3); });
        _ENV.fs.loadScript[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(path.dirname(_ENV.fs.codePath ?? ''));
        if (_ENV.fs.simple != undefined) {
            _ENV.fs.simple.readAll[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.writeAll[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.listdir[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.filetype[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
            _ENV.fs.simple.delete2[CustomFunctionParameterCompletionSymbol] = makeFunctionCompletionWithFilePathArg0(undefined);
        }
        _ENV.globalThis = globalThis;
        _ENV.pxseedServerCommand = {
            buildPackages: async () => {
                let module1 = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)).ensureConnected(), 'pxseedServer2023/pxseedhttpserver');
                return await module1.serverCommand('buildPackages');
            },
            rebuildPackages: async () => {
                let module1 = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)).ensureConnected(), 'pxseedServer2023/pxseedhttpserver');
                return await module1.serverCommand('rebuildPackages');
            },
            getConfig: async () => {
                let module1 = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)).ensureConnected(), 'pxseedServer2023/pxseedhttpserver');
                return await module1.serverCommand('rebuildPackages');
            },
            saveConfig: async (cfg) => {
                let module1 = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName)).ensureConnected(), 'pxseedServer2023/pxseedhttpserver');
                return await module1.serverCommand('saveConfig', cfg);
            }
        };
        _ENV.restartThisWorker = async () => {
            _ENV.jsnotebook?.reconnectCodeContextSoon?.();
            await (0, base_1.sleep)(100);
            globalThis.close();
        };
    }
    async function createRunCodeContextConnectorForNotebookFile(notebookFilePath) {
        await exports.__inited__;
        if (!exports.runningRunCodeContextForNotebookFile.has(notebookFilePath)) {
            let connector = await (0, RemoteCodeContext_1.createConnectorWithNewRunCodeContext)();
            if (connector.value instanceof CodeContext_1.LocalRunCodeContext) {
                await initNotebookCodeEnv(connector.value.localScope, { codePath: notebookFilePath });
            }
            await (0, JsEnviron_1.ensureDefaultFileSystem)();
            let nbd = new NotebookFileData();
            let fileData = await JsEnviron_1.defaultFileSystem.readAll(notebookFilePath);
            if (fileData != null && fileData.length > 0) {
                try {
                    nbd.load(fileData);
                }
                catch (err) { }
                ;
            }
            exports.runningRunCodeContextForNotebookFile.set(notebookFilePath, connector.value);
            connector.value.event.addEventListener('close', () => {
                exports.runningRunCodeContextForNotebookFile.delete(notebookFilePath);
            });
            if (nbd.startupScript !== '') {
                await connector.value.runCode(nbd.startupScript);
            }
        }
        return new RemoteCodeContext_1.RunCodeContextConnector(exports.runningRunCodeContextForNotebookFile.get(notebookFilePath));
    }
    async function runNotebook(notebookFilePath, cellsIndex) {
        let cc = await createRunCodeContextConnectorForNotebookFile(notebookFilePath);
        await (0, JsEnviron_1.ensureDefaultFileSystem)();
        let nbd = new NotebookFileData();
        let fileData = await JsEnviron_1.defaultFileSystem.readAll(notebookFilePath);
        if (fileData != null) {
            nbd.load(fileData);
        }
        let cld = nbd.getCellsData();
        if (cellsIndex === 'all cells') {
            for (let t1 of cld.cellList) {
                await cc.value.runCode(t1.cellInput);
            }
        }
        else {
            for (let t1 of cellsIndex) {
                let cellInput = cld.cellList.at(t1)?.cellInput;
                if (cellInput != undefined) {
                    await cc.value.runCode(cellInput);
                }
            }
        }
        return cc.value;
    }
});
//# sourceMappingURL=workerinit.js.map