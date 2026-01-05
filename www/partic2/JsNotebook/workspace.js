define(["require", "exports", "partic2/pComponentUi/domui", "preact", "./filebrowser", "partic2/pComponentUi/workspace", "partic2/pxprpcClient/registry", "./notebook", "./fileviewer", "partic2/CodeRunner/JsEnviron", "partic2/tjshelper/tjsonjserpc", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2", "./workerinit", "partic2/pComponentUi/input", "partic2/pComponentUi/window", "partic2/jsutils1/base", "partic2/CodeRunner/Inspector", "./workerinit"], function (require, exports, domui_1, React, filebrowser_1, workspace_1, registry_1, notebook_1, fileviewer_1, JsEnviron_1, tjsonjserpc_1, webutils_1, jsutils2_1, workerinit_1, input_1, window_1, base_1, Inspector_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.openWorkspaceWithProfile = exports.WorkspaceContext = void 0;
    exports.setDefaultOpenWorkspaceWindowFor = setDefaultOpenWorkspaceWindowFor;
    exports.openWorkspaceWindowFor = openWorkspaceWindowFor;
    const __name__ = 'partic2/JsNotebook/workspace';
    class WorkspaceContext {
        constructor(rpc) {
            this.rpc = rpc;
            //optional property.
            this.fs = null;
            this.wwwroot = null;
            this.filehandler = new Array();
            //startupProfile is store to save and recover the workspace status.
            this.startupProfile = null;
            this.saveStartupProfile = async () => { };
            this.fileBrowser = filebrowser_1.__internal__.FileBrowser;
            this.title = 'JS Notebook';
            this.rootFileBrowser = {
                windowHandler: undefined,
                rref: new domui_1.ReactRefEx()
            };
            this.openedFileWindow = new Map();
        }
        pathNormailize(path) {
            path = path.replace(/\\/g, '/');
            if (!path.startsWith('/')) {
                path = '/' + path;
            }
            return path;
        }
        async ensureInited() {
            if (this.fs == null) {
                if (this.rpc instanceof workerinit_1.__internal__.LoopbackRpcClient || this.rpc.url.startsWith('webworker:') || this.rpc.url.startsWith('serviceworker:')) {
                    await (0, JsEnviron_1.ensureDefaultFileSystem)();
                    this.fs = JsEnviron_1.defaultFileSystem;
                    if (this.wwwroot == null)
                        this.wwwroot = '/www';
                }
                else {
                    let tjssfs1 = new JsEnviron_1.TjsSfs();
                    let tjs = await (0, tjsonjserpc_1.tjsFrom)(await this.rpc.ensureConnected());
                    tjssfs1.from(tjs);
                    await tjssfs1.ensureInited();
                    this.fs = tjssfs1;
                }
            }
            if (this.wwwroot == null) {
                this.wwwroot = this.pathNormailize(await (0, registry_1.easyCallRemoteJsonFunction)(await this.rpc.ensureConnected(), 'partic2/jsutils1/webutils', 'getWWWRoot', []));
            }
            for (let t1 of this.filehandler) {
                t1.context = this;
            }
            if (this.filehandler.length == 0) {
                this.filehandler.push(new notebook_1.__internal__.IJSNBFileHandler(), new fileviewer_1.__internal__.ImageFileHandler(), new fileviewer_1.__internal__.ImageFileHandler(), new fileviewer_1.__internal__.TextFileHandler());
            }
        }
        async useRemoteFileAsStartupProfileStore(path2) {
            let profileFile = null;
            try {
                profileFile = await this.fs.readAll(path2);
            }
            catch (err) { }
            ;
            if (profileFile != null) {
                try {
                    this.startupProfile = JSON.parse((0, jsutils2_1.utf8conv)(profileFile));
                    this.startupProfile.currPath = this.pathNormailize(this.startupProfile.currPath);
                    this.startupProfile.openedFiles = this.startupProfile.openedFiles.map(t1 => this.pathNormailize(t1));
                }
                catch (err) {
                    //bad profile file, create new.
                }
                ;
            }
            let saveStartupProfile = new jsutils2_1.DebounceCall(async () => {
                await this.fs.writeAll(path2, (0, jsutils2_1.utf8conv)(JSON.stringify(this.startupProfile)));
            }, 500);
            this.saveStartupProfile = async () => { await saveStartupProfile.call(); };
        }
        async openNewWindowForFile(args) {
            let found = this.openedFileWindow.get(args.filePath);
            if (found != undefined) {
                await found.windowHandler.activate();
                return found;
            }
            else {
                let wh = await (0, workspace_1.openNewWindow)(args.vnode, { parentWindow: this.rootFileBrowser.windowHandler, title: args.title, layoutHint: args.layoutHint });
                (async () => {
                    this.openedFileWindow.set(args.filePath, { windowHandler: wh });
                    this.startupProfile.openedFiles = Array.from(this.openedFileWindow.keys());
                    await this.saveStartupProfile();
                    await wh.waitClose();
                    this.openedFileWindow.delete(args.filePath);
                    this.startupProfile.openedFiles = Array.from(this.openedFileWindow.keys());
                    await this.saveStartupProfile();
                })();
                return { windowHandler: wh };
            }
        }
        async start() {
            await this.ensureInited();
            let FileBrowser = this.fileBrowser;
            this.rootFileBrowser.windowHandler = await (0, workspace_1.openNewWindow)(React.createElement(FileBrowser, { context: this, ref: this.rootFileBrowser.rref }), { title: this.title + ' File Browser', layoutHint: __name__ + '.FileBrowser' });
            let fb = await this.rootFileBrowser.rref.waitValid();
            if (this.startupProfile == null) {
                await this.useRemoteFileAsStartupProfileStore(webutils_1.path.join(this.wwwroot, __name__, 'serverProfile.json'));
            }
            if (this.startupProfile == null) {
                let currPath = webutils_1.path.join(this.wwwroot, __name__, 'workspace/1');
                let t1 = webutils_1.path.join(currPath, 'notebook.ijsnb');
                this.startupProfile = { currPath, openedFiles: [t1] };
                if (await this.fs.filetype(t1) === 'none') {
                    let ccld = new Inspector_1.CodeCellListData();
                    ccld.cellList.push({ 'cellInput': '//_ENV is the default "global" context for Code Cell \n_ENV',
                        'cellOutput': ['', null],
                        'key': 'rnd12rjykngi1ufte7uq' }, { 'cellInput': '//Also globalThis are available \nglobalThis',
                        'cellOutput': ['', null],
                        'key': 'rnd1inpn4a83tgvabops' }, { 'cellInput': `//"import" is also available as expected
import * as jsutils2  from 'partic2/CodeRunner/jsutils2'
u8=jsutils2.u8hexconv(new Uint8Array([11,22,33]))
console.info(u8)
console.info(Array.from(jsutils2.u8hexconv(u8)))`,
                        'cellOutput': ['', null],
                        'key': 'rnd1gn3dzsjben57zmdc' });
                    await this.fs.writeAll(t1, (0, jsutils2_1.utf8conv)(JSON.stringify({
                        "ver": 1,
                        "path": t1,
                        "cells": ccld.saveTo()
                    })));
                }
                await this.saveStartupProfile();
            }
            await fb.DoFileOpen(this.startupProfile.currPath);
            //Clone and clear, to avoid recursive open and save window.
            let toOpen = [...this.startupProfile.openedFiles];
            this.startupProfile.openedFiles.length = 0;
            for (let t1 of toOpen) {
                await fb.DoFileOpen(t1);
            }
        }
    }
    exports.WorkspaceContext = WorkspaceContext;
    async function openJSNotebookFirstProfileWorkspace(opt) {
        class NotebookOnlyFileBrowser extends filebrowser_1.__internal__.FileBrowser {
            async DoNew() {
                let form1 = new domui_1.ReactRefEx();
                let dlg = await (0, window_1.prompt)(React.createElement("div", null,
                    React.createElement(input_1.SimpleReactForm1, { ref: form1 }, form1 => React.createElement("div", null,
                        React.createElement("div", null,
                            "Directory:",
                            React.createElement(input_1.ValueCheckBox, { ref: form1.getRefForInput('isDir') })),
                        React.createElement("div", null,
                            "name:",
                            React.createElement("input", { type: "text", ref: form1.getRefForInput('name') }))))), 'New');
                (await form1.waitValid()).value = { isDir: false, name: "untitled.ijsnb" };
                if (await dlg.response.get() == 'ok') {
                    let { isDir, name } = (await form1.waitValid()).value;
                    if (isDir) {
                        await this.props.context.fs.mkdir(webutils_1.path.join((this.state.currPath ?? ''), name));
                    }
                    else if (name.endsWith('.ijsnb')) {
                        await this.props.context.fs.writeAll(webutils_1.path.join((this.state.currPath ?? ''), name), (0, jsutils2_1.utf8conv)(JSON.stringify({
                            rpc: opt.defaultRpc, startupScript: opt.defaultStartupScript
                        })));
                    }
                    else {
                        await this.props.context.fs.writeAll(webutils_1.path.join((this.state.currPath ?? ''), name), new Uint8Array(0));
                    }
                    await this.reloadFileInfo();
                }
                dlg.close();
            }
        }
        let rpc1 = await (0, registry_1.getPersistentRegistered)(opt.defaultRpc ?? registry_1.ServerHostWorker1RpcName);
        (0, base_1.assert)(rpc1 != null, 'rpc not found.');
        let workspace = new WorkspaceContext(rpc1);
        await workspace.ensureInited();
        workspace.fileBrowser = NotebookOnlyFileBrowser;
        if (opt.notebookDirectory != undefined) {
            let nbdir = '';
            if (typeof opt.notebookDirectory === 'function') {
                nbdir = await opt.notebookDirectory(workspace);
            }
            else {
                nbdir = workspace.wwwroot + '/' + opt.notebookDirectory;
            }
            let createProfile = true;
            try {
                let profileData = await workspace.fs.readAll(nbdir + '/profile.json');
                (0, base_1.assert)(profileData != null);
                JSON.parse((0, jsutils2_1.utf8conv)(profileData));
            }
            catch (err) {
                let openedFiles = [];
                if (opt.sampleCode != undefined && await workspace.fs.filetype(nbdir + '/sample.ijsnb') == 'none') {
                    let nbfdata = new workerinit_1.NotebookFileData();
                    nbfdata.rpc = rpc1;
                    nbfdata.startupScript = opt.defaultStartupScript ?? '';
                    let ccldata = new Inspector_1.CodeCellListData();
                    ccldata.cellList.push(...opt.sampleCode.map(t1 => ({
                        cellInput: t1,
                        cellOutput: [null, null], key: (0, base_1.GenerateRandomString)()
                    })));
                    nbfdata.cells = ccldata.saveTo();
                    await workspace.fs.writeAll(nbdir + '/sample.ijsnb', nbfdata.dump());
                    openedFiles.push(nbdir + '/sample.ijsnb');
                }
                await workspace.fs.writeAll(nbdir + '/profile.json', (0, jsutils2_1.utf8conv)(JSON.stringify({
                    currPath: nbdir, openedFiles
                })));
            }
            await workspace.useRemoteFileAsStartupProfileStore(nbdir + '/profile.json');
        }
        return workspace;
    }
    let defaultOpenWorkspaceWindowFor = async function (supportedContext) {
        if (supportedContext === 'local window') {
            supportedContext = new workerinit_1.__internal__.LoopbackRpcClient('local window', 'loopback:local window');
        }
        let workspace = new WorkspaceContext(supportedContext);
        await workspace.ensureInited();
        await workspace.start();
    };
    async function setDefaultOpenWorkspaceWindowFor(openNotebook) {
        defaultOpenWorkspaceWindowFor = openNotebook;
    }
    async function openWorkspaceWindowFor(supportedContext) {
        defaultOpenWorkspaceWindowFor(supportedContext);
    }
    exports.openWorkspaceWithProfile = {
        openJSNotebookFirstProfileWorkspace
    };
});
//# sourceMappingURL=workspace.js.map