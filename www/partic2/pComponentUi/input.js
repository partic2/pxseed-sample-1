define(["require", "exports", "partic2/pxseedMedia1/index1", "./domui", "preact", "./texteditor"], function (require, exports, index1_1, domui_1, React, texteditor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JsonForm = exports.InputArray = exports.SimpleReactForm1 = exports.ReactInputValueCollection = exports.ValueCheckBox = void 0;
    class ValueCheckBox extends domui_1.ReactEventTarget {
        constructor() {
            super(...arguments);
            this.cbref = React.createRef();
        }
        componentDidMount() {
            if (this.props.value != undefined) {
                this.cbref.current.checked = this.props.value;
            }
        }
        render(props, state, context) {
            return React.createElement("input", { ref: this.cbref, style: this.props.style, onChange: () => this.eventTarget.dispatchEvent(new Event('change')), type: "checkbox", className: this.props.className });
        }
        get value() {
            return this.cbref.current?.checked;
        }
        set value(v) {
            if (this.cbref.current != null) {
                this.cbref.current.checked = v;
            }
        }
    }
    exports.ValueCheckBox = ValueCheckBox;
    class ReactInputValueCollection extends EventTarget {
        constructor() {
            super(...arguments);
            this.inputRef = {};
            this._onInputValueChange = (ev) => {
                this.dispatchEvent(new Event('change'));
            };
        }
        getRefForInput(name) {
            if (name in this.inputRef) {
                return this.inputRef[name];
            }
            let rref = new domui_1.ReactRefEx();
            rref.watch((r, prev) => {
                if (prev != null) {
                    prev.removeEventListener('change', this._onInputValueChange);
                }
                if (r.get() != null) {
                    r.get().addEventListener('change', this._onInputValueChange);
                }
            });
            this.inputRef[name] = rref;
            return rref;
        }
        async waitRefValid() {
            await Promise.all(Object.values(this.inputRef).map(t1 => t1.waitValid));
            return this;
        }
        getValue() {
            let val = {};
            for (var name in this.inputRef) {
                let elem = this.inputRef[name].current;
                if (elem != undefined) {
                    val[name] = elem.value;
                }
            }
            return val;
        }
        setValue(val) {
            for (var name in this.inputRef) {
                let elem = this.inputRef[name].current;
                if (elem != undefined && val[name] !== undefined) {
                    elem.value = val[name];
                }
            }
        }
        forwardChangeEvent(eventTarget) {
            this.addEventListener('change', () => eventTarget.dispatchEvent(new Event('change')));
            return this;
        }
    }
    exports.ReactInputValueCollection = ReactInputValueCollection;
    class SimpleReactForm1 extends domui_1.ReactEventTarget {
        constructor(props, ctx) {
            super(props, ctx);
            this._onChangeListener = () => {
                this.props.onChange?.(this.value);
            };
            this.valueCollection = new ReactInputValueCollection().forwardChangeEvent(this.eventTarget);
            this.__cachedValue = {};
            this.__valueApplied = true;
            this.eventTarget.addEventListener('change', this._onChangeListener);
        }
        render(props, state, context) {
            //XXX: Is there any better place?
            if (this.props.value != undefined) {
                this.value = this.props.value;
            }
            return this.props.children?.(this);
        }
        getRefForInput(name) {
            return this.valueCollection.getRefForInput(name);
        }
        get value() {
            if (this.__valueApplied) {
                this.__cachedValue = { ...this.__cachedValue, ...this.valueCollection.getValue() };
            }
            return this.__cachedValue;
        }
        set value(val) {
            this.__cachedValue = { ...val };
            if (this.__valueApplied) {
                this.__valueApplied = false;
                (async () => {
                    await this.valueCollection.waitRefValid();
                    this.valueCollection.setValue(this.__cachedValue);
                    this.__valueApplied = true;
                })();
            }
        }
        addEventListener(type, cb) {
            this.eventTarget.addEventListener(type, cb);
        }
        removeEventListener(type, cb) {
            this.eventTarget.removeEventListener(type, cb);
        }
    }
    exports.SimpleReactForm1 = SimpleReactForm1;
    let InputInternalAttr = Symbol('InputInternalAttr');
    class InputArray extends domui_1.ReactEventTarget {
        constructor() {
            super(...arguments);
            this.valueCollection = new ReactInputValueCollection().forwardChangeEvent(this.eventTarget);
            this.doPushElement = () => {
                this.value = [...this.value, this.props.defaultValue ?? {}];
                this.dispatchEvent(new Event('change'));
            };
            this.doSliceElement = (delIdx) => {
                let v = this.value;
                v.splice(delIdx, 1);
                this.value = v;
                this.dispatchEvent(new Event('change'));
            };
            this.__cachedValue = [];
            this.__valueApplied = true;
        }
        renderElements(tpl) {
            let r = [];
            this.value.forEach((t2, t1) => {
                let t4 = tpl(this.valueCollection.getRefForInput('e' + t1));
                if (t2[t1] != null && typeof t2[t1] == 'object' && React.isValidElement(t4)) {
                    if (t2[t1][InputInternalAttr].arrayKey != undefined) {
                        t4.key = t2[t1][InputInternalAttr].arrayKey;
                    }
                    else {
                        t4.key = t2[t1][InputInternalAttr].arrayKey;
                    }
                }
                r.push(React.createElement("div", { className: [domui_1.css.flexRow].join(' '), style: { alignItems: 'center', flexGrow: '1' } },
                    t4,
                    React.createElement("img", { src: (0, index1_1.getIconUrl)('x.svg'), onClick: () => this.doSliceElement(t1) })));
            });
            return r;
        }
        render(props, state, context) {
            if (this.props.value != undefined) {
                this.value = this.props.value;
            }
            let elem = this.props.children;
            if (typeof this.props.children != 'function') {
                return this.props.children;
            }
            else {
                return React.createElement("div", { className: [domui_1.css.flexColumn, ...(this.props.divClass ?? [domui_1.css.simpleCard])].join(' '), style: { ...this.props.divStyle } }, [
                    ...this.renderElements(elem),
                    React.createElement("div", { style: { textAlign: 'center', height: '16px', backgroundColor: '#ddd' }, onClick: this.doPushElement },
                        React.createElement("img", { src: (0, index1_1.getIconUrl)('plus.svg'), height: "16" }))
                ]);
            }
        }
        get value() {
            if (this.__valueApplied) {
                let r1 = [];
                let t2 = this.valueCollection.getValue();
                for (let t1 = 0; t1 < this.__cachedValue.length; t1++) {
                    this.__cachedValue[t1] = t2['e' + t1];
                }
            }
            return this.__cachedValue;
        }
        set value(val) {
            this.__cachedValue = [...val];
            if (this.__valueApplied) {
                this.__valueApplied = false;
                this.forceUpdate(async () => {
                    await this.valueCollection.waitRefValid();
                    let v1 = {};
                    for (let t1 = 0; t1 < this.__cachedValue.length; t1++) {
                        v1['e' + t1] = this.__cachedValue[t1];
                    }
                    this.valueCollection.setValue(v1);
                    this.__valueApplied = true;
                });
            }
        }
        addEventListener(type, cb) {
            this.eventTarget.addEventListener(type, cb);
        }
        removeEventListener(type, cb) {
            this.eventTarget.removeEventListener(type, cb);
        }
    }
    exports.InputArray = InputArray;
    class JsonForm extends SimpleReactForm1 {
        constructor(props, ctx) {
            super(props, ctx);
        }
        _renderInput(ref, type, name) {
            let jsx2 = [];
            if (this.props.type.type === 'object' && type.type !== 'button' && type.type != 'boolean') {
                jsx2.push(React.createElement("div", null, name));
            }
            switch (type.type) {
                case 'number':
                    jsx2.push(React.createElement("input", { ref: ref, type: "number", style: { flexGrow: 1 } }));
                    break;
                case 'boolean':
                    jsx2.push(React.createElement("div", { className: domui_1.css.flexRow },
                        name,
                        ":",
                        React.createElement(ValueCheckBox, { ref: ref, style: { flexGrow: '1' } })));
                    break;
                case 'string':
                    jsx2.push(React.createElement(texteditor_1.PlainTextEditorInput, { ref: ref, divStyle: { flexGrow: 1 }, divClass: [domui_1.css.simpleCard] }));
                    break;
                case 'enum':
                    jsx2.push(React.createElement("select", { style: { flexGrow: 1 }, ref: ref }, type.options?.map(opt => React.createElement("option", { value: opt.value }, opt.text))));
                    break;
                case 'enumSet':
                    jsx2.push(React.createElement("select", { style: { flexGrow: 1 }, multiple: true, ref: ref }, type.options?.map(opt => React.createElement("option", { value: opt.value }, opt.text))));
                    break;
                case 'array':
                    jsx2.push(React.createElement(JsonForm, { ref: ref, type: type, divStyle: { flexGrow: '1' } }));
                    break;
                case 'object':
                    jsx2.push(React.createElement(JsonForm, { ref: ref, type: type, divStyle: { flexGrow: '1' } }));
                    break;
                case 'button':
                    if (type.subbtn == undefined) {
                        jsx2.push(React.createElement("input", { type: "button", value: name ?? 'null', onClick: () => type.onClick?.(this.value, ''), style: { flexGrow: 1 } }));
                    }
                    else {
                        jsx2.push(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center', flexGrow: '1' } }, type.subbtn.map(btn => React.createElement("input", { type: "button", value: btn, onClick: () => type.onClick?.(this.value, btn), style: { flexGrow: 1 } }))));
                    }
                    break;
            }
            return React.createElement("div", { style: { flexGrow: '1', alignItems: 'left' }, className: domui_1.css.flexColumn }, jsx2);
        }
        render(props, state, context) {
            super.render(props, state);
            let type2 = this.props.type;
            if (type2.type === 'array') {
                return React.createElement(InputArray, { divClass: this.props.divClass, divStyle: this.props.divStyle, ref: this.getRefForInput('root'), defaultValue: JsonForm.defaultValue[type2.element.type] }, (ref) => this._renderInput(ref, type2.element, null));
            }
            else if (type2.type === 'object') {
                return React.createElement(SimpleReactForm1, { ref: this.getRefForInput('root') }, (form) => React.createElement("div", { className: [domui_1.css.simpleCard, domui_1.css.flexColumn, ...(this.props.divClass ?? [])].join(' '), style: { ...this.props.divStyle } }, type2.fields.map((val) => this._renderInput(form.getRefForInput(val[0]), val[1], val[0]))));
            }
        }
        get value() {
            return super.value.root;
        }
        set value(v) {
            if (this.props.type.type === 'object') {
                for (let [k1, t1] of this.props.type.fields) {
                    if (v[k1] == undefined) {
                        v[k1] = JsonForm.defaultValue[t1.type];
                    }
                }
            }
            super.value = { root: v };
        }
    }
    exports.JsonForm = JsonForm;
    JsonForm.defaultValue = {
        number: 0,
        boolean: false,
        object: {},
        enum: '',
        button: '',
        enumSet: '',
        string: '',
        array: []
    };
});
//# sourceMappingURL=input.js.map