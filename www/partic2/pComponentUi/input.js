define(["require", "exports", "./domui", "preact", "./window"], function (require, exports, domui_1, React, window_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleReactForm1 = exports.ReactInputValueCollection = exports.ValueCheckBox = void 0;
    exports.promptWithForm = promptWithForm;
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
    async function promptWithForm(simpleReactFormVNode, options) {
        let ref2 = new domui_1.ReactRefEx();
        if (simpleReactFormVNode.ref != undefined)
            ref2.forward([simpleReactFormVNode.ref]);
        simpleReactFormVNode.ref = ref2;
        let dlg = await (0, window_1.prompt)(simpleReactFormVNode, options?.title ?? 'prompt');
        if (options?.initialValue != undefined) {
            (await ref2.waitValid()).value = options.initialValue;
        }
        if (await dlg.response.get() == 'ok') {
            let resultValue = (await ref2.waitValid()).value;
            dlg.close();
            return resultValue;
        }
        dlg.close();
        return null;
    }
});
//# sourceMappingURL=input.js.map