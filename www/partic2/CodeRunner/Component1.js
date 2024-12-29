define(["require", "exports", "preact", "./Inspector", "partic2/jsutils1/base"], function (require, exports, React, Inspector_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ObjectViewer = void 0;
    class ObjectViewer extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            if (this.props.object instanceof Inspector_1.UnidentifiedObject) {
                this.setState({ folded: true });
            }
            else {
                this.setState({ folded: false });
            }
        }
        async toggleFolding() {
            if (this.state.folded) {
                if (this.props.object instanceof Inspector_1.UnidentifiedObject) {
                    try {
                        let identified = await this.props.object.identify({ maxDepth: 1, maxKeyCount: this.props.object.keyCount + 1 });
                        this.setState({ folded: false, identified });
                    }
                    catch (e) {
                        this.setState({ folded: false, identified: [e.message, e.stack] });
                    }
                }
                this.setState({ folded: false });
            }
            else {
                this.setState({ folded: true });
            }
        }
        beforeRender() {
            if (this.props.object !== this.state.object) {
                let folded = false;
                if (this.props.object instanceof Inspector_1.UnidentifiedObject) {
                    folded = true;
                }
                this.setState({ identified: null, folded, object: this.props.object });
            }
        }
        render(props, state, context) {
            this.beforeRender();
            let robj = this.state.identified ?? this.props.object;
            let type1 = typeof (robj);
            let TypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Uint8Array())).constructor;
            if (type1 === 'string') {
                if (robj.indexOf('\n') >= 0) {
                    return React.createElement("div", null,
                        this.props.name,
                        ":",
                        React.createElement("pre", null, robj));
                }
                else {
                    return React.createElement("div", null,
                        this.props.name,
                        ":\"",
                        robj,
                        "\"");
                }
            }
            else if (type1 !== 'object') {
                return React.createElement("div", null,
                    this.props.name,
                    ":",
                    String(robj));
            }
            else if (robj === null) {
                return React.createElement("div", null,
                    this.props.name,
                    ":null");
            }
            else if (robj instanceof Array) {
                return React.createElement("div", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        " ",
                        this.props.name,
                        " (",
                        robj.length,
                        ")"),
                    React.createElement("br", null),
                    (!this.state.folded) ?
                        React.createElement("div", { style: { paddingLeft: '1em' } }, robj.map((v1, i1) => {
                            return React.createElement(ObjectViewer, { name: String(i1), object: v1, key: 'index' + i1 });
                        })) : null);
            }
            else if (robj instanceof Inspector_1.UnidentifiedObject) {
                return React.createElement("div", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        " ",
                        this.props.name,
                        " (",
                        robj.keyCount,
                        ")"));
            }
            else if (robj instanceof Inspector_1.MiscObject) {
                if (robj.type == 'function') {
                    return React.createElement("div", null,
                        this.props.name,
                        ": function ",
                        robj.functionName,
                        "()");
                }
                else if (robj.type == 'serializingError') {
                    return React.createElement("div", null,
                        this.props.name,
                        ": error ",
                        robj.errorMessage);
                }
            }
            else if (robj instanceof Date) {
                return React.createElement("div", null,
                    this.props.name,
                    ": Date:",
                    robj.toString(),
                    ")");
            }
            else if (robj instanceof TypedArray) {
                return React.createElement("div", null,
                    this.props.name,
                    ": ",
                    robj.constructor.name,
                    ":",
                    (0, base_1.BytesToHex)(new Uint8Array(robj.buffer, robj.bytesOffset, robj.length * robj.BYTES_PER_ELEMENT)));
            }
            else if (robj instanceof ArrayBuffer) {
                return React.createElement("div", null,
                    this.props.name,
                    ": ArrayBuffer:",
                    (0, base_1.BytesToHex)(new Uint8Array(robj)));
            }
            else {
                let keys = Object.keys(robj);
                return React.createElement("div", null,
                    React.createElement("a", { href: "javascript:;", onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        this.props.name,
                        " (",
                        keys.length,
                        ")"),
                    React.createElement("br", null),
                    (!this.state.folded) ?
                        React.createElement("div", { style: { paddingLeft: '1em' } }, keys.map((v1) => {
                            return React.createElement(ObjectViewer, { name: v1, object: robj[v1], key: 'index' + v1 });
                        })) : null);
            }
        }
    }
    exports.ObjectViewer = ObjectViewer;
});
//# sourceMappingURL=Component1.js.map