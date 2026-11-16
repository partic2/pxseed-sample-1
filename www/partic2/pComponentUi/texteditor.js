define("partic2/pComponentUi/texteditor", ["require", "exports", "partic2/jsutils1/base", "preact", "./utils", "./domui", "./input"], function (require, exports, base_1, React, utils_1, domui_1, input_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PlainTextEditorInput = exports.TextEditor = void 0;
    const UNDO_LIMIT = 30;
    const MERGE_MS = 800;
    class TextEditor extends domui_1.JsxClassComponent {
        constructor() {
            super(...arguments);
            this.rref = { div1: new domui_1.ReactRefEx() };
            this.undoHistory = [];
            this.undoHistoryCurrent = -1;
            this.compositing = false;
        }
        normalizeInputType(inputType) {
            switch (inputType) {
                case 'insertText':
                    return { kind: 'insert', mergeable: true };
                case 'insertCompositionText':
                case 'insertFromComposition':
                    return { kind: 'composition', mergeable: false };
                case 'insertParagraph':
                case 'insertLineBreak':
                    return { kind: 'insert', mergeable: false };
                case 'deleteContentBackward':
                    return { kind: 'deleteBackward', mergeable: true };
                case 'deleteContentForward':
                    return { kind: 'deleteForward', mergeable: true };
                case 'deleteByCut':
                    return { kind: 'cut', mergeable: false };
                case 'insertFromPaste':
                    return { kind: 'paste', mergeable: false };
                default:
                    return { kind: 'other', mergeable: false };
            }
        }
        commitHistory(kind, mergeable) {
            const text = this.getPlainText();
            const caret = this.getTextCaretOffset();
            const now = Date.now();
            const top = this.undoHistory[this.undoHistoryCurrent];
            if (top && top.text === text) {
                return;
            }
            const canMerge = mergeable &&
                top !== undefined &&
                top.kind === kind &&
                now - top.time <= MERGE_MS &&
                this.undoHistoryCurrent === this.undoHistory.length - 1;
            if (canMerge) {
                top.text = text;
                top.caret = caret;
                top.time = now;
                return;
            }
            if (this.undoHistoryCurrent < this.undoHistory.length - 1) {
                this.undoHistory.length = this.undoHistoryCurrent + 1;
            }
            this.undoHistory.push({ text, caret, kind, time: now });
            while (this.undoHistory.length > UNDO_LIMIT) {
                this.undoHistory.shift();
            }
            this.undoHistoryCurrent = this.undoHistory.length - 1;
        }
        textUndo() {
            if (this.undoHistoryCurrent <= 0)
                return;
            this.undoHistoryCurrent--;
            const entry = this.undoHistory[this.undoHistoryCurrent];
            this.applyHistoryEntry(entry);
        }
        textRedo() {
            if (this.undoHistoryCurrent >= this.undoHistory.length - 1)
                return;
            this.undoHistoryCurrent++;
            const entry = this.undoHistory[this.undoHistoryCurrent];
            this.applyHistoryEntry(entry);
        }
        applyHistoryEntry(entry) {
            this.setPlainText(entry.text);
            this.setTextCaretOffset(entry.caret);
        }
        canUndo() { return this.undoHistoryCurrent > 0; }
        canRedo() { return this.undoHistoryCurrent < this.undoHistory.length - 1; }
        markHistory() { this.commitHistory('other', false); }
        onInputHandler(ev) {
            this.divAttr?.onInput?.(ev);
            if (ev.defaultPrevented)
                return;
            if (this.compositing)
                return;
            let ch = ev.data;
            if (ev.inputType == 'insertParagraph' || (ev.inputType == 'insertText' && ch == null)) {
                ch = '\n';
            }
            const { kind, mergeable } = this.normalizeInputType(ev.inputType);
            this.commitHistory(kind, mergeable);
            this.onInput?.(this, {
                char: ch,
                text: ev.dataTransfer?.getData('text/plain') ?? null,
                type: ev.inputType
            });
        }
        onCompositionStart(ev) {
            this.divAttr?.onCompositionStart?.(ev);
            if (ev.defaultPrevented)
                return;
            this.compositing = true;
        }
        onCompositionEnd(ev) {
            this.divAttr?.onCompositionEnd?.(ev);
            if (ev.defaultPrevented)
                return;
            this.compositing = false;
            this.commitHistory('composition', false);
            this.onInput?.(this, { char: ev.data, text: ev.data, type: 'insertText' });
        }
        onPasteHandler(ev) {
            this.divAttr?.onPaste?.(ev);
            if (ev.defaultPrevented)
                return;
            const text = ev.clipboardData.getData('text/plain');
            this.commitHistory('paste', false);
            this.insertText(text);
            this.commitHistory('paste', false);
            this.onInput?.(this, { char: null, text, type: 'paste' });
            ev.preventDefault();
        }
        onKeyDownHandler(ev) {
            if (this.divAttr?.onKeyDown != undefined) {
                this.divAttr.onKeyDown(ev);
            }
            if (ev.defaultPrevented) {
                return;
            }
            if ((ev.ctrlKey || ev.metaKey) && ev.code == 'KeyZ') {
                ev.preventDefault();
                if (ev.shiftKey) {
                    this.textRedo();
                }
                else {
                    this.textUndo();
                }
                return;
            }
        }
        async componentDidMount() {
            let div1 = await this.rref.div1.waitValid();
            div1.addEventListener('compositionstart', (ev) => this.onCompositionStart(ev));
            div1.addEventListener('compositionend', (ev) => this.onCompositionEnd(ev));
            div1.addEventListener('compositionupdate', (ev) => this.divAttr?.onCompositionUpdate?.(ev));
            this.commitHistory('other', false);
        }
        jsx(props, state, context) {
            return React.createElement("div", { contentEditable: true, ref: this.rref.div1, style: { wordBreak: 'break-all', overflowWrap: 'word-break', whiteSpace: 'pre-wrap', position: 'relative', ...this.divStyle }, className: (this.divClass ?? []).join(' '), ...this.divAttr, onPaste: (ev) => { this.onPasteHandler(ev); }, onInput: (ev) => this.onInputHandler(ev), onBlur: (ev) => this.onBlurHandler(ev), onFocus: (ev) => this.onFocusHandler(ev), onKeyDown: (ev) => this.onKeyDownHandler(ev) });
        }
        insertText(text) {
            let { anchor, focus } = this.getTextCaretSelectedRange();
            let fullText = this.getPlainText();
            let min1 = Math.min(anchor, focus);
            let max1 = Math.max(anchor, focus);
            this.setPlainText(fullText.substring(0, min1) + text + fullText.substring(max1));
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
            this.divAttr?.onBlur?.bind(ev.currentTarget)?.(ev.currentTarget);
            this?.onBlur?.(this);
        }
        onFocusHandler(ev) {
            this.divAttr?.onFocus?.bind(ev.currentTarget)?.(ev.currentTarget);
            this.onFocus?.(this);
        }
        saveSelection() {
            let sel = window.getSelection();
            if (sel != null && this.rref.div1.current != null && this.rref.div1.current.contains(document.activeElement) &&
                this.rref.div1.current.contains(sel.anchorNode) && this.rref.div1.current.contains(sel.focusNode)) {
                this.savedSelection = (0, base_1.objectPickField)(sel, ['anchorNode', 'anchorOffset', 'focusNode', 'focusOffset']);
            }
            else {
                this.savedSelection = undefined;
            }
        }
        restoreSelection() {
            let sel = window.getSelection();
            if (sel != null && this.savedSelection != undefined && this.rref.div1.current != null && this.rref.div1.current.contains(document.activeElement)) {
                sel.setPosition(this.savedSelection.anchorNode, this.savedSelection.anchorOffset);
                sel.collapse(this.savedSelection.focusNode, this.savedSelection.focusOffset);
            }
            this.savedSelection = undefined;
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
        setPlainText(text, opt) {
            if (text == '') {
                //firefox prefer this.
                this.setHtml('');
            }
            else {
                this.setHtml((0, utils_1.text2html)(text));
            }
            if (opt?.record) {
                this.commitHistory('other', false);
            }
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
        getCoordinateByTextOffset(textOffset) {
            let textParts = (0, utils_1.docNode2text)(this.rref.div1.current);
            let pos1 = textParts.nodeFromTextOffset(textOffset);
            if (pos1.node != null) {
                let parentNode = pos1.node.parentNode;
                if (parentNode == null) {
                    return null;
                }
                if (pos1.node instanceof Text) {
                    let fulltext = pos1.node.data;
                    this.saveSelection();
                    let textPart1 = document.createTextNode(fulltext.substring(0, pos1.offset));
                    parentNode.insertBefore(textPart1, pos1.node);
                    let markSpan = document.createElement('span');
                    parentNode.insertBefore(markSpan, pos1.node);
                    pos1.node.data = fulltext.substring(pos1.offset);
                    let result = { top: markSpan.offsetTop, bottom: markSpan.offsetTop + markSpan.offsetHeight, left: markSpan.offsetLeft };
                    parentNode.removeChild(markSpan);
                    parentNode.removeChild(textPart1);
                    pos1.node.data = fulltext;
                    this.restoreSelection();
                    return result;
                }
                else if (pos1.node instanceof HTMLElement) {
                    return { top: pos1.node.offsetTop, bottom: pos1.node.offsetTop + pos1.node.offsetHeight, left: pos1.node.offsetLeft };
                }
            }
            return null;
        }
        setTextCaretOffset(offset) {
            let sel = window.getSelection();
            let textParts = (0, utils_1.docNode2text)(this.rref.div1.current);
            if (sel == null)
                return;
            if (typeof offset === 'number') {
                let pos = textParts.nodeFromTextOffset(offset);
                if (pos.node != null) {
                    sel.setPosition(pos.node, pos.offset);
                }
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
        isEditing() {
            return document.activeElement != null &&
                this.rref.div1.current != null &&
                ((document.activeElement === this.rref.div1.current) ||
                    ((document.activeElement.compareDocumentPosition(this.rref.div1.current) & Node.DOCUMENT_POSITION_CONTAINS) != 0));
        }
    }
    exports.TextEditor = TextEditor;
    class PlainTextEditorInput extends input_1.ReactEventTarget {
        constructor() {
            super(...arguments);
            this.ref = new domui_1.ReactRefEx();
            this._savedState = {};
        }
        get value() {
            return this.ref.current?.getPlainText() ?? '';
        }
        set value(v) {
            this.ref.current?.setPlainText(v);
        }
        _checkValueProp() {
            if (this.props.value != undefined && this.props.value != this._savedState.value) {
                this._savedState.value = this.props.value;
                if (this.props.value != this.value) {
                    this.value = this.props.value;
                }
            }
        }
        render() {
            this._checkValueProp();
            return React.createElement(TextEditor, { onInput: () => this.dispatchEvent(new Event('change')), ...this.props, ref: this.ref });
        }
    }
    exports.PlainTextEditorInput = PlainTextEditorInput;
});
