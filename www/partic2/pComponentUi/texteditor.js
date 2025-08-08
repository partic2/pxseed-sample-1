define(["require", "exports", "partic2/jsutils1/base", "preact", "./utils", "./domui"], function (require, exports, base_1, React, utils_1, domui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PlainTextEditorInput = exports.TextEditor = void 0;
    class TextEditor extends domui_1.ReactEventTarget {
        constructor() {
            super(...arguments);
            this.rref = { div1: new domui_1.ReactRefEx() };
            this.undoHistory = [];
            this.undoHistoryCurrent = -1;
        }
        pushHistory() {
            let currText = this.getPlainText();
            if (currText == this.undoHistory.at(this.undoHistoryCurrent))
                return;
            if (this.undoHistoryCurrent >= this.undoHistory.length - 1) {
                this.undoHistory.push(currText);
                if (this.undoHistory.length > 10) {
                    this.undoHistory.unshift();
                }
                this.undoHistoryCurrent = this.undoHistory.length - 1;
            }
            else {
                this.undoHistoryCurrent++;
                this.undoHistory[this.undoHistoryCurrent] = currText;
            }
        }
        textUndo() {
            if (this.undoHistoryCurrent < 0) {
                return;
            }
            this.pushHistory();
            this.undoHistoryCurrent--;
            let last = this.undoHistory[this.undoHistoryCurrent];
            this.undoHistoryCurrent--;
            this.setPlainText(last);
            this.setTextCaretOffset('end');
        }
        textRedo() {
            let currText = this.getPlainText();
            for (; this.undoHistoryCurrent + 1 < this.undoHistory.length; this.undoHistoryCurrent++) {
                let last = this.undoHistory[this.undoHistoryCurrent + 1];
                if (currText != last) {
                    this.setPlainText(last);
                    break;
                }
            }
        }
        onInputHandler(ev) {
            let ch = ev.data;
            if (ev.inputType == 'insertParagraph' || (ev.inputType == 'insertText' && ch == null)) {
                ch = '\n';
            }
            if (/[^0-9a-zA-Z]/.test(ch ?? '')) {
                this.pushHistory();
            }
            this.props.onInput?.(this, { char: ch, text: ev.dataTransfer?.getData('text/plain') ?? null, type: ev.inputType });
        }
        onPasteHandler(text) {
            this.pushHistory();
            this.insertText(text);
            this.rref.div1.current.addEventListener('click', () => { });
        }
        onKeyDownHandler(ev) {
            if (this.props.divAttr?.onKeyDown != undefined) {
                this.props.divAttr.onKeyDown(ev);
            }
            if (ev.defaultPrevented) {
                return;
            }
            if (ev.key.toLowerCase() == 'z' && ev.ctrlKey) {
                ev.preventDefault();
                if (ev.shiftKey) {
                    this.textRedo();
                }
                else {
                    this.textUndo();
                }
            }
        }
        render(props, state, context) {
            return React.createElement("div", { contentEditable: true, ref: this.rref.div1, onInput: (ev) => this.onInputHandler(ev), style: { wordBreak: 'break-all', overflowWrap: 'word-break', ...this.props.divStyle }, className: (this.props.divClass ?? []).join(' '), onPaste: (ev) => { this.onPasteHandler(ev.clipboardData.getData('text/plain')); ev.preventDefault(); }, onBlur: (ev) => this.onBlurHandler(ev), onFocus: (ev) => this.onFocusHandler(ev), ...this.props.divAttr, onKeyDown: (ev) => this.onKeyDownHandler(ev) }, " ");
        }
        insertText(text) {
            let { anchor, focus } = this.getTextCaretSelectedRange();
            let fullText = this.getPlainText();
            let min1 = Math.min(anchor, focus);
            let max1 = Math.max(anchor, focus);
            this.rref.div1.current.innerHTML = (0, utils_1.text2html)(fullText.substring(0, min1) + text + fullText.substring(max1));
            this.setTextCaretOffset(min1 + text.length);
        }
        deleteText(count) {
            let offset = this.getTextCaretOffset();
            let fullText = this.getPlainText();
            let newText = fullText.substring(0, Math.max(0, offset - count)) + fullText.substring(offset);
            this.setPlainText(newText);
            this.setTextCaretOffset(Math.max(0, offset - count));
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
        getTextCaretOffset() {
            let sel = document.getSelection();
            let textParts = (0, utils_1.docNode2text)(this.rref.div1.current);
            if (sel?.focusNode == null) {
                return 0;
            }
            return textParts.textOffsetFromNode(sel.focusNode, sel.focusOffset);
        }
        getTextCaretSelectedRange() {
            let sel = document.getSelection();
            let textParts = (0, utils_1.docNode2text)(this.rref.div1.current);
            if (sel?.focusNode == null) {
                return { anchor: 0, focus: 0 };
            }
            let focusPos = textParts.textOffsetFromNode(sel.focusNode, sel.focusOffset);
            let anchorPos = textParts.textOffsetFromNode(sel.anchorNode, sel.anchorOffset);
            return { anchor: anchorPos, focus: focusPos };
        }
        setTextCaretOffset(offset) {
            let sel = window.getSelection();
            let textParts = (0, utils_1.docNode2text)(this.rref.div1.current);
            if (sel == null)
                return;
            if (typeof offset === 'number') {
                let pos = textParts.nodeFromTextOffset(offset);
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
        setTextCaretSelectedRange(anchorPos, focusPos) {
            let sel = window.getSelection();
            let textParts = (0, utils_1.docNode2text)(this.rref.div1.current);
            if (sel == null)
                return;
            let anchor = textParts.nodeFromTextOffset(anchorPos);
            let focus = textParts.nodeFromTextOffset(focusPos);
            sel.setPosition(anchor.node, anchor.offset);
            if (focus.node != null) {
                sel.extend(focus.node, focus.offset);
            }
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