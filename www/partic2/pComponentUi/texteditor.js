define(["require", "exports", "partic2/jsutils1/base", "preact", "./utils", "./domui"], function (require, exports, base_1, React, utils_1, domui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PlainTextEditorInput = exports.TextEditor = void 0;
    class TextEditor extends domui_1.ReactEventTarget {
        constructor() {
            super(...arguments);
            this.rref = { div1: new domui_1.ReactRefEx() };
        }
        onInputHandler(ev) {
            let ch = ev.data;
            if (ev.inputType == 'insertParagraph' || (ev.inputType == 'insertText' && ch == null)) {
                ch = '\n';
            }
            this.props.onInput?.(this, { char: ch, text: ev.dataTransfer?.getData('text/plain') ?? null, type: ev.inputType });
        }
        onPasteHandler(text) {
            this.insertText(text);
            this.rref.div1.current.addEventListener('click', () => { });
        }
        render(props, state, context) {
            return React.createElement("div", { contentEditable: true, ref: this.rref.div1, onInput: (ev) => this.onInputHandler(ev), style: { wordBreak: 'break-all', overflowWrap: 'word-break', ...this.props.divStyle }, className: (this.props.divClass ?? []).join(' '), onPaste: (ev) => { this.onPasteHandler(ev.clipboardData.getData('text/plain')); ev.preventDefault(); }, onBlur: (ev) => this.onBlurHandler(ev), onFocus: (ev) => this.onFocusHandler(ev), ...this.props.divAttr }, " ");
        }
        //insertText,deleteText will change Selection, but It's not guaranteed in future.
        insertText(text) {
            if (this.savedSelection != undefined) {
                window.getSelection()?.setBaseAndExtent(this.savedSelection.anchorNode, this.savedSelection.anchorOffset, this.savedSelection.focusNode, this.savedSelection.focusOffset);
            }
            this.savedSelection = undefined;
            //replace it?
            document.execCommand('insertText', false, text);
        }
        deleteText(count) {
            if (this.savedSelection != undefined) {
                window.getSelection()?.setBaseAndExtent(this.savedSelection.anchorNode, this.savedSelection.anchorOffset, this.savedSelection.focusNode, this.savedSelection.focusOffset);
            }
            this.savedSelection = undefined;
            for (let t1 = 0; t1 < count; t1++) {
                document.execCommand('delete');
            }
        }
        onBlurHandler(ev) {
            //save selection for execCommand
            let sel = window.getSelection();
            if (sel != null) {
                this.savedSelection = (0, base_1.partial)(sel, ['anchorNode', 'anchorOffset', 'focusNode', 'focusOffset']);
            }
            this.props.divAttr?.onBlur?.bind(ev.currentTarget)?.(ev.currentTarget);
            this.props?.onBlur?.(this);
        }
        onFocusHandler(ev) {
            this.savedSelection = undefined;
            this.props.divAttr?.onFocus?.bind(ev.currentTarget)?.(ev.currentTarget);
            this.props.onFocus?.(this);
        }
        getTextCaretOffset() {
            let exp1 = this.getCaretPart('backward');
            let caret = (0, utils_1.docNode2text)(exp1.cloneContents()).concat().length;
            return caret;
        }
        setTextCaretOffset(offset) {
            let sel = window.getSelection();
            if (sel == null)
                return;
            if (typeof offset === 'number') {
                let pos = this.positionFromTextOffset(offset);
                sel.setPosition(pos.node, pos.offset);
            }
            else if (offset == 'start') {
                let rng1 = new Range();
                rng1.selectNodeContents(this.rref.div1.current);
                sel.setPosition(rng1.startContainer, rng1.startOffset);
            }
            else if (offset == 'end') {
                let rng1 = new Range();
                rng1.selectNodeContents(this.rref.div1.current);
                sel.setPosition(rng1.endContainer, rng1.endOffset);
            }
        }
        positionFromTextOffset(textOffset) {
            return (0, utils_1.docNodePositionFromTextOffset)(this.rref.div1.current, textOffset);
        }
        getHtml() {
            return this.rref.div1.current?.innerHTML;
        }
        setHtml(html) {
            if (this.rref.div1.current) {
                this.rref.div1.current.innerHTML = html;
            }
        }
        getPlainText() {
            if (this.rref.div1.current == null)
                return '';
            return (0, utils_1.docNode2text)(this.rref.div1.current).concat();
        }
        setPlainText(text) {
            this.setHtml((0, utils_1.text2html)(text));
        }
        getCaretPart(direction) {
            let sel;
            if (this.savedSelection != undefined) {
                sel = this.savedSelection;
            }
            else {
                sel = window.getSelection();
            }
            let rng1 = new Range();
            rng1.selectNodeContents(this.rref.div1.current);
            if (direction === 'forward') {
                rng1.setStart(sel.focusNode, sel.focusOffset);
            }
            else {
                rng1.setEnd(sel.focusNode, sel.focusOffset);
            }
            return rng1;
        }
        scrollToBottom() {
            this.rref.div1.current.scrollTop = this.rref.div1.current.scrollHeight;
        }
    }
    exports.TextEditor = TextEditor;
    class PlainTextEditorInput extends TextEditor {
        get value() {
            return this.getPlainText();
        }
        set value(v) {
            this.setPlainText(v);
        }
        onBlurHandler(ev) {
            super.onBlurHandler(ev);
            this.dispatchEvent(new Event('change'));
        }
    }
    exports.PlainTextEditorInput = PlainTextEditorInput;
});
//# sourceMappingURL=texteditor.js.map