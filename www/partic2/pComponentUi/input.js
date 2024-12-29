define(["require", "exports", "partic2/jsutils1/base", "partic2/pxseedMedia1/index1", "./domui", "preact", "./texteditor"], function (require, exports, base_1, index1_1, domui_1, React, texteditor_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.JsonForm = void 0;
    class JsonForm extends domui_1.ReactEventTarget {
        constructor(props, ctx) {
            super(props, ctx);
            this._inputCollector = new domui_1.ReactInputValueCollection().forwardChangeEvent(this.eventTarget);
            this.doPushElement = () => {
                this.setState({ elemCount: (this.state.elemCount ?? 0) + 1 });
                this.dispatchEvent(new Event('change'));
            };
            this.doSliceElement = (delIdx) => {
                let v = this.value;
                v.splice(delIdx, 1);
                this.value = v;
                this.setState({ elemCount: v.length });
                this.dispatchEvent(new Event('change'));
            };
        }
        _renderInput(name, type) {
            let jsx2 = [];
            if (this.props.type.type === 'object' && type.type !== 'button') {
                jsx2.push(React.createElement("div", null, name));
            }
            switch (type.type) {
                case 'number':
                    jsx2.push(React.createElement("input", { type: "number", style: { flexGrow: 1 }, ref: this._inputCollector.getRefForInput(name) }));
                    break;
                case 'boolean':
                    jsx2.push(React.createElement(domui_1.ValueCheckBox, { ref: this._inputCollector.getRefForInput(name) }));
                    break;
                case 'string':
                    jsx2.push(React.createElement(texteditor_1.PlainTextEditorInput, { ref: this._inputCollector.getRefForInput(name), divStyle: { flexGrow: 1 }, divClass: [domui_1.css.simpleCard] }));
                    break;
                case 'enum':
                    jsx2.push(React.createElement("select", { style: { flexGrow: 1 }, ref: this._inputCollector.getRefForInput(name) }, type.options?.map(opt => React.createElement("option", { value: opt.value }, opt.text))));
                    break;
                case 'enumSet':
                    jsx2.push(React.createElement("select", { style: { flexGrow: 1 }, multiple: true, ref: this._inputCollector.getRefForInput(name) }, type.options?.map(opt => React.createElement("option", { value: opt.value }, opt.text))));
                    break;
                case 'array':
                    jsx2.push(React.createElement(JsonForm, { type: type, divStyle: { flexGrow: '1' }, ref: this._inputCollector.getRefForInput(name) }));
                    break;
                case 'object':
                    jsx2.push(React.createElement(JsonForm, { type: type, divStyle: { flexGrow: '1' }, ref: this._inputCollector.getRefForInput(name) }));
                    break;
                case 'button':
                    if (type.subbtn == undefined) {
                        jsx2.push(React.createElement("input", { type: "button", value: name, onClick: () => type.onClick?.(this.value), style: { flexGrow: 1 } }));
                    }
                    else {
                        jsx2.push(React.createElement("div", { className: domui_1.css.flexRow, style: { alignItems: 'center', flexGrow: '1' } }, type.subbtn.map(btn => React.createElement("input", { type: "button", value: btn, onClick: () => type.onClick?.(this.value, btn), style: { flexGrow: 1 } }))));
                    }
                    break;
            }
            return React.createElement("div", { style: { flexGrow: '1', alignItems: 'left' }, className: domui_1.css.flexColumn }, jsx2);
        }
        render(props, state, context) {
            let type2 = this.props.type;
            if (type2.type === 'array') {
                return React.createElement("div", { className: [domui_1.css.simpleCard, domui_1.css.flexColumn, ...(this.props.divClass ?? [])].join(' '), style: { ...this.props.divStyle } }, [
                    ...(Array.from(base_1.ArrayWrap2.IntSequence(0, this.state.elemCount ?? 0))).map((idx) => React.createElement("div", { className: [domui_1.css.flexRow].join(' '), style: { alignItems: 'center', flexGrow: '1' } },
                        this._renderInput(idx.toString(), type2.element),
                        React.createElement("img", { src: (0, index1_1.getIconUrl)('x.svg'), onClick: () => this.doSliceElement(idx) }))),
                    React.createElement("div", { style: { textAlign: 'center', height: '16px', backgroundColor: '#ddd' }, onClick: this.doPushElement },
                        React.createElement("img", { src: (0, index1_1.getIconUrl)('plus.svg'), height: "16" }))
                ]);
            }
            else if (type2.type === 'object') {
                return React.createElement("div", { className: [domui_1.css.simpleCard, domui_1.css.flexColumn, ...(this.props.divClass ?? [])].join(' '), style: { ...this.props.divStyle } }, type2.fields.map((val) => this._renderInput(val[0], val[1])));
            }
        }
        get value() {
            if (this.props.type.type === 'array') {
                let v = this._inputCollector.getValue();
                let r = [];
                for (let t1 of base_1.ArrayWrap2.IntSequence(0, this.state.elemCount ?? 0)) {
                    r.push(v[t1.toString()]);
                }
                return r;
            }
            else if (this.props.type.type === 'object') {
                return this._inputCollector.getValue();
            }
        }
        set value(v) {
            if (this.props.type.type === 'array') {
                let v2 = v;
                let r = {};
                if (v2 != undefined) {
                    for (let t1 = 0; t1 < v2.length; t1++) {
                        r[t1.toString()] = v2[t1];
                    }
                    this.setState({ elemCount: v2.length }, () => {
                        this._inputCollector.setValue(r);
                    });
                }
            }
            else if (this.props.type.type === 'object') {
                if (v != undefined) {
                    this.forceUpdate(() => {
                        this._inputCollector.setValue(v);
                    });
                }
            }
        }
    }
    exports.JsonForm = JsonForm;
});
//# sourceMappingURL=input.js.map