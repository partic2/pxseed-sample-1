define(["require", "exports", "partic2/CodeRunner/CodeContext", "partic2/CodeRunner/WebUi", "partic2/jsutils1/base", "preact", "partic2/pxprpcClient/registry", "partic2/CodeRunner/JsEnviron", "partic2/pComponentUi/workspace", "./fileviewer", "partic2/CodeRunner/RemoteCodeContext", "partic2/pComponentUi/domui", "partic2/pComponentUi/input", "partic2/CodeRunner/RemoteCodeContext", "./misclib", "partic2/pComponentUi/window"], function (require, exports, CodeContext_1, WebUi_1, base_1, React, registry_1, JsEnviron_1, workspace_1, fileviewer_1, RemoteCodeContext_1, domui_1, input_1, RemoteCodeContext_2, misclib_1, window_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RunCodeReplView = exports.RunCodeTab = exports.IJSNBFileHandler = exports.__name__ = void 0;
    exports.initNotebookCodeContext = initNotebookCodeContext;
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
    async function initNotebookCodeContext(codeContext, codePath) {
        let res;
        if (codeContext === 'local window') {
            res = {
                code: new CodeContext_1.LocalRunCodeContext()
            };
        }
        else if (codeContext instanceof registry_1.ClientInfo) {
            await codeContext.ensureConnected();
            await (await codeContext.jsServerLoadModule(RemoteCodeContext_1.__name__)).free();
            let rpc = codeContext;
            let code = new RemoteCodeContext_2.RemoteRunCodeContext(codeContext.client);
            //init worker context
            await code.runCode(`return await (async ()=>{
            let workerinit=await import('partic2/JsNotebook/workerinit')
            return await workerinit.ensureInited.get()})()`);
            res = { rpc, code };
        }
        else if (codeContext instanceof RemoteCodeContext_2.RemoteRunCodeContext) {
            let foundRpc = (0, misclib_1.findRpcClientInfoFromClient)(codeContext.client1);
            if (foundRpc === null) {
                throw new Error('RemoteRunCodeContext must attached to a registered RpcClientInfo.');
            }
            let rpc = foundRpc;
            let code = codeContext;
            //init worker context
            await code.runCode(`return await (async ()=>{
            let workerinit=await import('partic2/JsNotebook/workerinit')
            return await workerinit.ensureInited.get()})()`);
            res = { rpc, code };
        }
        else if (codeContext instanceof CodeContext_1.LocalRunCodeContext) {
            res = { code: codeContext };
        }
        else {
            throw new Error('Unsupported code context');
        }
        let result1 = await res.code.runCode(`await (await import('partic2/CodeRunner/JsEnviron')).initCodeEnv(_ENV,{codePath:${JSON.stringify(codePath ?? '')}});`);
        if (result1.err != null) {
            base_1.logger.warning(result1.err);
        }
        return res;
    }
    class RunCodeTab extends workspace_1.TabInfoBase {
        constructor() {
            super(...arguments);
            this.rref = {
                ccl: new domui_1.ReactRefEx(),
                replccl: new domui_1.ReactRefEx(),
                rpcRegistry: React.createRef(),
                actionBar: new domui_1.ReactRefEx()
            };
            this.action = {};
            this.inited = new base_1.future();
            this.ignoreRpcConfigOnLoading = false;
        }
        async openCodeContextChooser() {
            let r = await (0, misclib_1.openCodeContextChooser)();
            if (r != null) {
                this.useCodeContext(r);
            }
        }
        async useCodeContext(codeContext) {
            try {
                if (codeContext === null) {
                    //canceled
                    return;
                }
                let { rpc, code } = await initNotebookCodeContext(codeContext, this.path);
                this.rpc = rpc;
                this.codeContext = code;
            }
            catch (e) {
                await (0, window_1.alert)(e.toString(), 'Error');
            }
            this.requestPageViewUpdate();
        }
        async init(initval) {
            await super.init(initval);
            this.rref.ccl.addEventListener('change', (ev) => {
                window.log2 = [...(window.log2 ?? []), ev];
            });
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
                if (this.fs != undefined && this.path != undefined) {
                    let cells = (await this.getCurrentCellList()).saveTo();
                    let saved = JSON.stringify({ ver: 1, rpc: this.getRpcStringRepresent(), path: this.path, cells });
                    await this.fs.writeAll(this.path, new TextEncoder().encode(saved));
                }
            };
            this.action.Settting = async () => {
                let form = new domui_1.ReactRefEx();
                let dlg = await (0, window_1.prompt)(React.createElement("div", { style: { minWidth: '300px' } },
                    React.createElement(input_1.JsonForm, { ref: form, type: { type: 'object', fields: [
                                ['path', { type: 'string' }]
                            ] } })));
                let form2 = await form.waitValid();
                form2.value = { path: this.path };
                if ((await dlg.answer.get()) == 'ok') {
                    this.path = form2.value.path;
                }
                dlg.close();
            };
            this.inited.setResult(true);
            this.doLoad();
            return this;
        }
        async getCurrentCellList() {
            return await this.rref.ccl.waitValid();
        }
        async doLoad() {
            if (this.fs != undefined && this.path != undefined) {
                let t1 = await this.fs.readAll(this.path);
                if (t1 == null)
                    return;
                let data = new Uint8Array(t1);
                if (data.length > 0) {
                    let t1 = data.indexOf(0);
                    if (t1 >= 0)
                        data = data.slice(0, t1);
                    let { ver, rpc, cells } = JSON.parse(new TextDecoder().decode(data));
                    if (!this.ignoreRpcConfigOnLoading) {
                        if (rpc === 'local window') {
                            this.rpc = 'local window';
                        }
                        else if (rpc != undefined) {
                            await registry_1.persistent.load();
                            this.rpc = (0, registry_1.getRegistered)(rpc);
                        }
                        await this.useCodeContext(this.rpc ?? 'local window');
                    }
                    if (cells != undefined) {
                        (await this.getCurrentCellList()).loadFrom(cells);
                    }
                }
            }
        }
        onKeyDown(ev) {
            this.rref.actionBar.current?.processKeyEvent(ev);
        }
        getRpcStringRepresent() {
            let rpc = 'local window';
            if (typeof this.rpc === 'string') {
                rpc = this.rpc;
            }
            else if (this.rpc != undefined) {
                rpc = this.rpc.name;
            }
            return rpc;
        }
        renderPage() {
            return React.createElement("div", { style: { width: '100%', overflow: 'auto' }, onKeyDown: (ev) => this.onKeyDown(ev) },
                React.createElement("div", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.openCodeContextChooser() },
                        "Code Context:",
                        this.getRpcStringRepresent()),
                    React.createElement("span", null, "\u00A0\u00A0"),
                    React.createElement(misclib_1.DefaultActionBar, { action: this.action, ref: this.rref.actionBar })),
                (this.codeContext != undefined) ?
                    React.createElement(WebUi_1.CodeCellList, { codeContext: this.codeContext, ref: this.rref.ccl }) :
                    'No CodeContext');
        }
    }
    exports.RunCodeTab = RunCodeTab;
    class RunCodeReplView extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = {
                list: new domui_1.ReactRefEx(),
                container: new domui_1.ReactRefEx()
            };
            this.autoScrollToBottom = true;
            this.savedScrollHight = 0;
            this.inited = false;
        }
        async onCellRun(cellKey) {
            let cellList = (await this.rref.list.waitValid()).getCellList();
            if (cellList.length >= (this.props.maxCellCount ?? 100)) {
                (await this.rref.list.waitValid()).deleteCell(cellList.at(0).key);
            }
            if (cellList.at(-1)?.key == cellKey) {
                this.autoScrollToBottom = true;
            }
            let nextCell = await (await this.rref.list.waitValid()).newCell(cellKey);
            (await this.rref.list.waitValid()).setCurrentEditing(nextCell);
        }
        async doRunCode(code) {
            let cl = (await this.rref.list.waitValid());
            let cl2 = cl.getCellList();
            if (cl2.length == 0) {
                await cl.newCell('');
            }
            let cc = await cl.getCellList().at(-1).ref.waitValid();
            cc.setCellInput(code);
            await cc.runCode();
        }
        async _keepScrollState() {
            let cont = await this.rref.container.waitValid();
            while (this.rref.container.current != null) {
                if (this.autoScrollToBottom && cont.scrollHeight != this.savedScrollHight) {
                    cont = this.rref.container.current;
                    cont.scrollTo({ top: cont.scrollHeight, behavior: 'smooth' });
                    this.savedScrollHight = cont.scrollHeight;
                }
                await (0, base_1.sleep)(100);
            }
        }
        async beforeRender() {
            if (!this.inited) {
                this.inited = true;
                let { rpc, code } = await initNotebookCodeContext(this.props.codeContext, this.props.codePath);
                this.rpc = rpc;
                this._keepScrollState();
            }
        }
        render(props, state, context) {
            this.beforeRender();
            return React.createElement("div", { ref: this.rref.container, style: {
                    overflowY: 'auto', border: '0px', padding: '0px', margin: '0px', width: '100%', height: '100%', ...this.props.containerStyle
                }, onMouseDown: () => this.autoScrollToBottom = false, onTouchStart: () => this.autoScrollToBottom = false, onWheel: () => this.autoScrollToBottom = false },
                React.createElement(WebUi_1.CodeCellList, { codeContext: this.props.codeContext, onRun: (key) => this.onCellRun(key), ref: this.rref.list, cellProps: { runCodeKey: 'Enter' } }));
        }
    }
    exports.RunCodeReplView = RunCodeReplView;
});
//# sourceMappingURL=notebook.js.map