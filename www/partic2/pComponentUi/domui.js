define(["require", "exports", "preact", "partic2/jsutils1/base", "partic2/jsutils1/webutils"], function (require, exports, React, base_1, webutils_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FloatLayerComponent = exports.ReactRefEx = exports.RefChangeEvent = exports.event = exports.css = exports.ReactEventTarget = exports.DomRootComponent = exports.DomDivComponent = exports.DomComponentGroup = exports.DomComponent = void 0;
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
            this.domElem = document.createElement('div');
        }
    }
    exports.DomDivComponent = DomDivComponent;
    class CDomRootComponent extends DomComponentGroup {
        constructor() {
            super();
            let domroot = document.createElement('div');
            document.body.appendChild(domroot);
            this.domElem = domroot;
            this.mounted = true;
        }
        async appendToNode(parent) {
            this.mounted = true;
        }
        async update() {
            if (!this.mounted) {
                await this.appendToNode(document.body);
            }
            await super.update();
        }
        addHiddenElement(e) {
            if (this.hiddenDiv == undefined) {
                this.hiddenDiv = document.createElement('div');
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
                this.hiddenDiv = document.createElement('div');
                this.hiddenDiv.style.display = 'none';
                this.getDomElement().append(this.hiddenDiv);
            }
            this.children.push(comp);
            await comp.appendToNode(this.hiddenDiv);
            await this.update();
        }
    }
    exports.DomRootComponent = new CDomRootComponent();
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
        overlayLayer: (0, base_1.GenerateRandomString)(),
        activeLayer: (0, base_1.GenerateRandomString)(),
        inactiveLayer: (0, base_1.GenerateRandomString)(),
        hideLayer: (0, base_1.GenerateRandomString)()
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.flexRow, ['display:flex', 'flex-direction:row']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.flexColumn, ['display:flex', 'flex-direction:column']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.selectable + ':hover', ['background-color:rgb(200,200,200)']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.selected, ['background-color:rgb(150,150,255)']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.simpleCard, ['display:inline-block', 'border:solid black 2px', 'margin:2px', 'padding:2px', 'background-color:white']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.simpleTable, ['border-collapse:collapse']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.simpleTableCell, ['border:solid black 2px']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.overlayLayer, ['z-index:1000', 'position:absolute', 'left:0px', 'top:0px']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.activeLayer, ['z-index:800', 'position:absolute', 'left:0px', 'top:0px']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.inactiveLayer, ['z-index:600', 'position:absolute', 'left:0px', 'top:0px']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.hideLayer, ['z-index:600', 'position:absolute', 'display:none', 'left:0px', 'top:0px']);
    exports.event = {
        layout: 'partic2-layout'
    };
    let FloatLayerManager = {
        layerComponents: new Map(),
        checkRenderLayer: function (c, activeTime) {
            let cur = this.layerComponents.get(c);
            if (cur == null) {
                this.layerComponents.set(c, { activeTime, layerClass: '' });
                this.resortAllLayer();
            }
            else if (cur.activeTime != activeTime) {
                this.layerComponents.set(c, { activeTime, layerClass: '' });
                this.resortAllLayer();
            }
            cur = this.layerComponents.get(c);
            return cur.layerClass;
        },
        resortAllLayer() {
            let activeLayer = [null, 0];
            '';
            for (let t1 of this.layerComponents.entries()) {
                if (activeLayer[1] <= t1[1].activeTime) {
                    activeLayer = [t1[0], t1[1].activeTime];
                }
            }
            for (let t1 of this.layerComponents.entries()) {
                if (t1[1].activeTime < 0) {
                    t1[1].layerClass = exports.css.hideLayer;
                    t1[0].forceUpdate();
                }
                else if (activeLayer[0] == t1[0] && t1[1].layerClass != exports.css.inactiveLayer) {
                    t1[1].layerClass = exports.css.activeLayer;
                    t1[0].forceUpdate();
                }
                else if (activeLayer[0] != t1[0] && t1[1].layerClass != exports.css.inactiveLayer) {
                    t1[1].layerClass = exports.css.inactiveLayer;
                    t1[0].forceUpdate();
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
    class ReactRefEx extends EventTarget {
        constructor() {
            super();
            this.__current = null;
            this.__forwardTo = [];
            this.addEventListener('change', (evt) => {
                for (let t1 of this.__forwardTo) {
                    if (typeof t1 === 'function') {
                        t1(evt.data.curr);
                    }
                    else if (t1 != null) {
                        t1.current = evt.data.curr;
                    }
                }
            });
        }
        set current(curr) {
            let prev = this.__current;
            this.__current = curr;
            this.dispatchEvent(new RefChangeEvent({ prev, curr }));
        }
        get current() {
            return this.__current;
        }
        forward(refs) {
            this.__forwardTo.push(...refs);
            return this;
        }
        addEventListener(type, callback, options) {
            super.addEventListener(type, callback, options);
        }
        removeEventListener(type, callback, options) {
            super.removeEventListener(type, callback, options);
        }
        async waitValid() {
            if (this.current != null) {
                return this.current;
            }
            else {
                return new Promise((resolve) => {
                    const onRefChange = (ev) => {
                        if (ev.data.curr != null) {
                            this.removeEventListener('change', onRefChange);
                            resolve(ev.data.curr);
                        }
                    };
                    this.addEventListener('change', onRefChange);
                });
            }
        }
        async waitInvalid() {
            if (this.current == null) {
                return;
            }
            return new Promise((resolve) => {
                const onRefChange = (ev) => {
                    if (ev.data.curr == null) {
                        this.removeEventListener('change', onRefChange);
                        resolve(undefined);
                    }
                };
                this.addEventListener('change', onRefChange);
            });
        }
    }
    exports.ReactRefEx = ReactRefEx;
    class FloatLayerComponent extends React.Component {
        constructor() {
            super(...arguments);
            this.containerDiv = null;
            this.cbOnLayout = () => {
                this.props.onLayout?.();
            };
        }
        componentWillUnmount() {
            FloatLayerManager.layerComponents.delete(this);
        }
        render() {
            return React.createElement("div", { ref: this.props.divRef, className: [FloatLayerManager.checkRenderLayer(this, this.props.activeTime),
                    ...this.props.divClass ?? []].join(' ') }, this.props.children);
        }
    }
    exports.FloatLayerComponent = FloatLayerComponent;
    function ReactRender(vnode, container) {
        if (container instanceof HTMLElement) {
            React.render(vnode, container);
        }
        else if (container instanceof DomComponentGroup) {
            React.render(vnode, container.getDomElement());
        }
        else if (container == 'create') {
            let div1 = document.createElement('div');
            React.render(vnode, div1);
            return div1;
        }
    }
    async function SetComponentFullScreen(comp) {
        let ctl = {
            onExit: new base_1.future(),
            exit: function () { if (!this.onExit.done) {
                document.exitFullscreen();
            } }
        };
        if (!document.body.contains(comp.getDomElement())) {
            exports.DomRootComponent.addHiddenComponent(comp);
        }
        await comp.getDomElement().requestFullscreen();
        exports.DomRootComponent.hiddenDiv.style.display = 'block';
        var fsCb = function (ev) {
            if (document.fullscreenElement !== comp.getDomElement()) {
                comp.getDomElement().removeEventListener('fullscreenchange', fsCb);
                ctl.onExit.setResult(true);
                exports.DomRootComponent.hiddenDiv.style.display = 'none';
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