define("partic2/CodeRunner/Component1", ["require", "exports", "preact", "./Inspector", "partic2/jsutils1/base", "partic2/pComponentUi/utils", "partic2/jsutils1/webutils", "./jsutils2", "partic2/pComponentUi/domui"], function (require, exports, React, Inspector_1, base_1, utils_1, webutils_1, jsutils2_1, domui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SimpleLogViewer = exports.ImageViewer = exports.HtmlViewer = exports.ObjectViewer = exports.css1 = void 0;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.css1 = {
        propName: (0, base_1.GenerateRandomString)()
    };
    if (globalThis.document != undefined) {
        webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css1.propName, ['color:blue']);
    }
    class ObjectViewer extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.lastDisplayModel = null;
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
                        this.setState({ folded: false, displayModel: identified });
                    }
                    catch (e) {
                        this.setState({ folded: false, displayModel: [e.message, e.stack] });
                    }
                }
                this.setState({ folded: false });
            }
            else {
                this.setState({ folded: true });
            }
        }
        async onDisplayModelChanged() {
            try {
                let robj = this.state.displayModel;
                if (typeof robj === 'object' && robj != null && Inspector_1.magicPropertyName.customViewerFactoryProp in robj) {
                    await Inspector_1.UnidentifiedObject.identifyRecursive(robj, { maxDepth: 100000, maxKeyCount: 100000 });
                    let viewerPath = robj[Inspector_1.magicPropertyName.customViewerFactoryProp];
                    let mod = await new Promise((resolve_1, reject_1) => { require([viewerPath.module], resolve_1, reject_1); });
                    let viewerFactory = mod[viewerPath.name];
                    if (typeof viewerFactory === 'function') {
                        if ('render' in viewerFactory.prototype) {
                            this.setState({ viewer: viewerFactory });
                        }
                        else {
                            this.setState({ viewer: await viewerFactory(robj) });
                        }
                    }
                }
                else {
                    this.setState({ viewer: null });
                }
            }
            catch (err) {
                console.warn(__name__, ':', err.toString());
            }
            ;
        }
        async renderUpdateCheck() {
            if (this.props.object !== this.state.lastPropObject) {
                this.setState({ lastPropObject: this.props.object });
                let folded = false;
                if (this.props.object instanceof Inspector_1.UnidentifiedObject) {
                    folded = true;
                }
                this.setState({ displayModel: this.props.object, folded });
                if (this.props.object instanceof Array) {
                    let newArr = new Array();
                    let arrayElemUpdated = false;
                    try {
                        for (let t1 of this.props.object) {
                            if (t1 instanceof Inspector_1.UnidentifiedObject && t1.keyCount < 10) {
                                newArr.push(await t1.identify({ maxDepth: 1 }));
                                arrayElemUpdated = true;
                            }
                            else {
                                newArr.push(t1);
                            }
                        }
                        if (arrayElemUpdated) {
                            this.setState({ displayModel: newArr });
                        }
                    }
                    catch (e) {
                        this.setState({ displayModel: [e.message, e.stack] });
                    }
                }
            }
            if (this.state.displayModel != this.lastDisplayModel) {
                this.onDisplayModelChanged();
                this.lastDisplayModel = this.state.displayModel;
            }
        }
        renderExpandChildrenBtnIfAvailable() {
            let robj = this.state.displayModel;
            if (robj instanceof Array) {
                if (robj.find(t1 => t1 instanceof Inspector_1.UnidentifiedObject) != undefined) {
                    return React.createElement("a", { style: { color: 'blue' }, onClick: async () => {
                            let newArr = [];
                            try {
                                for (let t1 of robj) {
                                    if (t1 instanceof Inspector_1.UnidentifiedObject) {
                                        newArr.push(await t1.identify({ maxDepth: 1 }));
                                    }
                                }
                                this.setState({ displayModel: newArr });
                            }
                            catch (e) {
                                this.setState({ displayModel: [e.message, e.stack] });
                            }
                        } }, "(Expand Children)");
                }
            }
            else {
                if (Object.values(robj).find(t1 => t1 instanceof Inspector_1.UnidentifiedObject) != undefined) {
                    return React.createElement("a", { style: { color: 'blue' }, onClick: async () => {
                            let newObj = {};
                            try {
                                for (let t1 in robj) {
                                    if (robj[t1] instanceof Inspector_1.UnidentifiedObject) {
                                        newObj[t1] = await robj[t1].identify({ maxDepth: 1 });
                                    }
                                    else {
                                        newObj[t1] = robj[t1];
                                    }
                                }
                                this.setState({ displayModel: newObj });
                            }
                            catch (e) {
                                this.setState({ displayModel: [e.message, e.stack] });
                            }
                        } }, "(Expand Children)");
                }
            }
            return null;
        }
        render(props, state, context) {
            this.renderUpdateCheck();
            let robj = this.state.displayModel;
            let type1 = typeof (robj);
            let TypedArray = Object.getPrototypeOf(Object.getPrototypeOf(new Uint8Array())).constructor;
            if (this.state.viewer != null) {
                return React.createElement(this.state.viewer, { ...this.props, object: robj });
            }
            else if (type1 === 'string') {
                if (robj.includes('\n')) {
                    let html1 = (0, utils_1.text2html)('`' + robj + '`');
                    return React.createElement("div", null,
                        React.createElement("div", null,
                            React.createElement("span", { className: exports.css1.propName },
                                this.props.name,
                                ":")),
                        React.createElement("div", { style: { wordBreak: 'break-all' }, dangerouslySetInnerHTML: { __html: html1 } }));
                }
                else {
                    let html1 = (0, utils_1.text2html)('"' + robj + '"');
                    return React.createElement("div", null,
                        React.createElement("span", { className: exports.css1.propName },
                            this.props.name,
                            ":"),
                        React.createElement("div", { style: { wordBreak: 'break-all', display: 'inline-block' }, dangerouslySetInnerHTML: { __html: html1 } }));
                }
            }
            else if (type1 !== 'object') {
                return React.createElement("div", null,
                    React.createElement("span", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    String(robj));
            }
            else if (robj === null) {
                return React.createElement("div", null,
                    React.createElement("span", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    "null");
            }
            else if (robj instanceof Array) {
                return React.createElement("div", null,
                    React.createElement("a", { className: exports.css1.propName, onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        " ",
                        (this.props.variableName ?? '') + this.props.name,
                        " (Array,",
                        robj.length,
                        ")"),
                    this.renderExpandChildrenBtnIfAvailable(),
                    React.createElement("br", null),
                    (!this.state.folded) ?
                        React.createElement("div", { style: { paddingLeft: '1em' } }, robj.map((v1, i1) => {
                            return React.createElement(ObjectViewer, { name: String(i1), object: v1, key: 'index' + i1 });
                        })) : null);
            }
            else if (robj instanceof Inspector_1.UnidentifiedObject) {
                return React.createElement("div", null,
                    React.createElement("a", { className: exports.css1.propName, onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        " ",
                        (this.props.variableName ?? '') + this.props.name,
                        " (",
                        (robj[Inspector_1.magicPropertyName.objectConstructorName]),
                        ",",
                        robj.keyCount,
                        ")"));
            }
            else if (robj instanceof Inspector_1.MiscObject) {
                if (robj.type == 'function') {
                    return React.createElement("div", null,
                        React.createElement("span", { className: exports.css1.propName },
                            this.props.name,
                            ":"),
                        " function ",
                        robj.functionName,
                        "()");
                }
                else if (robj.type == 'serializingError') {
                    return React.createElement("div", null,
                        React.createElement("span", { className: exports.css1.propName },
                            this.props.name,
                            ":"),
                        " error ",
                        robj.errorMessage);
                }
            }
            else if (robj instanceof Date) {
                return React.createElement("div", { style: { wordBreak: 'break-all' } },
                    React.createElement("span", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    " Date:",
                    robj.toString(),
                    ")");
            }
            else if (robj instanceof TypedArray) {
                return React.createElement("div", { style: { wordBreak: 'break-all' } },
                    React.createElement("span", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    " ",
                    robj.constructor.name,
                    ":",
                    (0, jsutils2_1.u8hexconv)(new Uint8Array(robj.buffer, robj.bytesOffset, robj.length * robj.BYTES_PER_ELEMENT)));
            }
            else if (robj instanceof ArrayBuffer) {
                return React.createElement("div", { style: { wordBreak: 'break-all' } },
                    React.createElement("span", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    " ArrayBuffer:",
                    (0, jsutils2_1.u8hexconv)(new Uint8Array(robj)));
            }
            else {
                let keys = Object.keys(robj).filter(t1 => t1 !== Inspector_1.magicPropertyName.objectConstructorName);
                return React.createElement("div", null,
                    React.createElement("a", { className: exports.css1.propName, onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        (this.props.variableName ?? '') + this.props.name,
                        " (",
                        robj[Inspector_1.magicPropertyName.objectConstructorName],
                        ",",
                        keys.length,
                        ")"),
                    this.renderExpandChildrenBtnIfAvailable(),
                    React.createElement("br", null),
                    (!this.state.folded) ?
                        React.createElement("div", { style: { paddingLeft: '1em' } }, keys.map((v1) => {
                            return React.createElement(ObjectViewer, { name: v1, object: robj[v1], key: 'index' + v1 });
                        })) : null);
            }
        }
    }
    exports.ObjectViewer = ObjectViewer;
    class HtmlViewer extends React.Component {
        constructor() {
            super(...arguments);
            this.divRef = new domui_1.ReactRefEx();
        }
        render(props, state, context) {
            if (this.props.object.js != undefined) {
                new Function('component', this.props.object.js)(this);
                this.props.object.js = undefined;
            }
            if (this.props.object.html != undefined) {
                return React.createElement("div", null,
                    React.createElement("div", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    React.createElement("div", { dangerouslySetInnerHTML: { __html: this.props.object.html }, ref: this.divRef }));
            }
            else {
                return React.createElement("div", { ref: this.divRef });
            }
        }
    }
    exports.HtmlViewer = HtmlViewer;
    class ImageViewer extends React.Component {
        render(props, state, context) {
            if (this.props.object.url != undefined) {
                return React.createElement("div", null,
                    React.createElement("div", { className: exports.css1.propName }, this.props.name),
                    React.createElement("img", { src: this.props.object.url }));
            }
            else {
                return null;
            }
        }
    }
    exports.ImageViewer = ImageViewer;
    class SimpleLogViewer extends domui_1.JsxClassComponent {
        set logSources(value) {
            if (this.pollTask != null) {
                this.pollTask.abort();
            }
            this.__logSources = value;
            this.pollTask = base_1.Task.fork(function* () {
                let rootPollTask = base_1.Task.currentTask;
                yield Promise.allSettled(this.logSources.map(logBuffer => {
                    return base_1.Task.fork(function* () {
                        while (this.pollTask === rootPollTask) {
                            let logmsg = yield* base_1.Task.yieldWrap(logBuffer.take(this.consumerId));
                            this.history.push(...logmsg.map(t1 => ({ ...t1.event, msg: t1.event.msg.map(t2 => String(t2)) })));
                            this.setState({});
                        }
                    }.bind(this)).run();
                }));
            }.bind(this));
            this.pollTask.run();
        }
        get logSources() {
            return this.__logSources;
        }
        constructor(props, ctx) {
            super(props, ctx);
            this.history = new Array();
            this.fitler = '';
            this.__logSources = new Array();
            this.onFilterChange = (ev) => {
                this.setState({ filter: ev.target.value });
            };
            this.consumerId = (0, base_1.GenerateRandomString)();
            this.pollTask = null;
            this.setState({ filter: '', history: [] });
        }
        clearHistory() {
            this.setState({ history: [] });
        }
        componentWillUnmount() {
            if (this.pollTask != null) {
                this.pollTask.abort();
                this.pollTask = null;
            }
        }
        jsx() {
            return React.createElement("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minWidth: '400px', minHeight: '300px' } },
                React.createElement("div", { style: { flexGrow: '1', flexShrink: '1', overflow: 'auto' } }, this.history.filter(t1 => t1.label.includes(this.fitler) || t1.msg.some(t2 => t2.includes(this.fitler))).map((t1, t2) => {
                    return React.createElement("div", { style: { whiteSpace: 'pre-wrap' } },
                        "[",
                        t1.level,
                        "]",
                        t1.label,
                        ":",
                        t1.msg.map(t2 => t2.toString()).join(' '));
                })),
                React.createElement("div", { style: { flexShrink: '0', display: 'flex', flexDirection: 'row' } },
                    React.createElement("input", { type: 'button', style: { flexGrow: '0' }, value: 'clear', onClick: () => this.clearHistory() }),
                    React.createElement("input", { type: 'text', onChange: this.onFilterChange, style: { flexGrow: '1' }, placeholder: 'filter' })));
        }
    }
    exports.SimpleLogViewer = SimpleLogViewer;
});
