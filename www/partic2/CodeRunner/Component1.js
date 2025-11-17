define(["require", "exports", "preact", "./Inspector", "partic2/jsutils1/base", "partic2/pComponentUi/utils", "partic2/jsutils1/webutils", "./jsutils2"], function (require, exports, React, Inspector_1, base_1, utils_1, webutils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ImageViewer = exports.HtmlViewer = exports.ObjectViewer = exports.css1 = exports.CustomViewerFactoryProp = void 0;
    exports.createViewableHtml = createViewableHtml;
    exports.createViewableImage = createViewableImage;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    exports.CustomViewerFactoryProp = '__Zag7QaCUiZb1ABgM__';
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
                if (typeof robj === 'object' && robj != null && exports.CustomViewerFactoryProp in robj) {
                    let viewerPath = robj[exports.CustomViewerFactoryProp];
                    let dotAt = viewerPath.lastIndexOf('.');
                    let mod = await new Promise((resolve_1, reject_1) => { require([viewerPath.substring(0, dotAt)], resolve_1, reject_1); });
                    let viewerFactory = mod[viewerPath.substring(dotAt + 1)];
                    if (typeof viewerFactory === 'function') {
                        if ('render' in viewerFactory.prototype) {
                            this.setState({ viewer: viewerFactory });
                        }
                        else {
                            this.setState({ viewer: await viewerFactory(robj) });
                        }
                    }
                }
            }
            catch (err) {
                console.warn(__name__, ':', err.toString());
            }
            ;
        }
        async renderUpdateCheck() {
            if (this.props.object !== this.state.lastPropObject) {
                let folded = false;
                if (this.props.object instanceof Inspector_1.UnidentifiedObject) {
                    folded = true;
                }
                this.setState({ displayModel: this.props.object, folded, lastPropObject: this.props.object });
                if (this.props.object instanceof Array) {
                    let newArr = new Array();
                    let arrayElemUpdated = false;
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
                            for (let t1 of robj) {
                                if (t1 instanceof Inspector_1.UnidentifiedObject) {
                                    newArr.push(await t1.identify({ maxDepth: 1 }));
                                }
                            }
                            this.setState({ displayModel: newArr });
                        } }, "(Expand Children)");
                }
            }
            else {
                if (Object.values(robj).find(t1 => t1 instanceof Inspector_1.UnidentifiedObject) != undefined) {
                    return React.createElement("a", { style: { color: 'blue' }, onClick: async () => {
                            let newObj = {};
                            for (let t1 in robj) {
                                if (robj[t1] instanceof Inspector_1.UnidentifiedObject) {
                                    newObj[t1] = await robj[t1].identify({ maxDepth: 1 });
                                }
                            }
                            this.setState({ displayModel: newObj });
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
                return React.createElement(this.state.viewer, { ...this.props });
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
                        this.props.name,
                        " (",
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
                        this.props.name,
                        " (",
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
                let keys = Object.keys(robj);
                return React.createElement("div", null,
                    React.createElement("a", { className: exports.css1.propName, onClick: () => this.toggleFolding() },
                        this.state.folded ? '+' : '-',
                        this.props.name,
                        " (",
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
        render(props, state, context) {
            if (this.props.object.html != undefined) {
                return React.createElement("div", null,
                    React.createElement("div", { className: exports.css1.propName },
                        this.props.name,
                        ":"),
                    React.createElement("div", { dangerouslySetInnerHTML: { __html: this.props.object.html } }));
            }
            else {
                return null;
            }
        }
    }
    exports.HtmlViewer = HtmlViewer;
    function createViewableHtml(source) {
        let opt = {};
        if (source.html != undefined) {
            opt.html = source.html;
        }
        return {
            [exports.CustomViewerFactoryProp]: __name__ + '.HtmlViewer',
            ...opt
        };
    }
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
    function createViewableImage(source) {
        let opt = {};
        if (source.url != undefined) {
            opt.url = source.url;
        }
        else if (source.svg != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.svg, 'image/svg+xml');
        }
        else if (source.pngdata != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.pngdata, 'image/png');
        }
        else if (source.jpegdata != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.jpegdata, 'image/jpeg');
        }
        else if (source.bmpdata != undefined) {
            opt.url = (0, base_1.ToDataUrl)(source.bmpdata, 'image/bmp');
        }
        return {
            [exports.CustomViewerFactoryProp]: __name__ + '.ImageViewer',
            ...opt
        };
    }
});
//# sourceMappingURL=Component1.js.map