define(["require", "exports", "partic2/pComponentUi/domui", "preact", "partic2/pComponentUi/texteditor", "partic2/CodeRunner/jsutils2"], function (require, exports, domui_1, React, texteditor_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.FileTypeHandlerBase = void 0;
    class FileTypeHandlerBase {
        constructor() {
            this.title = '';
            this.extension = [];
        }
        async open(path) { }
    }
    exports.FileTypeHandlerBase = FileTypeHandlerBase;
    class TextFileViewer extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = { inputArea: new domui_1.ReactRefEx() };
            this.action = {};
        }
        onKeyDown(ev) {
            if (ev.key === 'KeyS' && ev.ctrlKey) {
                this.doSave();
                ev.preventDefault();
            }
        }
        async doSave() {
            await this.props.context.fs.writeAll(this.props.path, (0, jsutils2_1.utf8conv)((await this.rref.inputArea.waitValid()).getPlainText()));
        }
        async componentDidMount() {
            let data = await this.props.context.fs.readAll(this.props.path);
            data = data ?? new Uint8Array(0);
            this.rref.inputArea.current.setPlainText(new TextDecoder().decode(data));
        }
        render(props, state, context) {
            return React.createElement("div", { className: domui_1.css.flexColumn, style: { flexGrow: '1' }, onKeyDown: (ev) => this.onKeyDown(ev) },
                React.createElement("div", null,
                    React.createElement("a", { onClick: () => this.doSave(), href: "javascript:;" }, "Save")),
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.inputArea, divClass: [domui_1.css.simpleCard] }));
        }
    }
    class MediaFileViewer1 extends React.Component {
        constructor() {
            super(...arguments);
            this.rref = {};
        }
        async doLoad() {
            let data = await this.props.context.fs.readAll(this.props.path);
            data = data ?? new Uint8Array(0);
            let dataUrl = URL.createObjectURL(new Blob([data]));
            this.setState({ dataUrl });
        }
        renderMedia() {
            if (this.state.dataUrl == undefined)
                return;
            if (this.props.mediaType === 'image') {
                return React.createElement("img", { src: this.state.dataUrl });
            }
            else if (this.props.mediaType === 'audio') {
                return React.createElement("audio", { src: this.state.dataUrl });
            }
            else if (this.props.mediaType === 'video') {
                return React.createElement("video", { src: this.state.dataUrl });
            }
        }
        render() {
            return React.createElement("div", { className: domui_1.css.flexColumn, style: { flexGrow: '1' } }, this.renderMedia());
        }
    }
    class TextFileHandler extends FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'text file';
            this.extension = [''];
        }
        async open(path) {
            await this.context.openNewWindowForFile({
                vnode: React.createElement(TextFileViewer, { context: this.context, path: path }),
                title: 'Text File:' + path.substring(path.lastIndexOf('/') + 1),
                filePath: path
            });
        }
    }
    class ImageFileHandler extends FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'png file';
            this.extension = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        }
        async open(path) {
            await this.context.openNewWindowForFile({
                vnode: React.createElement(MediaFileViewer1, { context: this.context, path: path, mediaType: 'image' }),
                title: 'Image File:' + path.substring(path.lastIndexOf('/') + 1),
                filePath: path
            });
        }
    }
    exports.__internal__ = {
        TextFileViewer, MediaFileViewer1, TextFileHandler, ImageFileHandler
    };
});
//# sourceMappingURL=fileviewer.js.map