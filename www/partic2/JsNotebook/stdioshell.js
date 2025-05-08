define(["require", "exports", "partic2/pComponentUi/texteditor", "preact", "./fileviewer", "partic2/pComponentUi/workspace", "partic2/tjsonpxp/tjs", "partic2/jsutils1/base", "partic2/pComponentUi/domui"], function (require, exports, texteditor_1, React, fileviewer_1, workspace_1, tjs_1, base_1, domui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.StdioShellProfile1 = exports.StdioShell = void 0;
    class StdioShell extends React.Component {
        constructor(p, c) {
            super(p, c);
            this.rref = {
                stdout: React.createRef(),
                stdin: React.createRef(),
                switchProcessInput: React.createRef()
            };
            this.inputHistory = [];
            this.currentUseHistory = -1;
            this.state = {
                stdoutBuffer: [], procAlive: true, switchProcessDialog: -1
            };
            this.startProcess(this.props.cmdline);
        }
        async startProcess(cmdline) {
            try {
                let tjs = await (0, tjs_1.tjsFrom)(this.props.ws.jseio);
                if (cmdline == undefined) {
                    cmdline = 'sh';
                    if (tjs.system.platform == 'windows') {
                        cmdline = 'cmd';
                    }
                }
                else {
                    this.props.onProfileChange?.({ cmdline });
                }
                let process = tjs.spawn(cmdline, { stdin: 'pipe', stdout: 'pipe', stderr: 'pipe' });
                this.setState({ process, stdoutBuffer: [], procAlive: true });
                await (0, base_1.WaitUntil)(() => this.state.procAlive, 100, 1000);
                this.updateOutputText();
                await Promise.race([(async () => {
                        let buf = new Uint8Array(512);
                        while (this.state.procAlive) {
                            let count = await process.stdout.read(buf);
                            if (count == null) {
                                break;
                            }
                            this.state.stdoutBuffer.push(buf.slice(0, count));
                            this.updateOutputText();
                        }
                    })(), (async () => {
                        let buf = new Uint8Array(512);
                        while (this.state.procAlive) {
                            let count = await process.stderr.read(buf);
                            if (count == null) {
                                break;
                            }
                            this.state.stdoutBuffer.push(buf.slice(0, count));
                            this.updateOutputText();
                        }
                    })(), (async () => {
                        let result = await process.wait();
                        this.setState({ exitCode: result.exit_status, procAlive: false });
                    })()]);
            }
            catch (e) {
                this.state.stdoutBuffer.push(new TextEncoder().encode(e.toString()));
                this.updateOutputText();
            }
            ;
            if (this.state.procAlive) {
                this.setState({ procAlive: false });
            }
        }
        async updateOutputText() {
            let allBuf = (0, base_1.ArrayBufferConcat)(this.state.stdoutBuffer);
            this.rref.stdout.current.setPlainText(new TextDecoder().decode(allBuf));
            this.setState({ stdoutBuffer: [new Uint8Array(allBuf, 0, allBuf.byteLength)] });
            this.rref.stdout.current.scrollToBottom();
        }
        async openSwitchProcessDialog() {
            this.setState({ switchProcessDialog: (0, base_1.GetCurrentTime)().getTime() });
        }
        async switchProcessDialogOk() {
            let cmdline = this.rref.switchProcessInput.current.value;
            this.startProcess(cmdline);
            this.setState({ switchProcessDialog: -1 });
        }
        async onStdInAreaKeyDown(ev) {
            if (ev.code == 'ArrowUp') {
                if (this.currentUseHistory < this.inputHistory.length - 1) {
                    this.currentUseHistory++;
                    this.rref.stdin.current.setPlainText(this.inputHistory[this.currentUseHistory]);
                    this.rref.stdin.current.setTextCaretOffset('end');
                }
                ev.preventDefault();
            }
            else if (ev.code == 'ArrowDown') {
                if (this.currentUseHistory > 0) {
                    this.currentUseHistory--;
                    this.rref.stdin.current.setPlainText(this.inputHistory[this.currentUseHistory]);
                    this.rref.stdin.current.setTextCaretOffset('end');
                }
                ev.preventDefault();
            }
            else if (ev.code == 'Enter') {
                let bufTxt = this.rref.stdin.current.getPlainText();
                this.inputHistory.unshift(bufTxt);
                this.currentUseHistory = -1;
                await this.state.process.stdin.write(new TextEncoder().encode(bufTxt + '\n'));
                this.rref.stdin.current.setPlainText('');
                ev.preventDefault();
            }
        }
        render(props, state, context) {
            return React.createElement("div", { className: domui_1.css.flexColumn },
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.stdout, divStyle: { flexShrink: '1', overflowY: 'scroll' }, divClass: [domui_1.css.simpleCard] }),
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.stdin, divClass: [domui_1.css.simpleCard], divAttr: { onKeyDown: (ev) => this.onStdInAreaKeyDown(ev) } }),
                React.createElement("div", null,
                    React.createElement("a", { onClick: () => this.openSwitchProcessDialog(), href: 'javascript:;' }, "\u00A0\u00A0Switch process\u00A0\u00A0"),
                    React.createElement("span", null, this.state.procAlive ? 'process alive' : ('process stopped with code ' + this.state.exitCode))),
                React.createElement(domui_1.FloatLayerComponent, { activeTime: this.state.switchProcessDialog, divClass: [domui_1.css.activeLayer, domui_1.css.simpleCard, domui_1.css.flexColumn] },
                    React.createElement("div", null,
                        "command:",
                        React.createElement("input", { ref: this.rref.switchProcessInput, type: "text" }),
                        React.createElement("br", null)),
                    React.createElement("div", { className: domui_1.css.flexRow },
                        React.createElement("a", { onClick: () => this.switchProcessDialogOk(), href: "javascript:;", style: { flexGrow: '1' } }, "Ok"),
                        React.createElement("a", { onClick: () => this.setState({ switchProcessDialog: -1 }), href: "javascript:;", style: { flexGrow: '1' } }, "Cancel"))));
        }
    }
    exports.StdioShell = StdioShell;
    class StdioShellTab extends workspace_1.TabInfoBase {
        async init(initval) {
            super.init(initval);
            return this;
        }
        async saveProfile() {
            if (this.path != undefined) {
                await this.workspace.fs.writeAll(this.path, new TextEncoder().encode(JSON.stringify((0, base_1.partial)(this, ['cmdline']))));
            }
        }
        renderPage() {
            return React.createElement(StdioShell, { ws: this.workspace, cmdline: this.cmdline, onProfileChange: (profile) => {
                    for (let k in profile) {
                        this[k] = profile[k];
                    }
                    this.saveProfile();
                } });
        }
    }
    class StdioShellProfile1 extends fileviewer_1.FileTypeHandlerBase {
        constructor() {
            super(...arguments);
            this.title = 'stdio shell';
            this.extension = '.siosp1';
        }
        async create(dir) {
            let path = await this.getUnusedFilename(dir, this.extension);
            this.workspace.fs.writeAll(path, new TextEncoder().encode(JSON.stringify({})));
            return path;
        }
        async open(path) {
            let data = await this.workspace.fs.readAll(path);
            let tab = new StdioShellTab();
            tab.workspace = this.workspace;
            let config = { title: 'StdioShell', opener: this, path };
            if (data != null) {
                (0, base_1.copy)(JSON.parse(new TextDecoder().decode(data)), config, 1);
                tab.init(config);
            }
            else {
                tab.init(config);
            }
            return tab;
        }
    }
    exports.StdioShellProfile1 = StdioShellProfile1;
});
//# sourceMappingURL=stdioshell.js.map