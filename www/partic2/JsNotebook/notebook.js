define(["require", "exports", "partic2/CodeRunner/CodeContext", "partic2/CodeRunner/WebUi", "partic2/jsutils1/base", "preact", "partic2/pxprpcClient/registry", "partic2/CodeRunner/JsEnviron", "partic2/pComponentUi/workspace", "./fileviewer", "partic2/CodeRunner/RemoteCodeContext", "partic2/pComponentUi/domui", "partic2/pComponentUi/input", "partic2/CodeRunner/RemoteCodeContext", "./misclib", "partic2/pComponentUi/window"], function (require, exports, CodeContext_1, WebUi_1, base_1, React, registry_1, JsEnviron_1, workspace_1, fileviewer_1, RemoteCodeContext_1, domui_1, input_1, RemoteCodeContext_2, misclib_1, window_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RunCodeTab = exports.IJSNBFileHandler = exports.__name__ = void 0;
    ;
    exports.__name__ = 'partic2/JsNotebook/notebook';
    //LWRP = LocalWindowRequireProvider, setup to requirejs
    let LWRPSetuped = [false, new base_1.future()];
    let defaultFs = new JsEnviron_1.LocalWindowSFS();
    async function ensureLWRPInstalled() {
        if (!LWRPSetuped[0]) {
            await defaultFs.ensureInited();
            LWRPSetuped[0] = true;
            LWRPSetuped[1].setResult(await (0, JsEnviron_1.installRequireProvider)(defaultFs));
        }
        await LWRPSetuped[1].get();
    }
    class IJSNBFileHandler extends fileviewer_1.FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'javascript notebook';
            this.extension = '.ijsnb';
        }
        async create(dir) {
            let fs = this.workspace.fs;
            let path = await this.getUnusedFilename(dir, this.extension);
            await fs.writeAll(path, new TextEncoder().encode('{}'));
            return path;
        }
        async open(path) {
            return new RunCodeTab().init({
                id: 'file://' + path,
                title: path.substring(path.lastIndexOf('/') + 1),
                fs: this.workspace.fs,
                path: path,
                rpc: this.workspace.props.rpc,
            });
        }
    }
    exports.IJSNBFileHandler = IJSNBFileHandler;
    class RunCodeView extends React.Component {
        constructor() {
            super(...arguments);
            this.valueCollection = new input_1.ReactInputValueCollection();
            this.actionBar = new domui_1.ReactRefEx();
            this.rref = {
                rpcRegistry: React.createRef()
            };
        }
        onKeyDown(ev) {
            this.actionBar.current?.processKeyEvent(ev);
        }
        async openCodeContextChooser() {
            let wnd2 = React.createElement(window_1.WindowComponent, { onClose: () => {
                    (0, window_1.removeFloatWindow)(wnd2);
                }, title: 'choose code context' },
                React.createElement("div", { style: { backgroundColor: 'white', padding: '1px' } },
                    React.createElement(misclib_1.CodeContextChooser, { onChoose: (rpc) => {
                            this.props.tab.useCodeContext(rpc);
                            (0, window_1.removeFloatWindow)(wnd2);
                        } })));
            (0, window_1.appendFloatWindow)(wnd2);
        }
        render(props, state, context) {
            return React.createElement("div", { style: { width: '100%', overflow: 'auto' }, onKeyDown: (ev) => this.onKeyDown(ev) },
                React.createElement("div", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.openCodeContextChooser() },
                        "Code Context:",
                        (this.props.tab.rpc?.name) ?? 'local window'),
                    React.createElement("span", null, "\u00A0\u00A0"),
                    React.createElement(misclib_1.DefaultActionBar, { action: this.props.tab.action, ref: this.actionBar })),
                (this.props.tab.codeContext != undefined) ?
                    React.createElement(WebUi_1.CodeCellList, { codeContext: this.props.tab.codeContext, ref: this.props.tab.rref.ccl }) :
                    'No CodeContext');
        }
    }
    class RunCodeTab extends workspace_1.TabInfoBase {
        constructor() {
            super(...arguments);
            this.path = '';
            this.rref = { ccl: new domui_1.ReactRefEx(), view: new domui_1.ReactRefEx() };
            this.action = {};
            this.inited = new base_1.future();
        }
        async useCodeContext(codeContext) {
            try {
                if (codeContext === null) {
                    //canceled
                    return;
                }
                if (codeContext === 'local window') {
                    this.codeContext = new CodeContext_1.LocalRunCodeContext();
                    this.rpc = undefined;
                }
                else if (codeContext instanceof registry_1.ClientInfo) {
                    await codeContext.ensureConnected();
                    await (await codeContext.jsServerLoadModule(RemoteCodeContext_1.__name__)).free();
                    //init worker context
                    await (await codeContext.jsServerLoadModule('partic2/JsNotebook/workerinit')).free();
                    this.rpc = codeContext;
                    this.codeContext = new RemoteCodeContext_2.RemoteRunCodeContext(codeContext.client);
                }
                else if (codeContext instanceof RemoteCodeContext_2.RemoteRunCodeContext) {
                    let foundRpc = (0, misclib_1.findRpcClientInfoFromClient)(codeContext.client1);
                    if (foundRpc === null) {
                        await (0, window_1.alert)('RemoteRunCodeContext must attached to a registered RpcClientInfo.');
                        return;
                    }
                    await (await foundRpc.jsServerLoadModule('partic2/JsNotebook/workerinit')).free();
                    this.rpc = foundRpc;
                    this.codeContext = codeContext;
                }
                else if (codeContext instanceof CodeContext_1.LocalRunCodeContext) {
                    this.codeContext = codeContext;
                }
                else {
                    await (0, window_1.alert)('Unsupported code context');
                    return;
                }
                let result1 = await this.codeContext.runCode(`await (await import('partic2/CodeRunner/JsEnviron')).initCodeEnv(_ENV,{codePath:${JSON.stringify(this.path)}});`);
                if (result1.err != null) {
                    base_1.logger.warning(result1.err);
                }
            }
            catch (e) {
                await (0, window_1.alert)(e.toString(), 'Error');
            }
            this.rref.view.current?.forceUpdate();
        }
        async init(initval) {
            await super.init(initval);
            if (this.fs == undefined) {
                if (this.rpc == undefined) {
                    await defaultFs.ensureInited();
                    this.fs = defaultFs;
                }
            }
            if (this.rpc == undefined) {
                this.codeContext = new CodeContext_1.LocalRunCodeContext();
                await ensureLWRPInstalled();
            }
            this.action.save = async () => {
                let cells = this.rref.ccl.current.saveTo();
                let saved = JSON.stringify({ ver: 1, rpc: (this.rpc?.name) ?? '__local', path: this.path, cells });
                await this.fs.writeAll(this.path, new TextEncoder().encode(saved));
            };
            this.action.reloadCodeWorker = async () => {
                if (!(this.codeContext instanceof RemoteCodeContext_2.RemoteRunCodeContext)) {
                    await (0, window_1.alert)('Only Remote Code Context support to reload.');
                    return;
                }
                let pxseedServ = (0, registry_1.getRegistered)(registry_1.ServerHostWorker1RpcName);
                if (pxseedServ != undefined) {
                    try {
                        let client1 = await pxseedServ.ensureConnected();
                        let runBuildScript = await client1.getFunc('pxseedServer2023/workerInit.runPxseedBuildScript');
                        if (runBuildScript != null) {
                            await runBuildScript.typedecl('->').call();
                        }
                    }
                    catch (e) {
                        //skip if error.
                    }
                    ;
                }
                let res = await this.codeContext.runCode(`
if(globalThis.__workerId!=undefined){
let workerInit=await import('partic2/pxprpcClient/rpcworker');
await workerInit.reloadRpcWorker()
}else{
throw new Error('Only worker can reload');
}`);
                if (res.err != null) {
                    await (0, window_1.alert)(res.err.message);
                    return;
                }
                else {
                    await this.useCodeContext(this.codeContext);
                }
            };
            this.doLoad();
            return this;
        }
        async doLoad() {
            let t1 = await this.fs.readAll(this.path);
            if (t1 == null)
                return;
            let data = new Uint8Array(t1);
            if (data.length > 0) {
                let t1 = data.indexOf(0);
                if (t1 >= 0)
                    data = data.slice(0, t1);
                let { ver, rpc, cells } = JSON.parse(new TextDecoder().decode(data));
                if (rpc === '__local') {
                    this.rpc = undefined;
                }
                else if (rpc != undefined) {
                    await registry_1.persistent.load();
                    this.rpc = (0, registry_1.getRegistered)(rpc);
                }
                await this.useCodeContext(this.rpc ?? 'local window');
                if (cells != undefined) {
                    (await this.rref.ccl.waitValid()).loadFrom(cells);
                }
            }
            this.inited.setResult(true);
        }
        renderPage() {
            return React.createElement(RunCodeView, { ref: this.rref.view, tab: this });
        }
    }
    exports.RunCodeTab = RunCodeTab;
});
//# sourceMappingURL=notebook.js.map