define("partic2/JsNotebook/notebook", ["require", "exports", "partic2/CodeRunner/WebUi", "partic2/jsutils1/base", "preact", "partic2/pxprpcClient/registry", "./fileviewer", "partic2/pComponentUi/domui", "partic2/pxprpcClient/ui", "partic2/CodeRunner/RemoteCodeContext", "partic2/pComponentUi/window", "partic2/CodeRunner/jsutils2", "partic2/jsutils1/webutils"], function (require, exports, WebUi_1, base_1, React, registry_1, fileviewer_1, domui_1, ui_1, RemoteCodeContext_1, window_1, jsutils2_1, webutils_1) {
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
                React.createElement("h2", null,
                    " ",
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
                    React.createElement(ui_1.RegistryUI, { ref: this.rref.registry, rpc: this.props.rpc })));
        }
    }
    async function openRpcChooser(rpc) {
        return new Promise((resolve, reject) => {
            let wnd2 = React.createElement(window_1.WindowComponent, { onClose: () => {
                    (0, window_1.removeFloatWindow)(wnd2);
                    resolve(null);
                }, title: 'choose code context' },
                React.createElement("div", { style: { backgroundColor: 'white', padding: '1px' } },
                    React.createElement(RpcChooser, { onChoose: (rpc) => {
                            resolve(rpc);
                            (0, window_1.removeFloatWindow)(wnd2);
                        }, rpc: rpc }),
                    React.createElement("h2", null,
                        "Or ",
                        React.createElement("a", { href: "javascript:;", onClick: (ev) => {
                                resolve('<No RPC>');
                                (0, window_1.removeFloatWindow)(wnd2);
                            } }, "Don't use RPC"))));
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
            this.notebookFile = null;
            this.codeContext = null;
            this.codeCellHighlightQueue = new Set();
            this.DoCodeCellsHightlight = new jsutils2_1.DebounceCall(async () => {
                let copy = Array.from(this.codeCellHighlightQueue);
                this.codeCellHighlightQueue.clear();
                for (let codeCell of copy) {
                    let input1 = await codeCell.rref.codeInput.waitValid();
                    let code = input1.getPlainText();
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
                        let caret = null;
                        if (input1.isEditing()) {
                            caret = input1.getTextCaretOffset();
                        }
                        input1.setHtml(hlcode);
                        if (caret != null) {
                            input1.setTextCaretOffset(caret);
                        }
                    }
                }
            }, 200);
        }
        async openRpcChooser() {
            let r = await openRpcChooser(await this.props.context.rpc.ensureConnected());
            if (r == '<No RPC>') {
                this.useRpc({ name: null });
            }
            else if (r != null) {
                this.useRpc({ name: r.name });
            }
        }
        async useRpc(rpc) {
            try {
                if (this.notebookFile != null) {
                    if (this.codeContext != undefined) {
                        try {
                            this.codeContext.event.removeEventListener(`${exports.__name__}.NotebookViewer`, this.__notebookViewerEventHandler);
                        }
                        catch (err) { }
                    }
                    if (rpc != undefined) {
                        await this.notebookFile.useRpc(rpc.name);
                    }
                    let connector = await this.notebookFile.ensureRunCodeContextConnector();
                    this.codeContext = new RemoteCodeContext_1.RemoteRunCodeContext(await this.props.context.rpc.ensureConnected(), connector);
                    this.codeContext.event.addEventListener(`${exports.__name__}.NotebookViewer`, this.__notebookViewerEventHandler);
                    await this.codeContext.runCode(`(await import('partic2/JsNotebook/inspector')).setupInspectorHelper(_ENV)`, '');
                    if (rpc != undefined) {
                        this.setState({ usingRpcName: rpc.name });
                    }
                }
            }
            catch (e) {
                await (0, window_1.alert)([e.toString(), e.stack, (e.remoteStack ?? '')].join('\n'), 'Error');
            }
        }
        componentDidMount() {
            this.doLoad();
        }
        componentWillUnmount() {
            if (this.codeContext != null) {
                this.codeContext.close();
            }
        }
        async doLoad() {
            try {
                let workerinit = await (0, registry_1.importRemoteModule)(await this.props.context.rpc.ensureConnected(), 'partic2/JsNotebook/workerinit');
                this.notebookFile = await workerinit.openNotebookFile(this.props.path, {});
                let usingRpcName = await this.notebookFile.getRpcName();
                await this.useRpc();
                this.setState({ usingRpcName });
                let cellsData = await this.notebookFile.getRawCellsData();
                if (cellsData != null) {
                    let ccl = await this.rref.ccl.waitValid();
                    await ccl.loadFrom(cellsData);
                    for (let t2 of ccl.state.list) {
                        if (t2.ref.current != undefined)
                            this.codeCellHighlightQueue.add(t2.ref.current);
                    }
                    this.DoCodeCellsHightlight.call();
                }
            }
            catch (err) {
                (0, base_1.throwIfAbortError)(err);
                (0, window_1.alert)(err.stack);
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
            if (this.notebookFile != null) {
                await this.notebookFile.setRawCellsData(cells);
                await this.notebookFile.saveToFile();
            }
        }
        async callFunctionInNotebookWebui(module, fnName, args) {
            let fn = (await new Promise((resolve_1, reject_1) => { require([module], resolve_1, reject_1); }))[fnName];
            fn(...args, { rpc: this.props.context.rpc, codeCellList: this.rref.ccl, codeContext: this.codeContext });
        }
        async updateNotebookCodeCellsData(cellsData) {
            let ccl = await this.rref.ccl.waitValid();
            ccl.loadFrom(cellsData);
        }
        async setCodeCellsDataOnRemoteJsNotebook() {
            let ccl = await this.rref.ccl.waitValid();
            await this.codeContext?.runCode(`jsnotebook.codeCellsData=${JSON.stringify(ccl.saveTo())}`);
        }
        async reconnectCodeContextSoon(opt) {
            await (0, base_1.sleep)(opt?.wait ?? 1000);
            try {
                await this.useRpc({ name: this.state.usingRpcName });
            }
            catch (err) {
                (0, window_1.alert)(err.message + err.stack);
            }
        }
        async onCellInputChange(codeCell) {
            this.codeCellHighlightQueue.add(codeCell);
            this.DoCodeCellsHightlight.call();
        }
        render() {
            return React.createElement("div", { style: { width: '100%', overflow: 'auto' }, onKeyDown: (ev) => this.onKeyDown(ev), ref: this.rref.container },
                React.createElement("div", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.openRpcChooser() },
                        "RPC:",
                        this.state.usingRpcName ?? '<No RPC>'),
                    React.createElement("span", null, "\u00A0\u00A0"),
                    React.createElement("a", { onClick: () => this.doSave(), href: "javascript:;" }, "Save")),
                (this.codeContext != undefined) ?
                    React.createElement(WebUi_1.CodeCellList, { codeContext: this.codeContext, ref: this.rref.ccl, cellProps: {
                            onInputChange: (target) => this.onCellInputChange(target)
                        } }) :
                    'No CodeContext');
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
            this.codeCellHighlightQueue = new Set();
            this.DoCodeCellsHightlight = new jsutils2_1.DebounceCall(async () => {
                let copy = Array.from(this.codeCellHighlightQueue);
                this.codeCellHighlightQueue.clear();
                for (let codeCell of copy) {
                    let input1 = await codeCell.rref.codeInput.waitValid();
                    let code = input1.getPlainText();
                    if (code.length > 10000)
                        continue;
                    await exports.__inited__;
                    let hlcode = await webworkercall.prismHighlightJS(code);
                    if (/[^\n]\n$/.test(hlcode))
                        hlcode += '\n';
                    let caret = null;
                    if (input1.isEditing()) {
                        caret = input1.getTextCaretOffset();
                    }
                    input1.setHtml(hlcode);
                    if (caret != null) {
                        input1.setTextCaretOffset(caret);
                    }
                }
            }, 200);
            this._scrollTask = null;
            this.onContainerScroll = new jsutils2_1.DebounceCall(async () => {
                let cont = await this.rref.container.waitValid();
                console.info('#1 scrollState' + (cont.scrollHeight - (cont.scrollTop + cont.clientHeight)));
                if (cont.scrollHeight - (cont.scrollTop + cont.clientHeight) < 15) {
                    this.autoScrollToBottom = true;
                }
            }, 300);
        }
        async onCellRun(cellKey) {
            let ccl = await this.rref.list.waitValid();
            let cellList = ccl.getCellList();
            if (cellList.length >= (this.props.maxCellCount ?? 100)) {
                ccl.deleteCell(cellList.at(0).key);
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
        *_keepScrollState() {
            let cont = yield* base_1.Task.yieldWrap(this.rref.container.waitValid());
            while (this.rref.container.current != null) {
                if (this.autoScrollToBottom) {
                    cont = this.rref.container.current;
                    cont.scrollTo({ top: cont.scrollHeight, behavior: 'smooth' });
                }
                yield (0, base_1.sleep)(200);
            }
        }
        componentWillUnmount() {
            this._scrollTask?.abort();
            this._scrollTask = null;
        }
        async onCellInputChange(codeCell) {
            this.codeCellHighlightQueue.add(codeCell);
            this.DoCodeCellsHightlight.call();
        }
        async beforeRender() {
            if (this._scrollTask == null) {
                let that = this;
                this._scrollTask = base_1.Task.fork(function* () {
                    yield* that._keepScrollState();
                }).run();
            }
        }
        render(props, state, context) {
            this.beforeRender();
            return React.createElement("div", { ref: this.rref.container, style: {
                    overflowY: 'auto', border: '0px', padding: '0px', margin: '0px', width: '100%', height: '100%', ...this.props.containerStyle
                }, onPointerDown: () => this.autoScrollToBottom = false, onScroll: () => this.onContainerScroll.call() },
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
