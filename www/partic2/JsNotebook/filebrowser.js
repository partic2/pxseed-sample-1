define(["require", "exports", "preact", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pComponentUi/domui", "./fileviewer", "partic2/pComponentUi/window", "partic2/pComponentUi/texteditor"], function (require, exports, React, base_1, webutils_1, domui_1, fileviewer_1, window_1, texteditor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FileBrowser = exports.DummyDirectoryHandler = exports.File = void 0;
    var ReactDOM = React;
    var __name__ = 'partic2/JsNotebook/filebrowser';
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
            }
            else {
                this.props.onSelectChange?.(this.props.path, !this.props.selected);
                this.lastSelectTime = (0, base_1.GetCurrentTime)();
            }
        }
        render() {
            let cls = [domui_1.css.selectable];
            if (this.props.selected) {
                cls.push(domui_1.css.selected);
            }
            return (React.createElement("div", { className: cls.join(' '), onClick: (ev) => this.onClick(ev), onDblClick: (ev) => ev.preventDefault() },
                "[",
                this.props.type.charAt(0).toUpperCase(),
                "]",
                this.props.name));
        }
    }
    exports.File = File;
    class DummyDirectoryHandler extends fileviewer_1.FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'directory';
            this.extension = '.#NOEXTENSION';
        }
        async create(dir) {
            let path = await this.getUnusedFilename(dir, '');
            let fs = this.workspace.fs;
            await fs.mkdir(path);
            return path;
        }
    }
    exports.DummyDirectoryHandler = DummyDirectoryHandler;
    ;
    class FileBrowser extends React.Component {
        constructor(props, context) {
            super(props, context);
            this._clipboardFile = {
                paths: [],
                mode: 'copy'
            };
            this._clipboardIsCut = false;
            this.filterRef = React.createRef();
            this.filesContainer = React.createRef();
            this.setState({
                currPath: this.props.initDir, childrenFile: [],
                selectedFiles: new Set(),
                filterText: ''
            });
        }
        componentDidMount() {
            this.doFileOpen(this.state.currPath ?? this.props.initDir);
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
        async doFileOpen(path) {
            let filetype = await this.props.sfs.filetype(path);
            if (filetype == 'dir') {
                let newPath = path;
                let children;
                try {
                    children = await this.props.sfs.listdir(newPath);
                }
                catch (e1) {
                    newPath = '';
                    children = await this.props.sfs.listdir(newPath);
                }
                this.state.selectedFiles.clear();
                this.setState({
                    currPath: newPath,
                    childrenFile: children
                });
            }
            else if (filetype == 'file') {
                this.props.onOpenRequest(path);
            }
        }
        onSelectChange(path, selected) {
            if (selected) {
                this.setState({ selectedFiles: new Set([path]) });
            }
            else {
                //this.state.selectedFiles.delete(path)
            }
        }
        renderFiles() {
            let parentPath = this.state.currPath;
            let files = this.state.childrenFile;
            if (this.state.filterText !== '') {
                files = files.filter((v => v.name.indexOf(this.state.filterText) >= 0));
            }
            return files.map((v) => {
                let path = parentPath + '/' + v.name;
                return React.createElement(File, { path: path, name: v.name, type: v.type, selected: this.state.selectedFiles.has(path), onSelectChange: (path, selected) => this.onSelectChange(path, selected), onOpenRequest: (path) => this.doFileOpen(path) });
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
            if ((await dlg.answer.get()) == 'ok') {
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
                await this.props.sfs.rename(path, newPath);
            }
            await this.reloadFileInfo();
        }
        async reloadFileInfo() {
            this.doFileOpen(this.state.currPath);
        }
        async DoDelete() {
            let ans = await (0, window_1.confirm)(`Delete ${this.state.selectedFiles.size} files permenantly?`);
            if (ans == 'cancel') {
                return;
            }
            for (let f1 of this.state.selectedFiles) {
                await this.props.sfs.delete2(f1);
            }
            await this.reloadFileInfo();
        }
        async DoUpload() {
            let selected = await (0, webutils_1.selectFile)();
            if (selected != null) {
                for (let t1 = 0; t1 < selected.length; t1++) {
                    let data = await (0, base_1.GetBlobArrayBufferContent)(selected.item(t1));
                    let name = selected.item(t1).name;
                    await this.props.sfs.writeAll(this.state.currPath + '/' + name, new Uint8Array(data));
                }
            }
            await this.reloadFileInfo();
        }
        async DoSyncTab() {
            let currTab = (await this.props.workspace.rref.tv.waitValid()).getCurrentTab();
            if (currTab == undefined)
                return;
            if ('path' in currTab && typeof currTab.path === 'string') {
                await this.doFileOpen(webutils_1.path.dirname(currTab.path));
            }
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
                    this.props.sfs.rename(t1, (this.state.currPath ?? '') + '/' + name);
                }
            }
            else {
                const copyFileAndDir = async (src, dst) => {
                    if (await this.props.sfs.filetype(src) == 'dir') {
                        let children = await this.props.sfs.listdir(src);
                        this.props.sfs.mkdir(dst);
                        for (let t1 of children) {
                            await copyFileAndDir([src, t1.name].join('/'), [dst, t1.name].join('/'));
                        }
                    }
                    else {
                        if (src == dst) {
                            dst += '_Copy';
                        }
                        //XXX:Not suitable for large file.
                        let t1 = await this.props.sfs.readAll(src);
                        if (t1 != null) {
                            await this.props.sfs.writeAll(dst, t1);
                        }
                    }
                };
                for (let t1 of this._clipboardFile.paths) {
                    let name = t1.substring(t1.lastIndexOf('/') + 1);
                    await copyFileAndDir(t1, (this.state.currPath ?? '') + '/' + name);
                }
            }
            this.reloadFileInfo();
        }
        renderAction() {
            return React.createElement("div", null,
                React.createElement("a", { href: "javascript:;", onClick: () => this.props.onCreateRequest?.(this.state.currPath) }, "New"),
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
                "\u2003",
                this.props.workspace != undefined ? React.createElement("span", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.DoSyncTab() }, "SyncTab"),
                    "\u2003")
                    : null);
        }
        onFilterChange(filterText) {
            this.setState({ filterText });
        }
        async promptForCurrentPath() {
            let newPathInput = new domui_1.ReactRefEx();
            let dlg = await (0, window_1.prompt)(React.createElement(texteditor_1.TextEditor, { divClass: [domui_1.css.simpleCard], divStyle: { minWidth: 300 }, ref: newPathInput }), 'Jump to');
            (await newPathInput.waitValid()).setPlainText(this.state.currPath ?? '');
            if (await dlg.answer.get() === 'ok') {
                this.doFileOpen(await (await newPathInput.waitValid()).getPlainText());
            }
            dlg.close();
        }
        render() {
            return (React.createElement("div", { className: domui_1.css.flexColumn, style: { height: '100%' } },
                React.createElement("div", { style: { wordBreak: 'break-all' }, className: [domui_1.css.simpleCard].join(' ') },
                    React.createElement("a", { href: "javascript:;", onClick: () => this.promptForCurrentPath() }, this.state.currPath)),
                this.renderAction(),
                React.createElement("input", { type: 'text', placeholder: 'filter', onInput: (ev) => this.onFilterChange(ev.target.value) }),
                React.createElement("div", { style: { flexGrow: 1, flexShrink: 1 }, ref: this.filesContainer },
                    React.createElement(File, { path: this.getParentPath(), name: "..", onOpenRequest: (path) => this.doFileOpen(path), onSelectChange: (path, selected) => this.onSelectChange(path, selected), selected: this.state.selectedFiles.has(this.getParentPath()), type: 'dir' }),
                    this.renderFiles())));
        }
    }
    exports.FileBrowser = FileBrowser;
});
//# sourceMappingURL=filebrowser.js.map