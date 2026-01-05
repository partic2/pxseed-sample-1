define(["require", "exports", "partic2/CodeRunner/WebUi", "partic2/jsutils1/base", "preact", "partic2/pxprpcClient/registry", "./fileviewer", "partic2/CodeRunner/RemoteCodeContext", "partic2/pComponentUi/domui", "partic2/pxprpcClient/ui", "partic2/pComponentUi/window", "partic2/CodeRunner/jsutils2", "./workerinit", "partic2/CodeRunner/Component1", "partic2/jsutils1/webutils"], function (require, exports, WebUi_1, base_1, React, registry_1, fileviewer_1, RemoteCodeContext_1, domui_1, ui_1, window_1, jsutils2_1, workerinit_1, Component1_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.__inited__ = exports.__name__ = void 0;
    exports.__name__ = 'partic2/JsNotebook/notebook';
    let webworkercall;
    exports.__inited__ = (async function () {
        webworkercall = await (0, registry_1.importRemoteModule)(await (await (0, registry_1.getPersistentRegistered)('webworker 1')).ensureConnected(), 'partic2/JsNotebook/webworkercall');
    })();
    class RpcChooser extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = {
                registry: new domui_1.ReactRefEx(),
                registryContainerDiv: new domui_1.ReactRefEx()
            };
        }
        render(props, state, context) {
            return React.createElement("div", null,
                React.createElement("h2", null, "From..."),
                React.createElement("a", { href: "javascript:;", onClick: () => this.props.onChoose('local window') }, "Local Window"),
                React.createElement("h2", null,
                    "or ",
                    React.createElement("a", { href: "javascript:;", onClick: async () => {
                            let selected = (await this.rref.registry.waitValid()).getSelected();
                            if (selected == null) {
                                (0, window_1.alert)('select at least one rpc client below.');
                                (await this.rref.registryContainerDiv.waitValid()).style.border = 'solid red 2px';
                                await (0, base_1.sleep)(1000);
                                (await this.rref.registryContainerDiv.waitValid()).style.border = '0px';
                                return;
                            }
                            this.props.onChoose((0, registry_1.getRegistered)(selected));
                        } }, "Use RPC"),
                    " below"),
                React.createElement("div", { ref: this.rref.registryContainerDiv },
                    React.createElement(ui_1.RegistryUI, { ref: this.rref.registry })));
        }
    }
    async function openRpcChooser() {
        return new Promise((resolve, reject) => {
            let wnd2 = React.createElement(window_1.WindowComponent, { onClose: () => {
                    (0, window_1.removeFloatWindow)(wnd2);
                    resolve(null);
                }, title: 'choose code context' },
                React.createElement("div", { style: { backgroundColor: 'white', padding: '1px' } },
                    React.createElement(RpcChooser, { onChoose: (rpc) => {
                            resolve(rpc);
                            (0, window_1.removeFloatWindow)(wnd2);
                        } })));
            (0, window_1.appendFloatWindow)(wnd2);
        });
    }
    class IJSNBFileHandler extends fileviewer_1.FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'javascript notebook';
            this.extension = ['.ijsnb'];
        }
        async open(path) {
            await this.context.openNewWindowForFile({
                vnode: React.createElement(NotebookViewer, { context: this.context, path: path }),
                title: 'Notebook:' + path.substring(path.lastIndexOf('/') + 1),
                layoutHint: exports.__name__ + '.IJSNBFileHandler',
                filePath: path
            });
        }
    }
    class NotebookViewer extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = {
                ccl: new domui_1.ReactRefEx(),
                container: new domui_1.ReactRefEx()
            };
            this.__notebookViewerEventHandler = (ev) => {
                let { call, argv } = ev.data;
                this[call](...argv);
            };
            this.codeCellHighlightQueue = new Set();
            this.DoCodeCellsHightlight = new jsutils2_1.DebounceCall(async () => {
                let copy = Array.from(this.codeCellHighlightQueue);
                this.codeCellHighlightQueue.clear();
                for (let codeCell of copy) {
                    let input1 = await codeCell.rref.codeInput.waitValid();
                    let code = input1.getPlainText();
                    let caret = input1.getTextCaretOffset();
                    if (code.length > 10000)
                        continue;
                    await exports.__inited__;
                    let hlcode = await webworkercall.prismHighlightJS(code);
                    if (!this.codeCellHighlightQueue.has(codeCell)) {
                        let lf = hlcode.match(/\n+$/);
                        if (lf != null) {
                            hlcode = hlcode.substring(0, hlcode.length - lf[0].length);
                            for (let t1 = 0; t1 < lf[0].length; t1++) {
                                hlcode += '<div><br/></div>';
                            }
                        }
                        //if(/[^\n]\n$/.test(hlcode))hlcode+='\n';
                        input1.setHtml(hlcode);
                        input1.setTextCaretOffset(caret);
                    }
                }
            }, 200);
        }
        async openRpcChooser() {
            let r = await openRpcChooser();
            if (r == 'local window') {
                if (this.props.context.rpc instanceof workerinit_1.__internal__.LoopbackRpcClient) {
                    r = this.props.context.rpc;
                }
                else {
                    r = new workerinit_1.__internal__.LoopbackRpcClient('local window', 'loopback:local window');
                }
            }
            if (r != null) {
                this.useRpc(r);
            }
        }
        async useRpc(rpc, opt) {
            try {
                let code = await (0, RemoteCodeContext_1.connectToRemoteCodeContext)(await rpc.ensureConnected(), `return (await lib.importModule('partic2/JsNotebook/workerinit')).createRunCodeContextConnectorForNotebookFile(
                ${JSON.stringify(this.props.path)}
            )`);
                if (this.state.codeContext != undefined) {
                    this.state.codeContext.close();
                    this.state.codeContext.event.removeEventListener(`${exports.__name__}.NotebookViewer`, this.__notebookViewerEventHandler);
                }
                code.event.addEventListener(`${exports.__name__}.NotebookViewer`, this.__notebookViewerEventHandler);
                this.setState({ rpc, codeContext: code });
                let jsnotebook = JSON.parse((await code.runCode('return JSON.stringify(jsnotebook)')).stringResult);
                if (jsnotebook == null) {
                    await code.runCode(`jsnotebook={};`);
                }
                await code.runCode(`Object.assign(jsnotebook,${JSON.stringify({ startupScript: opt?.startupScript ?? '' })});`);
                await code.runCode(`jsnotebook.doSave=(...argv)=>_ENV.event.dispatchEvent(new CodeContextEvent('${exports.__name__}.NotebookViewer',{data:{call:'doSave',argv}}))`);
                await code.runCode(`jsnotebook.callFunctionInNotebookWebui=(...argv)=>_ENV.event.dispatchEvent(new CodeContextEvent('${exports.__name__}.NotebookViewer',{data:{call:'callFunctionInNotebookWebui',argv}}))`);
                await code.runCode(`jsnotebook.openRpcChooser=(...argv)=>_ENV.event.dispatchEvent(new CodeContextEvent('${exports.__name__}.NotebookViewer',{data:{call:'openRpcChooser',argv}}))`);
                await code.runCode(`jsnotebook.updateNotebookCodeCellsData=(...argv)=>_ENV.event.dispatchEvent(new CodeContextEvent('${exports.__name__}.NotebookViewer',{data:{call:'updateNotebookCodeCellsData',argv}}))`);
                await code.runCode(`jsnotebook.setCodeCellsDataOnRemoteJsNotebook=(...argv)=>_ENV.event.dispatchEvent(new CodeContextEvent('${exports.__name__}.NotebookViewer',{data:{call:'setCodeCellsDataOnRemoteJsNotebook',argv}}))`);
            }
            catch (e) {
                await (0, window_1.alert)([e.toString(), e.stack, (e.remoteStack ?? '')].join('\n'), 'Error');
            }
        }
        componentDidMount() {
            this.doLoad();
        }
        componentWillUnmount() {
            if (this.state.codeContext != undefined) {
                this.state.codeContext.close();
            }
        }
        async doLoad() {
            let t1 = await this.props.context.fs.readAll(this.props.path);
            if (t1 == null)
                return;
            let data = new Uint8Array(t1);
            if (data.length == 0) {
                data = (0, jsutils2_1.utf8conv)('{}');
            }
            let f1 = new workerinit_1.NotebookFileData();
            try {
                f1.load(data);
            }
            catch (err) { }
            ;
            await this.useRpc((await f1.getRpcClient()), { startupScript: f1.startupScript });
            if (f1.cells != undefined) {
                let ccl = await this.rref.ccl.waitValid();
                await ccl.loadFrom(f1.cells);
                for (let t2 of ccl.state.list) {
                    if (t2.ref.current != undefined)
                        this.codeCellHighlightQueue.add(t2.ref.current);
                }
                this.DoCodeCellsHightlight.call();
            }
        }
        onKeyDown(ev) {
            if (ev.code === 'KeyS' && ev.ctrlKey) {
                this.doSave();
                ev.preventDefault();
            }
        }
        async doSave() {
            let ccl = await this.rref.ccl.waitValid();
            let cells = ccl.saveTo();
            let saved = { ver: 1, rpc: this.getRpcStringRepresent(), path: this.props.path, cells };
            if (this.state.codeContext != undefined) {
                let jsnotebook = JSON.parse((await this.state.codeContext.runCode(`return JSON.stringify(jsnotebook)`)).stringResult);
                saved.startupScript = jsnotebook.startupScript;
            }
            await this.props.context.fs.writeAll(this.props.path, (0, jsutils2_1.utf8conv)(JSON.stringify(saved)));
        }
        async callFunctionInNotebookWebui(module, fnName, args) {
            let fn = (await base_1.requirejs.promiseRequire(module))[fnName];
            fn(...args);
        }
        async updateNotebookCodeCellsData(cellsData) {
            let ccl = await this.rref.ccl.waitValid();
            ccl.loadFrom(cellsData);
        }
        async setCodeCellsDataOnRemoteJsNotebook() {
            let ccl = await this.rref.ccl.waitValid();
            await this.state.codeContext?.runCode(`jsnotebook.codeCellsData=${JSON.stringify(ccl.saveTo())}`);
        }
        getRpcStringRepresent() {
            return this.state.rpc?.name ?? '<No name>';
        }
        async onCellInputChange(codeCell) {
            this.codeCellHighlightQueue.add(codeCell);
            this.DoCodeCellsHightlight.call();
        }
        render() {
            return React.createElement(Component1_1.PredefinedCodeContextViewerContext.Consumer, null, value => {
                return React.createElement("div", { style: { width: '100%', overflow: 'auto' }, onKeyDown: (ev) => this.onKeyDown(ev), ref: this.rref.container },
                    React.createElement("div", null,
                        React.createElement("a", { href: "javascript:;", onClick: () => this.openRpcChooser() },
                            "RPC:",
                            this.getRpcStringRepresent()),
                        React.createElement("span", null, "\u00A0\u00A0"),
                        React.createElement("a", { onClick: () => this.doSave(), href: "javascript:;" }, "Save")),
                    (this.state.codeContext != undefined) ?
                        React.createElement(WebUi_1.CodeCellList, { codeContext: this.state.codeContext, ref: this.rref.ccl, cellProps: {
                                onInputChange: (target) => this.onCellInputChange(target)
                            } }) :
                        'No CodeContext');
            });
        }
    }
    let resource = (0, webutils_1.getResourceManager)(exports.__name__);
    (0, webutils_1.useCssFile)(resource.getUrl('prism/theme-one-light.css'));
    class RunCodeReplView extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = {
                list: new domui_1.ReactRefEx(),
                container: new domui_1.ReactRefEx()
            };
            this.autoScrollToBottom = true;
            this.savedScrollHight = 0;
            this.codeCellHighlightQueue = new Set();
            this.DoCodeCellsHightlight = new jsutils2_1.DebounceCall(async () => {
                let copy = Array.from(this.codeCellHighlightQueue);
                this.codeCellHighlightQueue.clear();
                for (let codeCell of copy) {
                    let input1 = await codeCell.rref.codeInput.waitValid();
                    let code = input1.getPlainText();
                    if (code.length > 10000)
                        continue;
                    let caret = input1.getTextCaretOffset();
                    await exports.__inited__;
                    let hlcode = await webworkercall.prismHighlightJS(code);
                    if (/[^\n]\n$/.test(hlcode))
                        hlcode += '\n';
                    input1.setHtml(hlcode);
                    input1.setTextCaretOffset(caret);
                }
            }, 200);
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
            let runCellAt = cellList.findIndex(t1 => t1.key === cellKey);
            if (runCellAt == cellList.length - 1) {
                let nextCell = await (await this.rref.list.waitValid()).newCell(cellKey);
                (await this.rref.list.waitValid()).setCurrentEditing(nextCell);
            }
            else {
                let nextCell = cellList[runCellAt + 1].key;
                (await this.rref.list.waitValid()).setCurrentEditing(nextCell);
            }
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
        async onCellInputChange(codeCell) {
            this.codeCellHighlightQueue.add(codeCell);
            this.DoCodeCellsHightlight.call();
        }
        async beforeRender() {
            if (!this.inited) {
                this.inited = true;
                this._keepScrollState();
            }
        }
        render(props, state, context) {
            this.beforeRender();
            return React.createElement("div", { ref: this.rref.container, style: {
                    overflowY: 'auto', border: '0px', padding: '0px', margin: '0px', width: '100%', height: '100%', ...this.props.containerStyle
                }, onMouseDown: () => this.autoScrollToBottom = false, onTouchStart: () => this.autoScrollToBottom = false, onWheel: () => this.autoScrollToBottom = false },
                React.createElement(WebUi_1.CodeCellList, { codeContext: this.props.codeContext, onRun: (key) => this.onCellRun(key), ref: this.rref.list, cellProps: {
                        runCodeKey: 'Enter',
                        onInputChange: (target) => this.onCellInputChange(target)
                    } }));
        }
    }
    exports.__internal__ = {
        IJSNBFileHandler, RunCodeReplView, NotebookViewer, RpcChooser, openRpcChooser
    };
});
//# sourceMappingURL=notebook.js.map