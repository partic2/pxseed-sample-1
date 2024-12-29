define(["require", "exports", "partic2/pComponentUi/domui", "preact", "partic2/pComponentUi/workspace", "partic2/pComponentUi/texteditor", "./misclib"], function (require, exports, domui_1, React, workspace_1, texteditor_1, misclib_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ImageFileHandler = exports.JsModuleHandler = exports.TextFileHandler = exports.MediaFileViewerTab = exports.TextFileViewer = exports.FileTypeHandlerBase = void 0;
    class FileTypeHandlerBase {
        constructor() {
            this.title = '';
            this.extension = [];
        }
        setWorkspace(workspace) {
            this.workspace = workspace;
        }
        async getUnusedFilename(dir, suffix) {
            for (let t1 = 1; t1 < 100; t1++) {
                let testname = dir + '/' + 'untitled' + t1.toString() + suffix;
                if (await this.workspace.fs.filetype(testname) == 'none') {
                    return testname;
                }
            }
            throw new Error('no available file name');
        }
    }
    exports.FileTypeHandlerBase = FileTypeHandlerBase;
    class TextFileViewer extends workspace_1.TabInfoBase {
        constructor() {
            super(...arguments);
            this.rref = { inputArea: React.createRef(), actionBar: React.createRef() };
            this.initLoad = true;
            this.action = {};
        }
        async init(initval) {
            await super.init(initval);
            this.action.save = async () => {
                let content = this.rref.inputArea.current.getPlainText();
                let data = new TextEncoder().encode(content);
                await this.fs.writeAll(this.path, data);
            };
            return this;
        }
        async doLoad() {
            let data = await this.fs.readAll(this.path);
            data = data ?? new Uint8Array(0);
            this.rref.inputArea.current.setPlainText(new TextDecoder().decode(data));
        }
        onKeyDown(ev) {
            this.rref.actionBar.current?.processKeyEvent(ev);
        }
        renderPage() {
            return React.createElement("div", { className: domui_1.css.flexColumn, style: { flexGrow: '1' }, onKeyDown: (ev) => this.onKeyDown(ev) },
                React.createElement("div", null,
                    React.createElement(misclib_1.DefaultActionBar, { action: this.action, ref: this.rref.actionBar })),
                React.createElement(texteditor_1.TextEditor, { ref: (refObj) => {
                        this.rref.inputArea.current = refObj;
                        if (this.initLoad) {
                            this.doLoad();
                            this.initLoad = false;
                        }
                    }, divClass: [domui_1.css.simpleCard] }));
        }
    }
    exports.TextFileViewer = TextFileViewer;
    class MediaFileViewerTab extends workspace_1.TabInfoBase {
        constructor() {
            super(...arguments);
            this.rref = { actionBar: React.createRef() };
            this.initLoad = true;
            this.action = {};
        }
        async init(initval) {
            await super.init(initval);
            await this.doLoad();
            return this;
        }
        async doLoad() {
            let data = await this.fs.readAll(this.path);
            data = data ?? new Uint8Array(0);
            this.dataUrl = URL.createObjectURL(new Blob([data]));
            this.tabView.get()?.forceUpdate();
        }
        async onClose() {
            if (this.dataUrl != undefined) {
                URL.revokeObjectURL(this.dataUrl);
            }
            return true;
        }
        onKeyDown(ev) {
            this.rref.actionBar.current?.processKeyEvent(ev);
        }
        renderMedia() {
            if (this.dataUrl == undefined)
                return;
            if (this.mediaType === 'image') {
                return React.createElement("img", { src: this.dataUrl });
            }
            else if (this.mediaType === 'audio') {
                return React.createElement("audio", { src: this.dataUrl });
            }
            else if (this.mediaType === 'video') {
                return React.createElement("video", { src: this.dataUrl });
            }
        }
        renderPage() {
            return React.createElement("div", { className: domui_1.css.flexColumn, style: { flexGrow: '1' }, onKeyDown: (ev) => this.onKeyDown(ev) },
                React.createElement("div", null,
                    React.createElement(misclib_1.DefaultActionBar, { action: this.action, ref: this.rref.actionBar })),
                this.renderMedia());
        }
    }
    exports.MediaFileViewerTab = MediaFileViewerTab;
    class TextFileHandler extends FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'text file';
            this.extension = '';
        }
        async create(dir) {
            let fs = this.workspace.fs;
            let path = await this.getUnusedFilename(dir, '.txt');
            await fs.writeAll(path, new Uint8Array(0));
            return path;
        }
        async open(path) {
            let fs = this.workspace.fs;
            let t1 = new TextFileViewer();
            let t2 = await t1.init({
                id: 'file://' + path,
                title: path.substring(path.lastIndexOf('/') + 1),
                fs: fs, path: path
            });
            return t2;
        }
    }
    exports.TextFileHandler = TextFileHandler;
    class JsModuleHandler extends FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'js module(amd)';
            this.extension = '.js';
        }
        async create(dir) {
            let fs = this.workspace.fs;
            let path = await this.getUnusedFilename(dir, '.js');
            await fs.writeAll(path, new TextEncoder().encode("define(['require','exports','module'],function(require,exports,module){\n\n})"));
            return path;
        }
        async open(path) {
            return new TextFileViewer().init({
                id: 'file://' + path,
                title: path.substring(path.lastIndexOf('/') + 1),
                fs: this.workspace.fs, path: path
            });
        }
    }
    exports.JsModuleHandler = JsModuleHandler;
    class ImageFileHandler extends FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'png file';
            this.extension = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        }
        async open(path) {
            let fs = this.workspace.fs;
            return new MediaFileViewerTab().init({
                id: 'file://' + path,
                title: path.substring(path.lastIndexOf('/') + 1),
                fs: fs, path: path,
                mediaType: 'image'
            });
        }
    }
    exports.ImageFileHandler = ImageFileHandler;
});
//# sourceMappingURL=fileviewer.js.map