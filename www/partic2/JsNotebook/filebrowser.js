define("partic2/JsNotebook/filebrowser", ["require", "exports", "preact", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pComponentUi/domui", "partic2/pComponentUi/window", "partic2/pComponentUi/texteditor", "../pComponentUi/input", "partic2/pxseedMedia1/index1", "./tjseasyapi", "../pComponentUi/workspace"], function (require, exports, React, base_1, webutils_1, domui_1, window_1, texteditor_1, input_1, index1_1, tjseasyapi_1, workspace_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.css1 = void 0;
    exports.openFileBrowserWindowForSimpleFileSystem = openFileBrowserWindowForSimpleFileSystem;
    var ReactDOM = React;
    var __name__ = 'partic2/JsNotebook/filebrowser';
    exports.css1 = {
        FileItem: (0, base_1.GenerateRandomString)()
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css1.FileItem, ['display:flex', 'align-content:center', 'flex-direction:row']);
    class File extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.lastSelectTime = null;
        }
        onClick(ev) {
            if (this.lastSelectTime != null && (0, base_1.GetCurrentTime)().getTime() - this.lastSelectTime.getTime() < 500) {
                //Dblclick
                this.lastSelectTime = null;
                this.props.onOpenRequest?.(this.props.path);
                ev.preventDefault();
            }
            else {
                this.props.onSelectChange?.(this.props.path, !this.props.selected);
                this.lastSelectTime = (0, base_1.GetCurrentTime)();
            }
        }
        render() {
            let cls = [exports.css1.FileItem, domui_1.css.selectable];
            if (this.props.selected) {
                cls.push(domui_1.css.selected);
            }
            return (React.createElement("div", { className: cls.join(' '), onClick: (ev) => this.onClick(ev), onDblClick: (ev) => ev.preventDefault() },
                this.props.type === 'dir' ? React.createElement("img", { src: (0, index1_1.getIconUrl)('folder.svg') }) : React.createElement("img", { src: (0, index1_1.getIconUrl)('file.svg') }),
                this.props.name));
        }
    }
    ;
    class FileBrowserComponent extends React.Component {
        constructor(props, context) {
            super(props, context);
            this._latestOpeningFile = '';
            this._clipboardFile = {
                paths: [],
                mode: 'copy'
            };
            this._clipboardIsCut = false;
            this.filterRef = React.createRef();
            this.filesContainer = React.createRef();
            this.rref = {
                addressBar: new domui_1.ReactRefEx()
            };
            this.setState({ childrenFile: [],
                selectedFiles: new Set(),
                filterText: '', currPath: '', currPathHistory: []
            });
        }
        getParentPath() {
            var delim = this.state.currPath.lastIndexOf('/');
            if (delim < 0) {
                return '';
            }
            else {
                return this.state.currPath.substring(0, delim);
            }
        }
        async DoFileOpen(path, opt) {
            this._latestOpeningFile = path;
            let filetype = await this.props.fs.filetype(path);
            if (this._latestOpeningFile != path)
                return;
            if (filetype == 'dir') {
                let newPath = path;
                let children;
                try {
                    children = await this.props.fs.listdir(newPath);
                }
                catch (e1) {
                    newPath = '';
                    children = await this.props.fs.listdir(newPath);
                }
                if (this._latestOpeningFile != path)
                    return;
                children.sort((a, b) => {
                    let a1 = (a.type === 'dir' ? 100 : 200);
                    let b1 = (b.type === 'dir' ? 100 : 200);
                    let c1 = a.name.localeCompare(b.name);
                    if (c1 > 0)
                        c1 = 1;
                    if (c1 < 0)
                        c1 = -1;
                    return a1 - b1 + c1;
                });
                if (this._latestOpeningFile != path)
                    return;
                this.state.selectedFiles.clear();
                if (opt?.noHistory !== true) {
                    if (this.state.currPathHistory.at(-1) != this.state.currPath && this.state.currPath != undefined) {
                        this.state.currPathHistory.push(this.state.currPath);
                        if (this.state.currPathHistory.length > 30) {
                            this.state.currPathHistory.splice(0, this.state.currPathHistory.length - 30);
                        }
                    }
                }
                if (this._latestOpeningFile != path)
                    return;
                if (this.state.currPath != newPath) {
                    this.onFilterChange('');
                }
                if (this._latestOpeningFile != path)
                    return;
                this.setState({
                    currPath: newPath,
                    childrenFile: children,
                }, async () => {
                    let div1 = await this.rref.addressBar.waitValid();
                    div1.scrollLeft = div1.scrollWidth;
                });
            }
        }
        onSelectChange(path, selected) {
            if (selected) {
                this.setState({ selectedFiles: new Set([path]) });
            }
        }
        renderFiles() {
            let parentPath = this.state.currPath;
            let files = this.state.childrenFile;
            if (this.state.filterText !== '') {
                files = files.filter((v => v.name.indexOf(this.state.filterText) >= 0));
            }
            return files.map((v) => {
                let path = parentPath;
                if (path.at(-1) != '/') {
                    path = path + '/';
                }
                path = path + v.name;
                return React.createElement(File, { path: path, name: v.name, type: v.type, selected: this.state.selectedFiles.has(path), onSelectChange: (path, selected) => this.onSelectChange(path, selected), onOpenRequest: (path) => this.DoFileOpen(path) });
            });
        }
        async selectFiles(path) {
            return new Promise((resolve, reject) => {
                this.setState({ selectedFiles: new Set(path) }, resolve);
            });
        }
        async _askForFileName(initname) {
            let newFileNameInput = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement("div", null,
                React.createElement("input", { type: 'text', ref: newFileNameInput, style: { width: '100%', minWidth: '200px' }, value: initname })), 'Input file name...');
            let newFileName = null;
            if ((await dlg.response.get()) == 'ok') {
                newFileName = (await newFileNameInput.waitValid()).value;
            }
            dlg.close();
            return newFileName;
        }
        async DoRenameTo() {
            if (this.state.selectedFiles.size < 1) {
                await (0, window_1.alert)('No file selected');
                return;
            }
            let path = Array.from(await this.state.selectedFiles)[0];
            let newFileName = await this._askForFileName(path.substring(path.lastIndexOf('/') + 1));
            if (newFileName != null) {
                let newPath = this.state.currPath + '/' + newFileName;
                await this.props.fs.rename(path, newPath);
            }
            await this.reloadFileInfo();
        }
        async reloadFileInfo() {
            this.DoFileOpen(this.state.currPath);
        }
        async DoDelete() {
            let ans = await (0, window_1.confirm)(`Delete ${this.state.selectedFiles.size} files permenantly?`);
            if (ans == 'cancel') {
                return;
            }
            for (let f1 of this.state.selectedFiles) {
                await this.props.fs.delete2(f1);
            }
            await this.reloadFileInfo();
        }
        async DoUpload() {
            let selected = await (0, webutils_1.selectFile)();
            if (selected != null) {
                for (let t1 = 0; t1 < selected.length; t1++) {
                    let data = await (0, base_1.GetBlobArrayBufferContent)(selected.item(t1));
                    let name = selected.item(t1).name;
                    await this.props.fs.writeAll(this.state.currPath + '/' + name, new Uint8Array(data));
                }
            }
            await this.reloadFileInfo();
        }
        async DoCopy() {
            this._clipboardFile.paths.splice(0, this._clipboardFile.paths.length);
            this._clipboardFile.paths.push(...this.state.selectedFiles);
            this._clipboardFile.mode = 'copy';
        }
        async DoCut() {
            this._clipboardFile.paths.splice(0, this._clipboardFile.paths.length);
            this._clipboardFile.paths.push(...this.state.selectedFiles);
            this._clipboardFile.mode = 'cut';
        }
        async DoPaste() {
            if (this._clipboardFile.mode === 'cut') {
                for (let t1 of this._clipboardFile.paths) {
                    let name = t1.substring(t1.lastIndexOf('/') + 1);
                    await this.props.fs.rename(t1, (this.state.currPath ?? '') + '/' + name);
                }
            }
            else {
                for (let t1 of this._clipboardFile.paths) {
                    let filetype1 = await this.props.fs.filetype(t1);
                    let name = t1.substring(t1.lastIndexOf('/') + 1);
                    let dstpath = (this.state.currPath ?? '') + '/' + name;
                    if (dstpath == t1) {
                        dstpath = dstpath + '_Copy';
                    }
                    if (filetype1 === 'dir') {
                        await tjseasyapi_1.files.copyFileTree(t1, dstpath, { confilctPolicy: 'overwrite', srcFs: this.props.fs, destFs: this.props.fs });
                    }
                    else {
                        await tjseasyapi_1.files.copySingleFile(t1, dstpath, { srcFs: this.props.fs, destFs: this.props.fs });
                    }
                }
            }
            this.reloadFileInfo();
        }
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
            (await form1.waitValid()).value = { isDir: false, name: "untitled" };
            if (await dlg.response.get() == 'ok') {
                let { isDir, name } = (await form1.waitValid()).value;
                if (isDir) {
                    await this.props.fs.mkdir(webutils_1.path.join((this.state.currPath ?? ''), name));
                }
                else {
                    await this.props.fs.writeAll(webutils_1.path.join((this.state.currPath ?? ''), name), new Uint8Array(0));
                }
                await this.reloadFileInfo();
            }
            dlg.close();
        }
        async DoGoBack() {
            let lastPath = this.state.currPathHistory.pop();
            if (lastPath != undefined) {
                this.DoFileOpen(lastPath, { noHistory: true });
            }
        }
        renderAction() {
            return React.createElement("div", null,
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoGoBack() }, "GoBack"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoNew() }, "New"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoRenameTo() }, "Rename"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoDelete() }, "Delete"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoUpload() }, "Upload"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoCopy() }, "Copy"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoCut() }, "Cut"),
                "\u2003",
                React.createElement("a", { href: "javascript:;", onClick: () => this.DoPaste() }, "Paste"),
                "\u2003");
        }
        onFilterChange(filterText) {
            this.setState({ filterText });
        }
        async promptForCurrentPath() {
            let newPathInput = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement("div", null,
                React.createElement(texteditor_1.TextEditor, { divClass: [domui_1.css.simpleCard], divStyle: { minWidth: 300 }, ref: newPathInput })), 'Jump to');
            (await newPathInput.waitValid()).setPlainText(this.state.currPath ?? '');
            if (await dlg.response.get() === 'ok') {
                let newPath = (await newPathInput.waitValid()).getPlainText();
                newPath = newPath.replace(/\n/g, '');
                this.DoFileOpen(newPath);
            }
            dlg.close();
        }
        componentDidMount() {
            this.reloadFileInfo();
        }
        render() {
            return (React.createElement("div", { className: domui_1.css.flexColumn, style: { height: '100%' } },
                React.createElement("a", { href: "javascript:;", onClick: () => this.promptForCurrentPath() },
                    React.createElement("div", { style: { whiteSpace: 'nowrap', overflow: 'auto', display: 'block' }, className: [domui_1.css.simpleCard].join(' '), ref: this.rref.addressBar }, (this.state.currPath == undefined || this.state.currPath.length == 0) ? '/' : this.state.currPath)),
                this.renderAction(),
                React.createElement("input", { type: 'text', placeholder: 'filter', value: this.state.filterText, onInput: (ev) => this.onFilterChange(ev.target.value) }),
                React.createElement("div", { style: { flexGrow: 1, flexShrink: 1 }, ref: this.filesContainer },
                    React.createElement(File, { path: this.getParentPath(), name: "..", onOpenRequest: (path) => this.DoFileOpen(path), onSelectChange: (path, selected) => this.onSelectChange(path, selected), selected: this.state.selectedFiles.has(this.getParentPath()), type: 'dir' }),
                    this.renderFiles())));
        }
    }
    class WorkspaceFileBrowser2 extends FileBrowserComponent {
        constructor(props, context) {
            super(props, context);
        }
        async DoFileOpen(path, opt) {
            await super.DoFileOpen(path, opt);
            let filetype = await this.props.fs.filetype(path);
            if (filetype == 'file') {
                let selectedHandle = null;
                for (let t1 of this.props.context.filehandler) {
                    for (let t2 of t1.extension) {
                        if (path.endsWith(t2)) {
                            selectedHandle = t1;
                            break;
                        }
                    }
                    if (selectedHandle != null)
                        break;
                }
                if (selectedHandle == null) {
                    (0, window_1.alert)('No handler for such file extension.');
                }
                else {
                    await selectedHandle.open(path);
                }
            }
        }
        async promptForCurrentPath() {
            let newPathInput = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement("div", null,
                React.createElement(texteditor_1.TextEditor, { divClass: [domui_1.css.simpleCard], divStyle: { minWidth: 300 }, ref: newPathInput }),
                React.createElement("a", { href: "javascript:;", onClick: async () => {
                        let input1 = await newPathInput.waitValid();
                        input1.setPlainText(this.props.context.wwwroot ?? '/');
                    } },
                    React.createElement("div", null, "Goto WWWRoot"))), 'Jump to');
            (await newPathInput.waitValid()).setPlainText(this.state.currPath ?? '');
            if (await dlg.response.get() === 'ok') {
                let newPath = (await newPathInput.waitValid()).getPlainText();
                newPath = newPath.replace(/\n/g, '');
                this.DoFileOpen(newPath);
            }
            dlg.close();
        }
        render() {
            return super.render();
        }
    }
    async function openFileBrowserWindowForSimpleFileSystem(p) {
        let ref = new domui_1.ReactRefEx();
        await (0, workspace_1.openNewWindow)(React.createElement(FileBrowserComponent, { fs: p.fs, title: p.title, ref: ref }));
        if (p.initdir != undefined) {
            (await ref.waitValid()).DoFileOpen(p.initdir);
        }
    }
    var __internal__;
    (function (__internal__) {
        __internal__.FileBrowser = FileBrowserComponent;
        __internal__.WorkspaceFileBrowser = WorkspaceFileBrowser2;
    })(__internal__ || (exports.__internal__ = __internal__ = {}));
});
