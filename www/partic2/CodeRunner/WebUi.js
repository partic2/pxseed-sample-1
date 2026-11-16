define("partic2/CodeRunner/WebUi", ["require", "exports", "partic2/jsutils1/base", "partic2/pComponentUi/domui", "./CodeContext", "preact", "partic2/jsutils1/webutils", "partic2/pComponentUi/texteditor", "./Inspector", "./Component1", "partic2/pComponentUi/utils", "./jsutils2"], function (require, exports, base_1, domui_1, CodeContext_1, React, webutils_1, texteditor_1, Inspector_1, Component1_1, utils_1, jsutils2_1) {
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
    class CodeCell extends domui_1.JsxClassComponent {
        set codeContext(v) {
            let prev = this.__codeContext;
            this.__codeContext = v;
        }
        get codeContext() {
            return this.__codeContext;
        }
        constructor(prop, ctx) {
            super(prop, ctx);
            this.rref = {
                codeInput: new domui_1.ReactRefEx(),
                container: new domui_1.ReactRefEx(),
                focusingCompletionCandidateDiv: new domui_1.ReactRefEx,
                tooltipsDiv: new domui_1.ReactRefEx
            };
            this.completion = {
                candidate: null,
                focusingIndex: -1
            };
            this.extraTooltips = null;
            this.focusin = false;
            this.errorCatched = null;
            this.initialized = new base_1.future();
            this.ensureCandidateScroll = new jsutils2_1.ThrottleCall(async () => {
                let focusDiv = await this.rref.focusingCompletionCandidateDiv.waitValid();
                let tooltips = await this.rref.tooltipsDiv.waitValid();
                if (focusDiv.offsetTop < tooltips.scrollTop || focusDiv.offsetTop > tooltips.scrollTop + tooltips.offsetHeight) {
                    tooltips.scrollTo({ behavior: 'smooth', top: focusDiv.offsetTop });
                }
            }, 300);
            this.requestDebouncer = {
                requestCodeComplete: new jsutils2_1.DebounceCall(async () => this.requestCodeComplete(), 200),
                requestTooltips: new jsutils2_1.DebounceCall(async () => this.requestTooltips(), 200),
            };
            this.__focusIn = 'blur';
            this.initialize().then(() => this.initialized.setResult(), (err) => this.initialized.setException(err)).then(() => this.setState({}));
        }
        async initialize() {
        }
        getContainerDiv() {
            return this.rref.container.current;
        }
        async runCode() {
            this.onRun?.();
            try {
                this.cellOutput = 'Running...';
                this.completion.candidate = null;
                this.setState({});
                this.resultVariable = this.resultVariable ?? ('__result_' + (0, base_1.GenerateRandomString)());
                let runStatus = await this.codeContext.runCode(this.getCellInput(), this.resultVariable);
                if (runStatus.err === null && runStatus.stringResult != null) {
                    this.cellOutput = runStatus.stringResult;
                    this.setState({});
                }
                else {
                    this.cellOutput = await (0, Inspector_1.inspectCodeContextVariable)(await (0, Inspector_1.ensureJavascriptInspectorForCodeContextInstalled)(this.codeContext), [this.resultVariable], { maxDepth: 1 });
                    this.errorCatched = runStatus.err;
                    this.setState({});
                }
            }
            catch (e) {
                let err = e;
                (0, base_1.throwIfAbortError)(err);
                this.cellOutput = { message: err.message, stack: err.stack };
                this.setState({});
            }
            finally {
                this.onRunResult?.();
            }
        }
        renderTooltipsContent() {
            if (this.extraTooltips == null && this.completion.candidate == null)
                return null;
            let coor = this.getInputCaretCoordinate();
            if (coor == null)
                return null;
            return React.createElement("div", { style: { position: 'absolute', left: coor?.left, top: coor.bottom, zIndex: '1', overflow: 'auto', maxHeight: '300px', backgroundColor: 'white', border: 'solid black 1px' }, ref: this.rref.tooltipsDiv },
                this.extraTooltips ? React.createElement("div", { dangerouslySetInnerHTML: { __html: this.extraTooltips } }) : null,
                (() => {
                    if (this.completion.candidate != null) {
                        return React.createElement("div", { style: { display: 'flex', flexDirection: 'column' }, tabIndex: 0 }, this.completion.candidate.map((v, idx) => {
                            let className = [];
                            let ref = null;
                            if (idx === this.completion.focusingIndex) {
                                className.push(domui_1.css.selected);
                                ref = this.rref.focusingCompletionCandidateDiv;
                            }
                            return React.createElement("div", { ref: ref, className: className.join(' '), onClick: () => {
                                    this.insertCodeComplete(v);
                                } },
                                "[",
                                v.type.charAt(0).toUpperCase(),
                                "]",
                                v.candidate);
                        }));
                    }
                    else {
                        return null;
                    }
                })());
        }
        async requestCodeComplete() {
            let codeCompleteCandidate = await (await (0, Inspector_1.ensureJavascriptInspectorForCodeContextInstalled)(this.codeContext)).requestCodeCompletion(this.getCellInput(), this.rref.codeInput.current.getTextCaretOffset());
            this.completion.candidate = codeCompleteCandidate;
            this.completion.focusingIndex = 0;
            this.setState({});
        }
        async requestTooltips() {
            let extraTooltips = await (await (0, Inspector_1.ensureJavascriptInspectorForCodeContextInstalled)(this.codeContext)).requestExtraTooltips(this.getCellInput(), this.rref.codeInput.current.getTextCaretOffset());
            this.extraTooltips = extraTooltips;
            this.setState({});
        }
        getRunCodeKey() {
            return this.runCodeKey ?? 'Ctl+Ent';
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
                        this.onInputChange?.(this);
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
                if (this.completion.candidate != null) {
                    if (this.completion.candidate.length > 0) {
                        this.insertCodeComplete(this.completion.candidate[this.completion.focusingIndex]);
                    }
                }
                ev.preventDefault();
            }
            else if (ev.code == 'ArrowUp') {
                if (this.completion.candidate != null && this.completion.candidate.length > 0) {
                    let nextFocus = this.completion.focusingIndex - 1;
                    if (nextFocus < 0) {
                        nextFocus += this.completion.candidate.length;
                    }
                    this.completion.focusingIndex = nextFocus;
                    this.setState({});
                    ev.preventDefault();
                    await new Promise(requestAnimationFrame);
                    this.ensureCandidateScroll.call();
                }
                else if (this.rref.codeInput.current != null && this.rref.codeInput.current.isEditing()) {
                    if (this.rref.codeInput.current.getTextCaretOffset() === 0) {
                        this.onPreviousCell?.();
                    }
                }
            }
            else if (ev.code == 'ArrowDown') {
                if (this.completion.candidate != null && this.completion.candidate.length > 0) {
                    let nextFocus = this.completion.focusingIndex + 1;
                    if (nextFocus >= this.completion.candidate.length) {
                        nextFocus -= this.completion.candidate.length;
                    }
                    this.completion.focusingIndex = nextFocus;
                    this.setState({});
                    ev.preventDefault();
                    await new Promise(requestAnimationFrame);
                    this.ensureCandidateScroll.call();
                }
                else if (this.rref.codeInput.current != null && this.rref.codeInput.current.isEditing()) {
                    let plainText = this.rref.codeInput.current.getPlainText();
                    if (this.rref.codeInput.current.getTextCaretOffset() >= plainText.length) {
                        this.onNextCell?.();
                    }
                }
            }
            else if (ev.code == 'Escape' && this.completion.candidate != null) {
                this.resetTooltips();
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
                this.requestDebouncer.requestCodeComplete.call();
            }
            if (inputData.char == '(') {
                this.requestDebouncer.requestTooltips.call();
            }
            else {
                //BUG?: "setState" before "onInput" return trigger by full-width character lead to double input sometimes.
                requestAnimationFrame(() => this.setState({ extraTooltips: null }));
            }
            this.onInputChange?.(this);
        }
        getCellInput() {
            let t1 = this.rref.codeInput.current.getPlainText();
            return t1;
        }
        getCellOutput() {
            return [this.cellOutput, this.resultVariable ?? null];
        }
        setCellInput(input) {
            this.rref.codeInput.current.setPlainText(input);
        }
        setCellOutput(output, resultVariable) {
            this.cellOutput = output;
            this.resultVariable = resultVariable;
            this.errorCatched = null;
            this.setState({});
        }
        getCellInputHtml() {
            return this.rref.codeInput.current?.getHtml() ?? null;
        }
        setCellInputHtml(html) {
            let input1 = this.rref.codeInput.current;
            if (input1 == undefined)
                return;
            let caret = null;
            if (input1.isEditing()) {
                caret = input1.getTextCaretOffset();
            }
            input1.setHtml(html);
            if (caret != null) {
                input1.setTextCaretOffset(caret);
            }
        }
        resetTooltips() {
            this.completion.candidate = null;
            this.completion.focusingIndex = -1;
            this.extraTooltips = null;
            this.setState({});
        }
        insertCodeComplete(cc) {
            this.rref.codeInput.current.setTextCaretOffset(cc.replaceRange[1]);
            let delCount = cc.replaceRange[1] - cc.replaceRange[0];
            this.rref.codeInput.current.deleteText(delCount);
            this.rref.codeInput.current.insertText(cc.candidate);
            this.onInputChange?.(this);
            this.resetTooltips();
        }
        async doOnFocusChange(focusin, ev) {
            if (this.onFocusChange != undefined) {
                this.onFocusChange(focusin);
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
            if (this.resultVariable != null) {
                this.codeContext.callFunction('deleteVariables', [[this.resultVariable]]);
            }
            this.onClearOutputs?.();
            this.setCellOutput(undefined, null);
        }
        renderActionButton() {
            let result = [];
            if (this.customBtns != undefined) {
                for (let t1 of this.customBtns) {
                    result.push(React.createElement("a", { href: "javascript:;", onClick: () => t1.cb(), title: t1.title }, t1.label));
                }
            }
            result.push(React.createElement("a", { href: "javascript:;", onClick: () => this.onBtnRun(), title: `Run cell(${this.getRunCodeKey()})` }, "Run"));
            result.push(React.createElement("a", { href: "javascript:;", onClick: () => this.onBtnClearOutputs(), title: `Clear outputs` }, "Clr"));
            result = result.map(v => [React.createElement("span", null, "\u00A0\u00A0"), v, React.createElement("span", null, "\u00A0\u00A0")]);
            return result;
        }
        renderCellInput() {
            return React.createElement(texteditor_1.TextEditor, { ref: this.rref.codeInput, divAttr: { onKeyDown: (ev) => this.onCellKeyDown(ev), onClick: () => {
                        if (this.completion.candidate != null || this.extraTooltips != null) {
                            this.resetTooltips();
                        }
                    } }, onInput: (target, inputData) => this.onCellInput(target, inputData), divClass: [exports.css.inputCell, ...(this.inputClass ?? [])] });
        }
        renderCellOutput() {
            return [
                React.createElement("div", null, this.errorCatched != null ? 'THROW:' : null),
                React.createElement("div", { style: { overflow: 'auto' } }, this.cellOutput === undefined ? null : React.createElement(Component1_1.ObjectViewer, { object: this.cellOutput, name: '', codeContext: this.codeContext, variableName: this.resultVariable ?? undefined }))
            ];
        }
        jsx(props, state, context) {
            if (!this.initialized.done) {
                return null;
            }
            return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', position: 'relative', ...this.divStyle }, ref: this.rref.container, ...this.divAttr, onFocusIn: (ev) => {
                    this.divAttr?.onFocusIn?.(ev);
                    if (!ev.defaultPrevented) {
                        this.doOnFocusChange(true, ev);
                    }
                }, onFocusOut: (ev) => {
                    this.divAttr?.onFocusOut?.(ev);
                    if (!ev.defaultPrevented) {
                        this.doOnFocusChange(false, ev);
                    }
                } },
                this.renderCellInput(),
                this.focusin ? React.createElement("div", { style: { position: 'relative', display: 'flex', flexDirection: 'row-reverse' } },
                    React.createElement("div", { style: { position: 'absolute', backgroundColor: 'white', maxWidth: '50%', wordBreak: 'break-all' } },
                        React.createElement("div", null, this.renderActionButton()))) : null,
                this.renderTooltipsContent(),
                this.renderCellOutput());
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
            this.rref.container.current?.focus();
            this.rref.codeInput.current?.setTextCaretOffset('end');
        }
        async close() {
            if (this.resultVariable != null) {
                try {
                    this.codeContext.callFunction('deleteVariables', [[this.resultVariable]]);
                }
                catch (e) { }
                ;
            }
        }
    }
    exports.CodeCell = CodeCell;
    class DefaultCodeCellList extends domui_1.JsxClassComponent {
        set codeContext(cur) {
            let pre = this.__codeContext;
            this.__codeContext = cur;
            if (pre != null) {
                this.detachCodeContext(pre);
            }
            if (cur != null) {
                this.attachCodeContext(cur);
            }
        }
        get codeContext() {
            return this.__codeContext;
        }
        constructor(prop, ctx) {
            super(prop, ctx);
            this.list = [];
            this.consoleOutput = {};
            this.error = null;
            this.lastFocusCellKey = null;
            this.lastRunCellKey = '';
            this.initialized = new base_1.future();
            this.__currentCodeContext = null;
            this.rref = {
                container: new domui_1.ReactRefEx()
            };
            this.codeContextCallMethodEvent = async (ev) => {
                let { module, functionName, argv } = ev.data;
                (await new Promise((resolve_1, reject_1) => { require([module], resolve_1, reject_1); }))[functionName](...argv, { codeCell: this, codeContext: this.codeContext });
            };
            this.onConsoleData = (event) => {
                let index = this.list.findIndex(v => v.key === this.lastRunCellKey);
                if (index < 0)
                    index = 0;
                let cell = this.list[index];
                if (!(cell.key in this.consoleOutput)) {
                    this.consoleOutput[cell.key] = { content: '' };
                }
                this.consoleOutput[cell.key].content += `[${event.data?.level ?? ''}]:${event.data?.message ?? ''}\n`;
                this.forceUpdate();
            };
            this.initialize().then(() => this.initialized.setResult(), (err) => this.initialized.setException(err)).then(() => this.setState({}));
        }
        async initialize() {
            this.setState({ list: [], consoleOutput: {}, error: null, codeContext: null, lastFocusCellKey: '' });
        }
        async detachCodeContext(codeContext) {
            codeContext.event.removeEventListener('console.data', this.onConsoleData);
            codeContext.event.removeEventListener(`${__name__}.CodeCellList.callWebuiFunction`, this.codeContextCallMethodEvent);
            this.codeContext.event.dispatchEvent(new CodeContext_1.CodeContextEvent(`${__name__}.CodeCellList.webuiDetach`));
        }
        async attachCodeContext(codeContext) {
            (0, Inspector_1.ensureJavascriptInspectorForCodeContextInstalled)(codeContext);
            this.codeContext.event.addEventListener('console.data', this.onConsoleData);
            this.codeContext.event.addEventListener(`${__name__}.CodeCellList.callWebuiFunction`, this.codeContextCallMethodEvent);
            this.codeContext.event.dispatchEvent(new CodeContext_1.CodeContextEvent(`${__name__}.CodeCellList.webuiAttached`));
        }
        async componentDidUpdate() {
            if (this.getCellList().length == 0) {
                await this.newCell();
            }
        }
        componentWillUnmount() {
            if (this.codeContext != null) {
                this.detachCodeContext(this.codeContext);
            }
            if (this.codeContext != null) {
                this.detachCodeContext(this.codeContext);
            }
        }
        async newCell(afterCellKey) {
            let pos = afterCellKey == undefined ? -1 : this.list.findIndex(v => v.key === afterCellKey);
            let newKey = (0, base_1.GenerateRandomString)();
            if (pos < 0) {
                this.list.push({ ref: new domui_1.ReactRefEx(), key: newKey });
            }
            else {
                this.list.splice(pos + 1, 0, { ref: new domui_1.ReactRefEx(), key: newKey });
            }
            this.setState({});
            this.onCellListChange?.();
            return newKey;
        }
        async deleteCell(cellKey) {
            let pos = this.list.findIndex(v => v.key == cellKey);
            try {
                this.list[pos].ref.current?.close();
            }
            catch (e) { }
            ;
            if (pos >= 0) {
                this.list.splice(pos, 1);
                this.setState({});
            }
            this.onCellListChange?.();
        }
        getCellList() {
            return this.list;
        }
        async runCell(cellKey) {
            let cell = this.list.find(v => v.key == cellKey);
            (0, base_1.assert)(cell != undefined);
            cell.ref.current.runCode();
        }
        async setCurrentEditing(cellKey) {
            let cell2 = this.list.find(v => v.key == cellKey);
            if (cell2 != undefined && cell2.ref.current != undefined) {
                await cell2.ref.current.setAsEditTarget();
            }
        }
        async setCellInput(cellKey, input) {
            let cell = this.list.find(v => v.key == cellKey);
            (0, base_1.assert)(cell != undefined);
            cell.ref.current.setCellInput(input);
        }
        clearConsoleOutput(key) {
            delete this.consoleOutput[key];
            this.forceUpdate();
        }
        async resetState() {
            this.lastRunCellKey = '';
            for (let t1 of [...this.getCellList()].reverse()) {
                await this.deleteCell(t1.key);
            }
            this.setState({});
        }
        async scrollToCell(cellIndex) {
            //To prevent user agent scroll handler overwrite the scrollTo position.
            await new Promise(requestAnimationFrame);
            let v = this.list.at(cellIndex);
            let cellDiv = v.ref.current?.getContainerDiv();
            let listDiv = this.rref.container.current;
            if (cellDiv != null && listDiv != null) {
                if (cellDiv.offsetTop + 300 > listDiv.scrollTop + listDiv.clientHeight && listDiv.clientHeight > 300) {
                    listDiv.scrollTo({ behavior: 'smooth', top: cellDiv.offsetTop + 300 - listDiv.clientHeight });
                }
                else if (cellDiv.offsetTop + cellDiv.offsetHeight < listDiv.scrollTop) {
                    await new Promise(requestAnimationFrame);
                    listDiv.scrollTo({ behavior: 'smooth', top: cellDiv.offsetTop + cellDiv.offsetHeight });
                }
            }
        }
        renderCodeCell(v, index, cellCssStyle) {
            return React.createElement(CodeCell, { ref: v.ref, key: v.key, codeContext: this.codeContext, customBtns: [
                    { label: 'New', cb: () => this.newCell(v.key) },
                    { label: 'Del', cb: () => this.deleteCell(v.key) }
                ], onClearOutputs: () => this.clearConsoleOutput(v.key), onRun: async () => {
                    this.onRun?.(v.key);
                    this.lastRunCellKey = v.key;
                    if (v.key == this.list.at(-1)?.key) {
                        await this.newCell(v.key);
                        let ccelem = this.list.at(-1);
                        let cc = await ccelem.ref.waitValid();
                        await cc.setAsEditTarget();
                    }
                }, onFocusChange: (focusin) => {
                    this.onCellFocusChange?.({ cellKey: v.key, focusIn: focusin });
                    if (focusin) {
                        this.setState({ lastFocusCellKey: v.key });
                        this.scrollToCell(index);
                    }
                }, onPreviousCell: async () => {
                    let cc = this.list.at(index - 1);
                    if (cc != undefined) {
                        await cc.ref.current?.setAsEditTarget();
                    }
                }, onNextCell: async () => {
                    let cc = this.list.at(index + 1);
                    if (cc != undefined) {
                        await cc.ref.current?.setAsEditTarget();
                    }
                }, divStyle: cellCssStyle, ...this.cellProps });
        }
        jsx(props, state, context) {
            if (!this.initialized.done) {
                return null;
            }
            return (this.codeContext != null && this.error == null) ?
                React.createElement("div", { style: { width: '100%', height: '100%', overflow: 'auto', position: 'relative' }, ref: this.rref.container },
                    (0, jsutils2_1.FlattenArraySync)(this.list.map((v, index) => {
                        let cellCssStyle = {};
                        if (this.lastFocusCellKey === v.key) {
                            cellCssStyle.zIndex = 100;
                        }
                        let r = [this.renderCodeCell(v, index, cellCssStyle)];
                        if (v.key in this.consoleOutput) {
                            r.push(React.createElement("div", { style: { wordBreak: 'break-all' }, dangerouslySetInnerHTML: { __html: (0, utils_1.text2html)(this.consoleOutput[v.key].content) } }));
                        }
                        return r;
                    })),
                    React.createElement("div", { style: { minHeight: '300px' } })) :
                React.createElement("div", { style: { width: '100%', overflow: 'auto', position: 'relative' }, ref: this.rref.container },
                    React.createElement("pre", null, this.error),
                    React.createElement("a", { href: "javascript:;", onClick: () => this.resetState() }, "Reset"));
        }
        saveTo() {
            let cellData = CodeContext_1.newCodeCellListData.get()();
            cellData.cellList = this.list.map((cell, index) => ({
                cellInput: cell.ref.current.getCellInput(),
                cellOutput: (0, Inspector_1.toSerializableObject)(cell.ref.current.getCellOutput(), {}),
                key: cell.key
            }));
            cellData.consoleOutput = this.consoleOutput;
            return cellData.saveTo();
        }
        async loadFrom(data) {
            await this.initialized.get();
            try {
                let cellData = CodeContext_1.newCodeCellListData.get()();
                cellData.loadFrom(data);
                while (this.getCellList().length < cellData.cellList.length) {
                    await this.newCell();
                }
                let consoleOutput = {};
                for (let k1 in cellData.consoleOutput) {
                    let index = cellData.cellList.findIndex(v => v.key === k1);
                    if (index >= 0) {
                        consoleOutput[this.list[index].key] = cellData.consoleOutput[k1];
                    }
                }
                let cellList = this.getCellList();
                for (let t1 = 0; t1 < cellData.cellList.length; t1++) {
                    let cell = await cellList[t1].ref.waitValid();
                    let val = cellData.cellList[t1];
                    cell.setCellInput(val.cellInput);
                    cell.setCellOutput((0, Inspector_1.fromSerializableObject)(val.cellOutput[0], { fetcher: await (0, Inspector_1.ensureJavascriptInspectorForCodeContextInstalled)(this.codeContext), accessPath: [val.cellOutput[1] ?? ''] }), val.cellOutput[1]);
                }
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
