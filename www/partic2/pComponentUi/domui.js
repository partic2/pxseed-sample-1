define(["require", "exports", "preact", "partic2/jsutils1/base", "partic2/jsutils1/webutils"], function (require, exports, React, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FloatLayerComponent = exports.ReactRefEx = exports.RefChangeEvent = exports.floatLayerZIndexBase = exports.event = exports.css = exports.ReactEventTarget = exports.__inited__ = exports.DomRootComponent = exports.DomDivComponent = exports.DomComponentGroup = exports.DomComponent = void 0;
    exports.ReactRender = ReactRender;
    exports.SetComponentFullScreen = SetComponentFullScreen;
    exports.RequestPrintWindow = RequestPrintWindow;
    var ReactDOM = React;
    class DomComponent {
        constructor() {
            this.mounted = false;
        }
        async appendToNode(parent) {
            parent.appendChild(this.domElem);
            this.mounted = true;
        }
        async removeFromNode() {
            if (this.domElem != undefined && this.domElem.parentElement != null) {
                this.domElem.parentElement.removeChild(this.domElem);
            }
        }
        getDomElement() {
            return this.domElem;
        }
        async update() {
        }
    }
    exports.DomComponent = DomComponent;
    class DomComponentGroup extends DomComponent {
        constructor() {
            super(...arguments);
            this.children = new Array();
        }
        getChildren() {
            return this.children;
        }
        async addChild(comp) {
            this.children.push(comp);
            await comp.appendToNode(this.domElem);
            await comp.update();
        }
        async removeChild(comp) {
            let at = this.children.indexOf(comp);
            if (at >= 0) {
                let ch = this.children.splice(at, 1)[0];
                await ch.removeFromNode();
            }
        }
        async update() {
            let doUpdate = [];
            for (let ch of this.children) {
                doUpdate.push(ch.update());
            }
            await Promise.all(doUpdate);
        }
    }
    exports.DomComponentGroup = DomComponentGroup;
    class DomDivComponent extends DomComponentGroup {
        constructor() {
            super();
            this.domElem = globalThis.document.createElement('div');
        }
    }
    exports.DomDivComponent = DomDivComponent;
    class CDomRootComponent extends DomComponentGroup {
        constructor() {
            super();
            let domroot = globalThis.document.createElement('div');
            globalThis.document.body.appendChild(domroot);
            this.domElem = domroot;
            this.mounted = true;
        }
        async appendToNode(parent) {
            this.mounted = true;
        }
        changeRoot(rootDiv) {
            this.domElem = rootDiv;
        }
        async update() {
            if (!this.mounted) {
                await this.appendToNode(globalThis.document.body);
            }
            await super.update();
        }
        addHiddenElement(e) {
            if (this.hiddenDiv == undefined) {
                this.hiddenDiv = globalThis.document.createElement('div');
                this.hiddenDiv.style.display = 'none';
                this.getDomElement().append(this.hiddenDiv);
            }
            this.hiddenDiv.append(e);
        }
        removeHiddenElement(e) {
            if (this.hiddenDiv != undefined) {
                this.hiddenDiv.removeChild(e);
            }
        }
        async addHiddenComponent(comp) {
            if (this.hiddenDiv == undefined) {
                this.hiddenDiv = globalThis.document.createElement('div');
                this.hiddenDiv.style.display = 'none';
                this.getDomElement().append(this.hiddenDiv);
            }
            this.children.push(comp);
            await comp.appendToNode(this.hiddenDiv);
            await this.update();
        }
    }
    class DomRootComponentProxy extends base_1.Ref2 {
        async appendToNode(parent) {
            return this.get().appendToNode(parent);
        }
        async update() {
            return this.get().update();
        }
        addHiddenElement(e) {
            return this.get().addHiddenElement(e);
        }
        removeHiddenElement(e) {
            return this.get().removeHiddenElement(e);
        }
        async addHiddenComponent(comp) {
            return this.get().addHiddenComponent(comp);
        }
        getChildren() {
            return this.get().getChildren();
        }
        async addChild(comp) {
            return this.get().addChild(comp);
        }
        async removeChild(comp) {
            return this.get().removeChild(comp);
        }
    }
    exports.__inited__ = (async () => {
        if (globalThis.document != undefined) {
            exports.DomRootComponent = new DomRootComponentProxy(new CDomRootComponent());
            //To fix preact BUG
            if (!('ontouchstart' in HTMLElement)) {
                globalThis.HTMLElement.prototype.ontouchstart = undefined;
                globalThis.HTMLElement.prototype.ontouchmove = undefined;
                globalThis.HTMLElement.prototype.ontouchend = undefined;
            }
        }
    })();
    class ReactEventTarget extends React.Component {
        constructor() {
            super(...arguments);
            this.eventTarget = new EventTarget();
        }
        addEventListener(type, callback, options) {
            this.eventTarget.addEventListener(type, callback, options);
        }
        dispatchEvent(event) {
            return this.eventTarget.dispatchEvent(event);
        }
        removeEventListener(type, callback, options) {
            this.eventTarget.removeEventListener(type, callback, options);
        }
    }
    exports.ReactEventTarget = ReactEventTarget;
    exports.css = {
        flexRow: (0, base_1.GenerateRandomString)(),
        flexColumn: (0, base_1.GenerateRandomString)(),
        selected: (0, base_1.GenerateRandomString)(),
        simpleCard: (0, base_1.GenerateRandomString)(),
        simpleTable: (0, base_1.GenerateRandomString)(),
        simpleTableCell: (0, base_1.GenerateRandomString)(),
        selectable: (0, base_1.GenerateRandomString)(),
        floatLayer: (0, base_1.GenerateRandomString)()
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.flexRow, ['display:flex', 'flex-direction:row']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.flexColumn, ['display:flex', 'flex-direction:column']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.selectable + ':hover', ['background-color:rgb(200,200,200)']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.selected, ['background-color:rgb(150,150,255)']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.simpleCard, ['display:inline-block', 'border:solid black 2px', 'margin:2px', 'padding:2px', 'background-color:white']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.simpleTable, ['border-collapse:collapse']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.simpleTableCell, ['border:solid black 2px']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.floatLayer, ['position:absolute', 'left:0px', 'top:0px', 'width:100%', 'height:100%', 'pointer-events:none']);
    exports.event = {
        layout: 'partic2-layout'
    };
    exports.floatLayerZIndexBase = 600;
    let FloatLayerManager = {
        layerComponents: new Map(),
        checkRenderLayerStyle: function (c, activateTime) {
            let cur = this.layerComponents.get(c);
            if (cur == null) {
                this.layerComponents.set(c, { activateTime, layerZIndex: 0 });
                this.resortAllLayer();
            }
            else if (cur.activateTime != activateTime) {
                this.layerComponents.set(c, { activateTime, layerZIndex: 0 });
                this.resortAllLayer();
            }
            cur = this.layerComponents.get(c);
            let t1 = { zIndex: cur.layerZIndex };
            if (activateTime < 0) {
                t1.display = 'none';
            }
            return t1;
        },
        resortAllLayer() {
            let ent = Array.from(this.layerComponents.entries());
            ent.sort((t1, t2) => t1[1].activateTime - t2[1].activateTime);
            for (let [t1, t2] of ent.entries()) {
                if (t2[1].layerZIndex != exports.floatLayerZIndexBase + t1) {
                    t2[1].layerZIndex = exports.floatLayerZIndexBase + t1;
                    t2[0].forceUpdate();
                }
            }
        }
    };
    class RefChangeEvent extends Event {
        constructor(data) {
            super('change');
            this.data = data;
        }
    }
    exports.RefChangeEvent = RefChangeEvent;
    class ReactRefEx extends base_1.Ref2 {
        constructor() {
            super(null);
            this.__forwardTo = [];
            this.watch((r, prev) => {
                for (let t1 of this.__forwardTo) {
                    if (typeof t1 === 'function') {
                        t1(r.get());
                    }
                    else if (t1 != null) {
                        t1.current = r.get();
                    }
                }
            });
        }
        set current(curr) {
            this.set(curr);
        }
        get current() {
            return this.get();
        }
        forward(refs) {
            this.__forwardTo.push(...refs);
            return this;
        }
        async waitValid() {
            if (this.current != null) {
                return this.current;
            }
            else {
                return new Promise((resolve) => {
                    const onRefChange = (r) => {
                        if (r.get() != null) {
                            this.unwatch(onRefChange);
                            resolve(r.get());
                        }
                    };
                    this.watch(onRefChange);
                });
            }
        }
        async waitInvalid() {
            if (this.current != null) {
                return this.current;
            }
            else {
                return new Promise((resolve) => {
                    const onRefChange = (r) => {
                        if (r.get() != null) {
                            this.unwatch(onRefChange);
                            resolve();
                        }
                    };
                    this.watch(onRefChange);
                });
            }
        }
    }
    exports.ReactRefEx = ReactRefEx;
    class FloatLayerComponent extends React.Component {
        constructor() {
            super(...arguments);
            this.containerDiv = null;
        }
        componentWillUnmount() {
            FloatLayerManager.layerComponents.delete(this);
        }
        render() {
            return React.createElement("div", { ref: this.props.divRef, className: [exports.css.floatLayer,
                    ...this.props.divClass ?? []].join(' '), style: FloatLayerManager.checkRenderLayerStyle(this, this.props.activateTime) }, this.props.children);
        }
    }
    exports.FloatLayerComponent = FloatLayerComponent;
    //container accept Ref2<HTMLElement>|Ref2<DomComponentGroup>|HTMLElement|DomComponentGroup|'create', But tsc complain with it , So I use any now.
    function ReactRender(vnode, container) {
        if (container instanceof HTMLElement) {
            React.render(vnode, container);
        }
        else if (container instanceof DomComponentGroup) {
            React.render(vnode, container.getDomElement());
        }
        else if (container instanceof base_1.Ref2) {
            ReactRender(vnode, container.get());
        }
        else if (container == 'create') {
            let div1 = globalThis.document.createElement('div');
            React.render(vnode, div1);
            return div1;
        }
    }
    async function SetComponentFullScreen(comp) {
        let ctl = {
            onExit: new base_1.future(),
            exit: function () { if (!this.onExit.done) {
                globalThis.document.exitFullscreen();
            } }
        };
        if (!globalThis.document.body.contains(comp.getDomElement())) {
            exports.DomRootComponent.get().addHiddenComponent(comp);
        }
        await comp.getDomElement().requestFullscreen();
        exports.DomRootComponent.get().hiddenDiv.style.display = 'block';
        var fsCb = function (ev) {
            if (globalThis.document.fullscreenElement !== comp.getDomElement()) {
                comp.getDomElement().removeEventListener('fullscreenchange', fsCb);
                ctl.onExit.setResult(true);
                exports.DomRootComponent.get().hiddenDiv.style.display = 'none';
            }
        };
        comp.getDomElement().addEventListener('fullscreenchange', fsCb);
        return ctl;
    }
    function RequestPrintWindow(options) {
        let rules = [];
        if (options.pageSize != undefined) {
            if (typeof options.pageSize !== 'string') {
                rules.push('size:' + options.pageSize.w + ' ' + options.pageSize.h);
            }
            else {
                rules.push('size:' + options.pageSize);
            }
        }
        if (options.pageOrientation != undefined) {
            rules.push('page-orientation:' + options.pageOrientation);
        }
        if (options.margin != undefined) {
            if (typeof options.margin !== 'string') {
                for (let side in options.margin) {
                    let val = options.margin[side];
                    if (typeof val === 'string') {
                        rules.push('margin-' + side + ':' + val);
                    }
                }
            }
            else {
                rules.push('margin:' + options.margin);
            }
        }
        webutils_1.DynamicPageCSSManager.PutCss('@page', rules);
        window.print();
        webutils_1.DynamicPageCSSManager.RemoveCss('@page');
    }
});
//# sourceMappingURL=domui.js.map