define(["require", "exports", "partic2/pComponentUi/domui", "preact", "partic2/pComponentUi/texteditor", "partic2/CodeRunner/jsutils2", "partic2/pComponentUi/workspace"], function (require, exports, domui_1, React, texteditor_1, jsutils2_1, workspace_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__internal__ = exports.FileTypeHandlerBase = void 0;
    exports.openStdioConsoleWebui = openStdioConsoleWebui;
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
    class StdioConsole extends React.Component {
        constructor(p, c) {
            super(p, c);
            this.rref = {
                input: new domui_1.ReactRefEx(),
                output: new domui_1.ReactRefEx()
            };
            this.readingOutputs = false;
            this.debounceScrollOutputsToBottom = new jsutils2_1.DebounceCall(async () => {
                await new Promise(requestAnimationFrame);
                let div1 = await this.rref.output.waitValid();
                div1.scrollTo({ top: div1.scrollHeight, behavior: 'smooth' });
            }, 50);
            this.setState({ outputs: [], inputHistory: [], inputHistoryIndex: -1 });
        }
        componentDidMount() {
            if (this.readingOutputs)
                return;
            this.readingOutputs = true;
            this.props.stdioSource.waitClosed().then(() => this.readingOutputs = false).catch(() => { });
            (async () => {
                while (this.readingOutputs) {
                    let outtext = await this.props.stdioSource.readStdoutUtf8();
                    this.pushOutputToOutputsBuffer(outtext);
                }
            })().catch((err) => {
                this.pushOutputToOutputsBuffer(err.toString() + err.stack);
            });
            (async () => {
                while (this.readingOutputs) {
                    let outtext = await this.props.stdioSource.readStderrUtf8();
                    this.pushOutputToOutputsBuffer(outtext);
                }
            })().catch((err) => {
                this.pushOutputToOutputsBuffer(err.toString() + err.stack);
            });
        }
        componentWillUnmount() {
            this.readingOutputs = false;
        }
        pushOutputToOutputsBuffer(output) {
            let buf = this.state.outputs.slice(Math.max(0, this.state.outputs.length - 100));
            buf.push(output);
            this.setState({ outputs: buf });
            this.debounceScrollOutputsToBottom.call();
        }
        async onInputKeyDown(ev) {
            if (ev.key == 'Enter' && !ev.ctrlKey && !ev.altKey && !ev.shiftKey) {
                let te = await this.rref.input.waitValid();
                let intext = te.getPlainText();
                let histIdx = this.state.inputHistoryIndex;
                let hist = this.state.inputHistory.slice(Math.max(0, histIdx - 30), histIdx + 1);
                if (hist.at(-1) !== intext) {
                    hist.push(intext);
                }
                this.setState({ inputHistory: hist, inputHistoryIndex: hist.length - 1 });
                this.pushOutputToOutputsBuffer(intext + '\n');
                try {
                    await this.props.stdioSource.writeStdinUtf8(intext + '\n');
                }
                catch (err) {
                    this.pushOutputToOutputsBuffer(err.toString() + err.stack);
                }
                finally {
                    await new Promise(requestAnimationFrame);
                    te.setPlainText('');
                }
            }
            else if (ev.key == 'ArrowUp') {
                let histIdx = this.state.inputHistoryIndex;
                if (histIdx >= 0) {
                    let te = await this.rref.input.waitValid();
                    te.setPlainText(this.state.inputHistory[histIdx]);
                    this.setState({ inputHistoryIndex: histIdx - 1 });
                }
            }
            else if (ev.key == 'ArrowDown') {
                let histIdx = this.state.inputHistoryIndex + 1;
                if (histIdx < this.state.inputHistory.length) {
                    let te = await this.rref.input.waitValid();
                    te.setPlainText(this.state.inputHistory[histIdx]);
                    this.setState({ inputHistoryIndex: histIdx });
                }
            }
        }
        render(props, state, context) {
            return React.createElement("div", { className: [domui_1.css.flexColumn].join(' '), style: { width: '100%', height: '100%' } },
                React.createElement("div", { style: { whiteSpace: 'pre-wrap', flexGrow: '1', flexShrink: '1', overflow: 'auto' }, ref: this.rref.output }, this.state.outputs.join('')),
                React.createElement(texteditor_1.TextEditor, { divStyle: { flexGrow: '0', flexShrink: '0' }, ref: this.rref.input, divAttr: { onKeyDown: (ev) => this.onInputKeyDown(ev) }, divClass: [domui_1.css.simpleCard] }));
        }
    }
    async function openStdioConsoleWebui(stdioSource, opt) {
        let wh = await (0, workspace_1.openNewWindow)(React.createElement(StdioConsole, { stdioSource: stdioSource }), { title: opt.title });
        await wh.waitClose();
        stdioSource.close();
    }
    exports.__internal__ = {
        TextFileViewer, MediaFileViewer1, TextFileHandler, ImageFileHandler
    };
});
//# sourceMappingURL=fileviewer.js.map