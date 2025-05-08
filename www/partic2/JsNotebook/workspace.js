define(["require", "exports", "partic2/pComponentUi/domui", "preact", "./filebrowser", "partic2/pComponentUi/workspace", "partic2/pxprpcClient/registry", "./notebook", "./fileviewer", "partic2/CodeRunner/JsEnviron", "partic2/pxprpcClient/ui", "partic2/jsutils1/base", "partic2/tjsonpxp/tjs", "partic2/pxprpcBinding/JseHelper__JseIo", "./stdioshell", "partic2/pComponentUi/window", "partic2/pComponentUi/transform", "partic2/CodeRunner/RemoteCodeContext", "partic2/CodeRunner/CodeContext", "partic2/pComponentUi/window", "./misclib", "partic2/jsutils1/webutils"], function (require, exports, domui_1, React, filebrowser_1, workspace_1, registry_1, notebook_1, fileviewer_1, JsEnviron_1, ui_1, base_1, tjs_1, JseHelper__JseIo_1, stdioshell_1, window_1, transform_1, RemoteCodeContext_1, CodeContext_1, window_2, misclib_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultOpenWorkspaceWindowFor = exports.Workspace = void 0;
    exports.setDefaultOpenWorkspaceWindowFor = setDefaultOpenWorkspaceWindowFor;
    exports.openWorkspaceWindowFor = openWorkspaceWindowFor;
    const __name__ = 'partic2/JsNotebook/workspace';
    //treat TextFileHandler as the last default opener
    let defaultFileTypeHandlers = [new notebook_1.IJSNBFileHandler(), new fileviewer_1.JsModuleHandler(),
        new fileviewer_1.ImageFileHandler(), new stdioshell_1.StdioShellProfile1(),
        new fileviewer_1.TextFileHandler(), new filebrowser_1.DummyDirectoryHandler()];
    class CreateFileTab extends workspace_1.TabInfoBase {
        async init(initval) {
            super.init({ id: 'internal://workspace create file', title: 'create', ...initval });
            return this;
        }
        async doCreate(h) {
            let fs = this.ws.state.fs;
            let path = this.ws.rref.fb.current.state.currPath;
            let newPath = await h.create(path);
            this.ws.onNewFileCreated(newPath);
        }
        renderPage() {
            return React.createElement("div", null, this.ws.fileTypeHandlers.map(v => ('create' in v) ? [React.createElement("a", { onClick: () => this.doCreate(v), href: "javascript:;" }, v.title), React.createElement("br", null)] : []));
        }
    }
    let tabAttrSym = Symbol('tabAttrSym');
    class Workspace extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                fb: React.createRef(),
                tv: new domui_1.ReactRefEx(),
                panel1: React.createRef(),
                rpcRegistry: React.createRef()
            };
            this.fileTypeHandlers = (0, base_1.clone)(defaultFileTypeHandlers, 1);
            this.inited = new base_1.future();
            this.initOpenedFiles = [];
            this.onPauseListener = async () => {
                await this.saveProfile();
            };
            this.__panel12SpliterMove = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.setState({ panel12SplitX: curr.x - start.x });
                }
            });
            this.fileTypeHandlers.forEach(v => v.setWorkspace(this));
            this.setState({ initFileDir: '' });
        }
        async loadProfile() {
            let moduleDataDir = (await this.fs.dataDir()) + '/www/' + __name__;
            let profileFile = moduleDataDir + '/serverProfile.json';
            let profile = { currPath: moduleDataDir + '/workspace/1', openedFiles: [moduleDataDir + '/workspace/1/notebook.ijsnb'] };
            try {
                (0, base_1.assert)(await this.fs?.filetype(profileFile) === 'file');
                let data1 = await this.fs.readAll(profileFile);
                if (data1 != null && data1.length > 0) {
                    profile = { ...profile, ...JSON.parse(new TextDecoder().decode(data1)) };
                }
            }
            catch (e) {
                (0, base_1.throwIfAbortError)(e);
                await this.fs.mkdir(profile.currPath);
                await this.fs.writeAll(profileFile, new TextEncoder().encode(JSON.stringify(profile)));
                for (let t1 of profile.openedFiles) {
                    if ((await this.fs.filetype(t1)) === 'none') {
                        await this.fs.mkdir(webutils_1.path.dirname(t1));
                        await this.fs.writeAll(t1, new TextEncoder().encode(JSON.stringify({
                            "ver": 1,
                            "path": t1,
                            "cells": JSON.stringify({ 'cellList': [
                                    { 'cellInput': '//_ENV is the default "global" context for Code Cell \n_ENV',
                                        'cellOutput': ['', null],
                                        'key': 'rnd12rjykngi1ufte7uq' },
                                    { 'cellInput': '//Also globalThis are available \nglobalThis',
                                        'cellOutput': ['', null],
                                        'key': 'rnd1inpn4a83tgvabops' },
                                    { 'cellInput': '//"import" is also available as expected\nimport {BytesToHex} from \'partic2/jsutils1/base\'\nlet hex=BytesToHex(new Uint8Array([0x22,0x33,0x44]));\nconsole.info(hex)\nlet BytesFromHex=(await import(\'partic2/jsutils1/base\')).BytesFromHex\nconsole.info(BytesFromHex(hex))\n',
                                        'cellOutput': ['', null],
                                        'key': 'rnd1gn3dzsjben57zmdc' }
                                ],
                                'consoleOutput': {} })
                        })));
                    }
                }
            }
            this.setState({ initFileDir: profile.currPath });
            this.initOpenedFiles = profile.openedFiles;
        }
        async saveProfile() {
            let moduleDataDir = (await this.fs.dataDir()) + '/www/' + __name__;
            let openedFiles = [];
            for (let tab of this.rref.tv.current.getTabs()) {
                if (tabAttrSym in tab) {
                    openedFiles.push(tab[tabAttrSym].filePath);
                }
            }
            let profile = {
                currPath: this.rref.fb.current?.state.currPath,
                openedFiles
            };
            let profileFile = moduleDataDir + '/serverProfile.json';
            await this.fs.writeAll(profileFile, new TextEncoder().encode(JSON.stringify(profile)));
        }
        componentDidMount() {
            this.init().catch((e) => (0, window_2.alert)(e.toString()));
            webutils_1.lifecycle.addEventListener('pause', this.onPauseListener);
        }
        componentWillUnmount() {
            webutils_1.lifecycle.removeEventListener('pause', this.onPauseListener);
        }
        async init() {
            if (this.inited.done) {
                return;
            }
            if (this.props.fs == undefined) {
                if (this.props.rpc != undefined) {
                    await this.props.rpc.ensureConnected();
                }
                if (this.props.rpc == undefined) {
                    let t1 = new JsEnviron_1.LocalWindowSFS();
                    await t1.ensureInited();
                    this.fs = t1;
                    this.setState({ fs: t1 });
                }
                else {
                    try {
                        let fs1 = new JsEnviron_1.TjsSfs();
                        this.jseio = new JseHelper__JseIo_1.Invoker();
                        await this.jseio.useClient(this.props.rpc.client);
                        fs1.from(await (0, tjs_1.tjsFrom)(this.jseio));
                        fs1.pxprpc = this.props.rpc;
                        await fs1.ensureInited();
                        this.fs = fs1;
                        this.setState({ fs: fs1 });
                    }
                    catch (e) {
                        //fallback to localwindowsfs
                        let t1 = new JsEnviron_1.LocalWindowSFS();
                        await t1.ensureInited();
                        this.fs = t1;
                        this.setState({ fs: t1 });
                    }
                }
            }
            else {
                this.fs = this.props.fs;
                this.setState({ fs: this.props.fs });
            }
            await this.loadProfile();
            this.inited.setResult(true);
            this.forceUpdate();
            for (let t1 of this.initOpenedFiles) {
                await this.doOpenFileRequest(t1);
            }
        }
        async doOpenFileRequest(path) {
            await this.inited.get();
            let lowercasePath = path.toLowerCase();
            for (let t1 of this.fileTypeHandlers) {
                let matched = false;
                if (typeof t1.extension === 'string') {
                    if (lowercasePath.endsWith(t1.extension) && 'open' in t1)
                        matched = true;
                }
                else {
                    for (let t2 of t1.extension) {
                        if (lowercasePath.endsWith(t2)) {
                            matched = true;
                            break;
                        }
                    }
                }
                if (matched) {
                    let t2 = await t1.open(path);
                    t2[tabAttrSym] = { filePath: path };
                    (await this.rref.tv.waitValid()).addTab(t2);
                    (await this.rref.tv.waitValid()).openTab(t2.id);
                    break;
                }
            }
        }
        async openNotebookFor(supportedContext, notebookFile) {
            await this.inited.get();
            let moduleDataDir = (await this.fs.dataDir()) + '/www/' + __name__;
            if (notebookFile == undefined) {
                notebookFile = moduleDataDir + '/workspace/1/notebook.ijsnb';
            }
            if ((await this.fs.filetype(notebookFile)) === 'none') {
                await this.fs.mkdir(webutils_1.path.dirname(notebookFile));
                await this.fs.writeAll(notebookFile, new TextEncoder().encode('{}'));
            }
            await this.doOpenFileRequest(notebookFile);
            for (let tab of (await this.rref.tv.waitValid()).getTabs()) {
                if (tab instanceof notebook_1.RunCodeTab && tab.path === notebookFile) {
                    tab.ignoreRpcConfigOnLoading = true;
                    await tab.inited.get();
                    await tab.useCodeContext(supportedContext);
                }
            }
        }
        async onNewFileCreated(path) {
            await this.rref.fb.current.reloadFileInfo();
            await this.rref.fb.current.selectFiles([path]);
            this.rref.fb.current.DoRenameTo();
        }
        async doCreateFileRequest(dir) {
            await this.inited.get();
            let t1 = await new CreateFileTab().init({ ws: this });
            (await this.rref.tv.waitValid()).addTab(t1);
            (await this.rref.tv.waitValid()).openTab(t1.id);
        }
        async openBookmarkTab() {
            //TODO
        }
        render(props, state, context) {
            if (!this.inited.done) {
                return null;
            }
            return React.createElement("div", { className: [domui_1.css.flexRow, ...(this.props.divClass ?? [])].join(' '), style: { width: '100%', height: '100%', ...(this.props.divStyle ?? {}) } },
                React.createElement(window_1.WindowComponent, { ref: this.rref.rpcRegistry, title: 'rpc registry' },
                    React.createElement(ui_1.RegistryUI, null)),
                React.createElement("div", { style: { flexBasis: (this.state.panel12SplitX ?? 302 - 2) + 'px', flexShrink: '0',
                        height: '100%', overflowY: 'auto' }, ref: this.rref.panel1 },
                    React.createElement("a", { href: "javascript:;", onClick: () => this.rref.rpcRegistry.current?.active() }, "RpcRegistry"),
                    React.createElement("span", null, "\u00A0\u00A0"),
                    React.createElement("div", { style: { flexGrow: 1 } },
                        React.createElement(filebrowser_1.FileBrowser, { ref: this.rref.fb, sfs: this.state.fs, initDir: this.state.initFileDir, workspace: this, onOpenRequest: (path) => this.doOpenFileRequest(path), onCreateRequest: (dir) => this.doCreateFileRequest(dir) }))),
                React.createElement("div", { style: { flexBasis: '5px', flexShrink: '0', backgroundColor: 'grey', cursor: 'ew-resize' }, onMouseDown: (ev) => {
                        let x = this.rref.panel1.current?.getBoundingClientRect().left;
                        this.__panel12SpliterMove.start({ x: x ?? 0, y: ev.clientY }, true);
                        ev.preventDefault();
                    }, onTouchStart: (ev) => {
                        let x = this.rref.panel1.current?.getBoundingClientRect().left;
                        this.__panel12SpliterMove.start({ x: x ?? 0, y: ev.touches[0].clientY }, true);
                        ev.preventDefault();
                    } }),
                React.createElement("div", { className: domui_1.css.flexColumn, style: { flexGrow: '1', minWidth: 0, flexShrink: '1' } },
                    React.createElement(workspace_1.TabView, { ref: this.rref.tv })));
        }
    }
    exports.Workspace = Workspace;
    let defaultOpenWorkspaceWindowFor = async function (supportedContext, title) {
        let wsref = new domui_1.ReactRefEx();
        let appendedWindow = [];
        const onCloseWindow = () => {
            appendedWindow.forEach(wnd => (0, window_1.removeFloatWindow)(wnd));
        };
        if (supportedContext == 'local window' || (supportedContext instanceof CodeContext_1.LocalRunCodeContext)) {
            (0, window_2.appendFloatWindow)(React.createElement(window_1.WindowComponent, { key: (0, base_1.GenerateRandomString)(), title: title, onClose: onCloseWindow },
                React.createElement(Workspace, { ref: wsref, divStyle: { backgroundColor: 'white' } })));
        }
        else if (supportedContext instanceof registry_1.ClientInfo) {
            (0, window_2.appendFloatWindow)(React.createElement(window_1.WindowComponent, { key: (0, base_1.GenerateRandomString)(), title: title, onClose: onCloseWindow },
                React.createElement(Workspace, { ref: wsref, rpc: supportedContext, divStyle: { backgroundColor: 'white' } })));
        }
        else if (supportedContext instanceof RemoteCodeContext_1.RemoteRunCodeContext) {
            let rpc = (0, misclib_1.findRpcClientInfoFromClient)(supportedContext.client1);
            (0, base_1.assert)(rpc != null);
            (0, window_2.appendFloatWindow)(React.createElement(window_1.WindowComponent, { key: (0, base_1.GenerateRandomString)(), title: title, onClose: onCloseWindow },
                React.createElement(Workspace, { ref: wsref, rpc: rpc, divStyle: { backgroundColor: 'white' } })));
        }
        (await wsref.waitValid()).openNotebookFor(supportedContext);
    };
    exports.defaultOpenWorkspaceWindowFor = defaultOpenWorkspaceWindowFor;
    async function setDefaultOpenWorkspaceWindowFor(openNotebook) {
        exports.defaultOpenWorkspaceWindowFor = openNotebook;
    }
    async function openWorkspaceWindowFor(supportedContext, title) {
        (0, exports.defaultOpenWorkspaceWindowFor)(supportedContext, title);
    }
});
//# sourceMappingURL=workspace.js.map