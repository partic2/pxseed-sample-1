define(["require", "exports", "partic2/jsutils1/base", "partic2/pComponentUi/domui", "preact", "partic2/jsutils1/webutils", "partic2/pComponentUi/texteditor", "./Inspector", "./Component1", "partic2/pComponentUi/utils", "./jsutils2"], function (require, exports, base_1, domui_1, React, webutils_1, texteditor_1, Inspector_1, Component1_1, utils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CodeCellList = exports.DefaultCodeCellList = exports.CodeCell = exports.css = void 0;
    exports.setCodeCellListImpl = setCodeCellListImpl;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.css = {
        inputCell: (0, base_1.GenerateRandomString)(),
        outputCell: (0, base_1.GenerateRandomString)(),
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.outputCell, ['overflow:auto']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.inputCell, [
        'display:inline-block', 'border:solid black 2px', 'margin:2px', 'padding:2px', 'background-color:white',
        'font-family:monospace'
    ]);
    function countBracket(s) {
        let bracketMatch = 0;
        bracketMatch += (s.match(/\{/g)?.length ?? 0) - (s.match(/\}/g)?.length ?? 0);
        bracketMatch += (s.match(/\(/g)?.length ?? 0) - (s.match(/\)/g)?.length ?? 0);
        bracketMatch += (s.match(/\[/g)?.length ?? 0) - (s.match(/\]/g)?.length ?? 0);
        return bracketMatch;
    }
    class CodeCell extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                codeInput: new domui_1.ReactRefEx(),
                container: new domui_1.ReactRefEx(),
                focusingCompletionCandidateDiv: new domui_1.ReactRefEx,
                tooltipsDiv: new domui_1.ReactRefEx
            };
            this.ensureCandidateScroll = new jsutils2_1.ThrottleCall(async () => {
                let focusDiv = await this.rref.focusingCompletionCandidateDiv.waitValid();
                let tooltips = await this.rref.tooltipsDiv.waitValid();
                if (focusDiv.offsetTop < tooltips.scrollTop || focusDiv.offsetTop > tooltips.scrollTop + tooltips.offsetHeight) {
                    tooltips.scrollTo({ behavior: 'smooth', top: focusDiv.offsetTop });
                }
            }, 300);
            this.requestCodeComplete = new jsutils2_1.DebounceCall(async () => {
                this.setState({
                    codeCompleteCandidate: await this.codeContext.codeComplete(this.getCellInput(), this.rref.codeInput.current.getTextCaretOffset())
                });
            }, 200);
            this.__focusIn = 'blur';
            this.codeContextCallMethodEvent = async (ev) => {
                let { module, functionName, argv } = ev.data;
                (await new Promise((resolve_1, reject_1) => { require([module], resolve_1, reject_1); }))[functionName](...argv, { codeCell: this, codeContext: this.codeContext });
            };
            this.setState({ codeCompleteCandidate: null, focusin: false, extraTooltips: null, errorCatched: null, focusingCompletionCandidate: 0 });
        }
        async runCode() {
            this.props.onRun?.();
            try {
                this.setState({ cellOutput: 'Running...' });
                let resultVariable = this.state.resultVariable ?? ('__result_' + (0, base_1.GenerateRandomString)());
                let runStatus = await this.codeContext.runCode(this.getCellInput(), resultVariable);
                if (runStatus.err === null && runStatus.stringResult != null) {
                    let cellOutput = runStatus.stringResult;
                    this.setState({ cellOutput, resultVariable });
                }
                else {
                    let cellOutput = await (0, Inspector_1.inspectCodeContextVariable)(new Inspector_1.CodeContextRemoteObjectFetcher(this.codeContext), [resultVariable], { maxDepth: 1 });
                    this.setState({ cellOutput, resultVariable, errorCatched: runStatus.err });
                }
            }
            catch (e) {
                let err = e;
                this.setState({ cellOutput: { message: err.message, stack: err.stack } });
            }
            this.setState({ codeCompleteCandidate: [] });
        }
        renderTooltipsContent() {
            if (this.state.extraTooltips == null && this.state.codeCompleteCandidate == null)
                return null;
            let coor = this.getInputCaretCoordinate();
            if (coor == null)
                return null;
            return React.createElement("div", { style: { position: 'absolute', left: coor?.left, top: coor.bottom, zIndex: '1', overflow: 'auto', maxHeight: '300px', backgroundColor: 'white', border: 'solid black 1px' }, ref: this.rref.tooltipsDiv },
                this.state.extraTooltips ? React.createElement("div", { dangerouslySetInnerHTML: { __html: this.state.extraTooltips } }) : null,
                (() => {
                    if (this.state.codeCompleteCandidate != null) {
                        return React.createElement("div", { style: { display: 'flex', flexDirection: 'column' }, tabIndex: 0 }, this.state.codeCompleteCandidate.map((v, idx) => {
                            let className = [];
                            let ref = null;
                            if (idx === this.state.focusingCompletionCandidate) {
                                className.push(domui_1.css.selected);
                                ref = this.rref.focusingCompletionCandidateDiv;
                            }
                            return React.createElement("div", { ref: ref, className: className.join(' '), onClick: () => {
                                    this.insertCodeComplete(v);
                                } }, v.candidate);
                        }));
                    }
                    else {
                        return null;
                    }
                })());
        }
        getRunCodeKey() {
            return this.props.runCodeKey ?? 'Ctl+Ent';
        }
        async onCellKeyDown(ev) {
            if (ev.code === 'Enter') {
                if (this.getRunCodeKey() === 'Ctl+Ent' && ev.ctrlKey) {
                    this.onBtnRun();
                }
                if (this.getRunCodeKey() == 'Enter') {
                    if (ev.ctrlKey) {
                        //prevent trigger input('\n').Is there better way?
                        this.rref.codeInput.current?.insertText('\n');
                        this.props.onInputChange?.(this);
                    }
                    else {
                        let fullText = (await this.rref.codeInput.waitValid()).getPlainText();
                        if (countBracket(fullText) == 0) {
                            await new Promise(resolve => requestAnimationFrame(resolve));
                            this.rref.codeInput.current?.setPlainText(fullText);
                            this.runCode();
                            return;
                        }
                    }
                }
            }
            else if (ev.code == 'Tab') {
                if (this.state.codeCompleteCandidate != null) {
                    if (this.state.codeCompleteCandidate.length > 0) {
                        this.insertCodeComplete(this.state.codeCompleteCandidate[this.state.focusingCompletionCandidate]);
                    }
                }
                ev.preventDefault();
            }
            else if (ev.code == 'ArrowUp' && this.state.codeCompleteCandidate != null && this.state.codeCompleteCandidate.length > 0) {
                let nextFocus = this.state.focusingCompletionCandidate - 1;
                if (nextFocus < 0) {
                    nextFocus += this.state.codeCompleteCandidate.length;
                }
                this.setState({ focusingCompletionCandidate: nextFocus });
                ev.preventDefault();
                await new Promise(requestAnimationFrame);
                this.ensureCandidateScroll.call();
            }
            else if (ev.code == 'ArrowDown' && this.state.codeCompleteCandidate != null && this.state.codeCompleteCandidate.length > 0) {
                let nextFocus = this.state.focusingCompletionCandidate + 1;
                if (nextFocus >= this.state.codeCompleteCandidate.length) {
                    nextFocus -= this.state.codeCompleteCandidate.length;
                }
                this.setState({ focusingCompletionCandidate: nextFocus });
                ev.preventDefault();
                await new Promise(requestAnimationFrame);
                this.ensureCandidateScroll.call();
            }
        }
        onCellInput(editor, inputData) {
            if (inputData.char == '\n') {
                let fullText = editor.getPlainText();
                let backwardText = fullText.substring(0, editor.getTextCaretOffset()).split('\n');
                if (backwardText.length > 1) {
                    let lastLine = backwardText.at(-2);
                    let leadingSpace = lastLine.match(/^ */)?.at(0) ?? '';
                    //count braket
                    if (countBracket(lastLine) > 0) {
                        leadingSpace += '  ';
                    }
                    editor.insertText(leadingSpace);
                }
            }
            if ((inputData.char != null && inputData.char.search(/[a-zA-Z_\.\/]/) >= 0) || inputData.type === 'deleteContentBackward') {
                this.requestCodeComplete.call();
            }
            this.props.onInputChange?.(this);
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
        resetTooltips() {
            this.setState({ focusingCompletionCandidate: 0, codeCompleteCandidate: null, extraTooltips: null });
        }
        insertCodeComplete(cc) {
            let caret = this.rref.codeInput.current.getTextCaretOffset();
            let delCount = caret - cc.replaceRange[0];
            this.rref.codeInput.current.deleteText(delCount);
            this.rref.codeInput.current.insertText(cc.candidate);
            this.props.onInputChange?.(this);
            this.resetTooltips();
        }
        async doOnFocusChange(focusin, ev) {
            if (this.props.onFocusChange != undefined) {
                this.props.onFocusChange(focusin);
            }
            if (focusin) {
                this.setState({ focusin: true });
                this.__focusIn = 'cell';
            }
            else {
                //wait to check focus really move out
                this.__focusIn = 'blur';
                await (0, base_1.sleep)(100);
                if (this.__focusIn == 'blur') {
                    this.resetTooltips();
                    this.setState({ focusin: false });
                }
            }
        }
        async onBtnRun() {
            this.runCode();
        }
        async onBtnClearOutputs() {
            if (this.state.resultVariable != null) {
                this.codeContext.jsExec(`delete codeContext.localScope['${this.state.resultVariable}']`).catch(() => { });
            }
            this.props.onClearOutputs?.();
            this.setCellOutput('', null);
        }
        renderActionButton() {
            let result = [];
            if (this.props.customBtns != undefined) {
                for (let t1 of this.props.customBtns) {
                    result.push(React.createElement("a", { href: "javascript:;", onClick: () => t1.cb() }, t1.label));
                }
            }
            result.push(React.createElement("a", { href: "javascript:;", onClick: () => this.onBtnRun() },
                "Run(",
                this.getRunCodeKey(),
                ")"));
            result.push(React.createElement("a", { href: "javascript:;", onClick: () => this.onBtnClearOutputs() }, "ClearOutputs"));
            result = result.map(v => [React.createElement("span", null, "\u00A0\u00A0"), v, React.createElement("span", null, "\u00A0\u00A0")]);
            return result;
        }
        beforeRender() {
            if (this.codeContext != this.props.codeContext) {
                if (this.codeContext != undefined) {
                    this.codeContext.event.removeEventListener(`${__name__}.CodeCell.callWebuiFunction`, this.codeContextCallMethodEvent);
                }
                this.codeContext = this.props.codeContext;
                this.codeContext.event.addEventListener(`${__name__}.CodeCell.callWebuiFunction`, this.codeContextCallMethodEvent);
            }
        }
        render(props, state, context) {
            this.beforeRender();
            return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', position: 'relative', ...this.props.divStyle }, ref: this.rref.container, ...this.props.divAttr, onFocusIn: (ev) => {
                    this.props.divAttr?.onFocusIn?.(ev);
                    if (!ev.defaultPrevented) {
                        this.doOnFocusChange(true, ev);
                    }
                }, onFocusOut: (ev) => {
                    this.props.divAttr?.onFocusOut?.(ev);
                    if (!ev.defaultPrevented) {
                        this.doOnFocusChange(false, ev);
                    }
                } },
                React.createElement(texteditor_1.TextEditor, { ref: this.rref.codeInput, divAttr: { onKeyDown: (ev) => this.onCellKeyDown(ev), onClick: () => {
                            if (this.state.codeCompleteCandidate != null || this.state.extraTooltips != null) {
                                this.resetTooltips();
                            }
                        } }, onInput: (target, inputData) => this.onCellInput(target, inputData), divClass: [exports.css.inputCell, ...(this.props.inputClass ?? [])] }),
                this.state.focusin ? React.createElement("div", { style: { position: 'relative', display: 'flex', justifyContent: 'end' } },
                    React.createElement("div", { style: { position: 'absolute', backgroundColor: 'white', maxWidth: '50%', wordBreak: 'break-all' } },
                        React.createElement("div", null, this.renderActionButton()))) : null,
                this.renderTooltipsContent(),
                React.createElement("div", null, this.state.errorCatched != null ? 'THROW:' : null),
                React.createElement("div", { style: { overflow: 'auto' } },
                    React.createElement(Component1_1.ObjectViewer, { object: this.state.cellOutput, name: '', codeContext: this.codeContext, variableName: this.state.resultVariable ?? undefined })));
        }
        getInputCaretCoordinate() {
            let codeInput = this.rref.codeInput.current;
            if (codeInput == null || codeInput.rref.div1.current == null)
                return null;
            let coor = codeInput.getCoordinateByTextOffset(codeInput.getTextCaretOffset());
            if (coor == null)
                return null;
            let { offsetLeft, offsetTop } = codeInput.rref.div1.current;
            coor.left += offsetLeft;
            coor.top += offsetTop;
            coor.bottom += offsetTop;
            return coor;
        }
        async setAsEditTarget() {
            (await this.rref.codeInput.waitValid()).setTextCaretOffset('end');
        }
        async close() {
            if (this.state.resultVariable != null) {
                try {
                    await this.codeContext.jsExec(`delete codeContext.localScope['${this.state.resultVariable}']`);
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
            this.__initCellValue = null;
            this.lastRunCellKey = '';
            this.__currentCodeContext = null;
            this.rref = {
                container: new domui_1.ReactRefEx()
            };
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
            this.setState({ padBottomCell: 300 });
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
            if (pos < 0) {
                pos = this.state.list.length - 1;
            }
            let newKey = (0, base_1.GenerateRandomString)();
            this.state.list.splice(pos + 1, 0, { ref: new domui_1.ReactRefEx(), key: newKey });
            await new Promise(resolve => this.forceUpdate(resolve));
            this.props.onCellListChange?.();
            return newKey;
        }
        async setCurrentEditing(cellKey) {
            let cell2 = this.state.list.find(v => v.key == cellKey);
            if (cell2 != undefined && cell2.ref.current != undefined) {
                await cell2.ref.current.setAsEditTarget();
            }
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
                await new Promise(resolve => this.forceUpdate(resolve));
            }
            this.props.onCellListChange?.();
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
            this.__initCellValue = null;
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
        getCellList() {
            return this.state.list;
        }
        render(props, state, context) {
            this.beforeRender();
            return (this.state.codeContext != null && this.state.error == null) ? React.createElement("div", { style: { width: '100%', overflowX: 'auto', position: 'relative' }, ref: this.rref.container },
                (0, jsutils2_1.FlattenArraySync)(this.state.list.map((v, index1) => {
                    let cellCssStyle = {};
                    if (this.state.lastFocusCellKey === v.key) {
                        cellCssStyle.zIndex = 100;
                    }
                    let r = [React.createElement(CodeCell, { ref: v.ref, key: v.key, codeContext: this.state.codeContext, customBtns: [
                                { label: 'New', cb: () => this.newCell(v.key) },
                                { label: 'Del', cb: () => this.deleteCell(v.key) }
                            ], onClearOutputs: () => this.clearConsoleOutput(v.key), onRun: async () => {
                                this.lastRunCellKey = v.key;
                                this.props.onRun?.(v.key);
                            }, onFocusChange: (focusin) => {
                                if (focusin) {
                                    this.setState({ lastFocusCellKey: v.key });
                                }
                            }, divStyle: cellCssStyle, ...this.props.cellProps })];
                    if (v.key in this.state.consoleOutput) {
                        r.push(React.createElement("div", { style: { wordBreak: 'break-all' }, dangerouslySetInnerHTML: { __html: (0, utils_1.text2html)(this.state.consoleOutput[v.key].content) } }));
                    }
                    return r;
                })),
                React.createElement("div", { style: { height: this.state.padBottomCell + 'px' } })) :
                React.createElement("div", { style: { width: '100%', overflow: 'auto', position: 'relative' }, ref: this.rref.container },
                    React.createElement("pre", null, this.state.error),
                    React.createElement("a", { href: "javascript:;", onClick: () => this.resetState() }, "Reset"));
        }
        componentDidUpdate() {
            if (this.__initCellValue !== null && this.state.codeContext != null) {
                this.__initCellValue.forEach((val, index) => {
                    this.state.list[index].ref.current.setCellInput(val.input);
                    val.output[0] = (0, Inspector_1.fromSerializableObject)(val.output[0], { fetcher: new Inspector_1.CodeContextRemoteObjectFetcher(this.state.codeContext), accessPath: [val.output[1] ?? ''] });
                    this.state.list[index].ref.current.setCellOutput(...val.output);
                });
                this.__initCellValue = null;
            }
        }
        saveTo() {
            let cellData = new Inspector_1.CodeCellListData();
            cellData.cellList = this.state.list.map((cell, index) => ({
                cellInput: cell.ref.current.getCellInput(),
                cellOutput: cell.ref.current.getCellOutput(),
                key: cell.key
            }));
            cellData.consoleOutput = this.state.consoleOutput;
            return cellData.saveTo();
        }
        async loadFrom(data) {
            try {
                let cellData = new Inspector_1.CodeCellListData();
                cellData.loadFrom(data);
                ;
                while (this.state.list.length < cellData.cellList.length) {
                    this.state.list.push({ ref: new domui_1.ReactRefEx(), key: (0, base_1.GenerateRandomString)() });
                }
                let consoleOutput = {};
                for (let k1 in cellData.consoleOutput) {
                    let index = cellData.cellList.findIndex(v => v.key === k1);
                    if (index >= 0) {
                        consoleOutput[this.state.list[index].key] = cellData.consoleOutput[k1];
                    }
                }
                this.__initCellValue = cellData.cellList.map(v => ({ input: v.cellInput, output: v.cellOutput }));
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