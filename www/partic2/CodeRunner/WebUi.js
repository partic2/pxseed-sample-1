define(["require", "exports", "partic2/jsutils1/base", "partic2/pComponentUi/domui", "preact", "partic2/jsutils1/webutils", "partic2/pComponentUi/texteditor", "./Inspector", "./Component1"], function (require, exports, base_1, domui_1, React, webutils_1, texteditor_1, Inspector_1, Component1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeCellList = exports.DefaultCodeCellList = exports.CodeCell = exports.css = void 0;
    exports.setCodeCellListImpl = setCodeCellListImpl;
    exports.css = {
        inputCell: domui_1.css.simpleCard,
        outputCell: (0, base_1.GenerateRandomString)(),
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.outputCell, ['overflow:auto']);
    class CodeCell extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                codeInput: new domui_1.ReactRefEx(),
                container: new domui_1.ReactRefEx()
            };
            this.requestCodeComplete = new Inspector_1.DelayOnceCall(async () => {
                this.setState({
                    codeCompleteCandidate: await this.props.codeContext.codeComplete(this.getCellInput(), this.rref.codeInput.current.getTextCaretOffset())
                });
            }, 300);
            this.setState({ codeCompleteCandidate: null, focusin: false });
        }
        async runCode() {
            try {
                this.setState({ cellOutput: 'Running...' });
                let resultVariable = this.state.resultVariable ?? ('__result_' + (0, base_1.GenerateRandomString)());
                let runStatus = await this.props.codeContext.runCode(this.getCellInput(), resultVariable);
                if (runStatus.err === null) {
                    let cellOutput = await (0, Inspector_1.inspectCodeContextVariable)(new Inspector_1.CodeContextRemoteObjectFetcher(this.props.codeContext), [resultVariable], { maxDepth: 1 });
                    this.setState({ cellOutput, resultVariable });
                }
                else {
                    let err = runStatus.err;
                    this.setState({ cellOutput: err, resultVariable: null });
                }
            }
            catch (e) {
                let err = e;
                this.setState({ cellOutput: { message: err.message, stack: err.stack } });
            }
            this.setState({ codeCompleteCandidate: [] });
        }
        onCellKeyDown(ev) {
            if (ev.code === 'Enter' && ev.ctrlKey) {
                this.onBtnRun();
            }
            else if (ev.code == 'Tab') {
                if (this.state.codeCompleteCandidate != null) {
                    if (this.state.codeCompleteCandidate.length > 0) {
                        this.insertCodeComplete(this.state.codeCompleteCandidate[0]);
                    }
                }
                ev.preventDefault();
            }
        }
        onCellInput(editor, inputData) {
            if (inputData.char != null && inputData.char.search(/[a-zA-Z_\.\/]/) >= 0) {
                this.requestCodeComplete.call();
            }
            if (inputData.char == '\n') {
                let backwardText = editor.getPlainText().substring(0, editor.getTextCaretOffset()).split('\n');
                if (backwardText.length > 1) {
                    let lastLine = backwardText.at(-2);
                    let leadingSpace = lastLine.match(/^ */)?.at(0) ?? '';
                    //count braket
                    let bracketMatch = 0;
                    if (bracketMatch == 0) {
                        bracketMatch = (lastLine.match(/\{/g)?.length ?? 0) - (lastLine.match(/\}/g)?.length ?? 0);
                    }
                    if (bracketMatch == 0) {
                        bracketMatch = (lastLine.match(/\(/g)?.length ?? 0) - (lastLine.match(/\)/g)?.length ?? 0);
                    }
                    if (bracketMatch > 0) {
                        leadingSpace += '  ';
                    }
                    editor.insertText(leadingSpace);
                }
            }
        }
        getCellInput() {
            let t1 = this.rref.codeInput.current.getPlainText();
            return t1;
        }
        getCellOutput() {
            return [this.state.cellOutput, this.state.resultVariable ?? null];
        }
        setCellInput(input) {
            this.rref.codeInput.current.setPlainText(input);
        }
        setCellOutput(output, resultVariable) {
            this.setState({ cellOutput: output, resultVariable });
        }
        insertCodeComplete(cc) {
            let caret = this.rref.codeInput.current.getTextCaretOffset();
            let delCount = caret - cc.replaceRange[0];
            this.rref.codeInput.current.deleteText(delCount);
            this.rref.codeInput.current.insertText(cc.candidate);
        }
        renderCodeComplete() {
            if (this.state.codeCompleteCandidate != null && this.state.focusin) {
                return React.createElement("div", { style: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap' } }, this.state.codeCompleteCandidate.map(v => {
                    return [React.createElement("span", null, "\u00A0\u00A0"), React.createElement("a", { href: "javascript:;", onClick: () => this.insertCodeComplete(v) },
                            v.candidate,
                            "(",
                            v.type,
                            ")"), React.createElement("span", null, "\u00A0\u00A0")];
                }));
            }
        }
        async doOnFocusChange(focusin) {
            if (this.props.onFocusChange != undefined) {
                this.props.onFocusChange(focusin);
            }
            if (this.props.focusin === 'auto') {
                if (focusin) {
                    //avoid click event failed.
                    await (0, base_1.sleep)(200);
                    this.setState({ focusin: true });
                }
                else {
                    //wait to check focus realy move out
                    await (0, base_1.sleep)(500);
                    if (document.activeElement == null ||
                        (this.rref.container.current != null &&
                            (document.activeElement.compareDocumentPosition(this.rref.container.current) & Node.DOCUMENT_POSITION_CONTAINS) === 0)) {
                        this.setState({ focusin: false });
                    }
                }
            }
        }
        async onBtnRun() {
            this.props.onRun?.();
            this.runCode();
        }
        async onBtnClearOutputs() {
            if (this.state.resultVariable != null) {
                try {
                    await this.props.codeContext.jsExec(`delete codeContext.localScope['${this.state.resultVariable}']`);
                }
                catch (e) { }
                ;
            }
            this.props.onClearOutputs?.();
            this.setCellOutput('', null);
        }
        renderActionButton() {
            let result = [];
            if (this.state.focusin) {
                if (this.props.customBtns != undefined) {
                    for (let t1 of this.props.customBtns) {
                        result.push(React.createElement("a", { href: "javascript:;", onClick: () => t1.cb() }, t1.label));
                    }
                }
                result.push(React.createElement("a", { href: "javascript:;", onClick: () => this.onBtnRun() }, "Run(Ctl+Ent)"));
                result.push(React.createElement("a", { href: "javascript:;", onClick: () => this.onBtnClearOutputs() }, "ClearOutputs"));
            }
            result = result.map(v => [React.createElement("span", null, "\u00A0\u00A0"), v, React.createElement("span", null, "\u00A0\u00A0")]);
            return result;
        }
        renderTooltip() {
            if (this.state.tooltip != undefined) {
                return React.createElement("div", { dangerouslySetInnerHTML: { __html: this.state.tooltip } });
            }
            else {
                return null;
            }
        }
        prepareRender() {
            if (this.props.focusin !== 'auto') {
                if (this.state.focusin !== this.props.focusin) {
                    this.setState({ focusin: this.props.focusin });
                }
            }
        }
        render(props, state, context) {
            this.prepareRender();
            return React.createElement("div", { style: { display: 'flex', flexDirection: 'column' }, ref: this.rref.container, onFocusOut: () => this.doOnFocusChange(false), onFocusIn: () => { this.doOnFocusChange(true); } },
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.codeInput, divAttr: { onKeyDown: (ev) => this.onCellKeyDown(ev) }, onInput: (target, inputData) => this.onCellInput(target, inputData), divClass: [exports.css.inputCell] }),
                React.createElement("div", null, this.renderActionButton()),
                React.createElement("div", null, this.renderCodeComplete()),
                React.createElement("div", null, this.renderTooltip()),
                React.createElement(Component1_1.ObjectViewer, { object: this.state.cellOutput, name: '' }));
        }
        async setAsEditTarget() {
            (await this.rref.codeInput.waitValid()).setTextCaretOffset('end');
        }
        async close() {
            if (this.state.resultVariable != null) {
                try {
                    await this.props.codeContext.jsExec(`delete codeContext.localScope['${this.state.resultVariable}']`);
                }
                catch (e) { }
                ;
            }
        }
    }
    exports.CodeCell = CodeCell;
    class DefaultCodeCellList extends React.Component {
        constructor(prop, ctx) {
            super(prop, ctx);
            this.priv__initCellValue = null;
            this.lastRunCellKey = '';
            this.__currentCodeContext = null;
            this.onConsoleData = (event) => {
                let index = this.state.list.findIndex(v => v.key === this.lastRunCellKey);
                if (index < 0)
                    index = 0;
                let cell = this.state.list[index];
                if (!(cell.key in this.state.consoleOutput)) {
                    this.state.consoleOutput[cell.key] = { content: '' };
                }
                this.state.consoleOutput[cell.key].content += `[${event.data?.level ?? ''}]:${event.data?.message ?? ''}\n`;
                this.forceUpdate();
            };
            this.resetState();
        }
        beforeRender() {
            if (this.props.codeContext !== this.state.codeContext) {
                if (this.state.codeContext != null) {
                    this.state.codeContext.event.removeEventListener('console.data', this.onConsoleData);
                }
                this.props.codeContext.event.addEventListener('console.data', this.onConsoleData);
                this.setState({ codeContext: this.props.codeContext });
            }
        }
        async newCell(afterCellKey) {
            let pos = this.state.list.findIndex(v => v.key == afterCellKey);
            if (pos < 0)
                pos = this.state.list.length - 1;
            this.state.list.splice(pos + 1, 0, { ref: new domui_1.ReactRefEx(), key: (0, base_1.GenerateRandomString)() });
            this.forceUpdate();
        }
        async deleteCell(cellKey) {
            let pos = this.state.list.findIndex(v => v.key == cellKey);
            try {
                await this.state.list[pos].ref.current?.close();
            }
            catch (e) { }
            ;
            if (pos >= 0) {
                this.state.list.splice(pos, 1);
                this.forceUpdate();
            }
        }
        async runCell(cellKey) {
            let cell = this.state.list.find(v => v.key == cellKey);
            (0, base_1.assert)(cell != undefined);
            cell.ref.current.runCode();
        }
        async setCellInput(cellKey, input) {
            let cell = this.state.list.find(v => v.key == cellKey);
            (0, base_1.assert)(cell != undefined);
            cell.ref.current.setCellInput(input);
        }
        clearConsoleOutput(key) {
            delete this.state.consoleOutput[key];
            this.forceUpdate();
        }
        resetState() {
            this.priv__initCellValue = null;
            this.lastRunCellKey = '';
            this.setState({
                list: [{ ref: new domui_1.ReactRefEx(), key: (0, base_1.GenerateRandomString)() }],
                consoleOutput: {},
                error: null,
                codeContext: null,
                lastFocusCellKey: ''
            });
            this.forceUpdate();
        }
        render(props, state, context) {
            this.beforeRender();
            return (this.state.codeContext != null && this.state.error == null) ? React.createElement("div", { style: { width: '100%', overflowX: 'auto' } }, (0, base_1.FlattenArraySync)(this.state.list.map((v, index1) => {
                let r = [React.createElement(CodeCell, { ref: v.ref, key: v.key, codeContext: this.state.codeContext, customBtns: [
                            { label: 'New', cb: () => this.newCell(v.key) },
                            { label: 'Del', cb: () => this.deleteCell(v.key) }
                        ], onClearOutputs: () => this.clearConsoleOutput(v.key), onRun: async () => { this.lastRunCellKey = v.key; }, onFocusChange: (focusin) => { if (focusin)
                            this.setState({ lastFocusCellKey: v.key }); }, focusin: this.state.lastFocusCellKey == v.key })];
                if (v.key in this.state.consoleOutput) {
                    r.push(React.createElement("pre", null, this.state.consoleOutput[v.key].content));
                }
                return r;
            }))) :
                React.createElement("div", null,
                    React.createElement("pre", null, this.state.error),
                    React.createElement("a", { href: "javascript:;", onClick: () => this.resetState() }, "Reset"));
        }
        componentDidUpdate() {
            if (this.priv__initCellValue !== null && this.state.codeContext != null) {
                this.priv__initCellValue.forEach((val, index) => {
                    this.state.list[index].ref.current.setCellInput(val.input);
                    val.output[0] = (0, Inspector_1.fromSerializableObject)(val.output[0], { fetcher: new Inspector_1.CodeContextRemoteObjectFetcher(this.state.codeContext), accessPath: [val.output[1] ?? ''] });
                    this.state.list[index].ref.current.setCellOutput(...val.output);
                });
                this.priv__initCellValue = null;
            }
        }
        saveTo() {
            let saved = {
                cellList: this.state.list.map((cell, index) => ({
                    cellInput: cell.ref.current.getCellInput(),
                    cellOutput: cell.ref.current.getCellOutput(),
                    key: cell.key
                })),
                consoleOutput: this.state.consoleOutput
            };
            return JSON.stringify(saved);
        }
        async validLoadFromData(data) {
            let loaded = JSON.parse(data);
            for (let t1 of loaded.cellList) {
                (0, base_1.assert)(typeof (t1.cellInput) === 'string');
                (0, base_1.assert)(t1.cellOutput.length == 2);
                (0, base_1.assert)(typeof (t1.cellOutput[1]) === 'string' || t1.cellOutput[1] === null);
                (0, base_1.assert)(typeof (t1.key) === 'string');
            }
            return loaded;
        }
        async loadFrom(data) {
            try {
                let loaded = await this.validLoadFromData(data);
                let cellList = loaded.cellList;
                while (this.state.list.length < cellList.length) {
                    this.state.list.push({ ref: new domui_1.ReactRefEx(), key: (0, base_1.GenerateRandomString)() });
                }
                let consoleOutput = {};
                for (let k1 in loaded.consoleOutput) {
                    let index = cellList.findIndex(v => v.key === k1);
                    if (index >= 0) {
                        consoleOutput[this.state.list[index].key] = loaded.consoleOutput[k1];
                    }
                }
                this.priv__initCellValue = cellList.map(v => ({ input: v.cellInput, output: v.cellOutput }));
                this.setState({ consoleOutput });
                this.forceUpdate();
            }
            catch (e) {
                this.setState({ error: e.message + '\n' + (e.stack ?? '') });
            }
        }
    }
    exports.DefaultCodeCellList = DefaultCodeCellList;
    exports.CodeCellList = DefaultCodeCellList;
    function setCodeCellListImpl(ccl) {
        exports.CodeCellList = ccl;
    }
});
//# sourceMappingURL=WebUi.js.map