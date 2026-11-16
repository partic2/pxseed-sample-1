define("partic2/pComponentUi/window", ["require", "exports", "preact", "./domui", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./transform", "partic2/pxseedMedia1/index1"], function (require, exports, React, domui_1, base_1, webutils_1, transform_1, index1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dialogBoxProvider = exports.rootWindowGroup = exports.WindowGroup = exports.WindowComponent = exports.DefaultWindowComponent = exports.css = exports.language = void 0;
    exports.setDefaultWindowComponentImplemention = setDefaultWindowComponentImplemention;
    exports.ensureRootWindowContainer = ensureRootWindowContainer;
    exports.appendFloatWindow = appendFloatWindow;
    exports.removeFloatWindow = removeFloatWindow;
    exports.windowsContainerForceUpdate = windowsContainerForceUpdate;
    exports.getFloatWindowVNodeList = getFloatWindowVNodeList;
    exports.alert = alert;
    exports.confirm = confirm;
    exports.prompt = prompt;
    exports.language = new base_1.Ref2('en');
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let cssPrefix = __name__.replace(/\//g, '-');
    exports.css = {
        defaultWindowDiv: cssPrefix + '-defaultWindowDiv',
        borderlessWindowContentDiv: cssPrefix + '-borderlessWindowContentDiv',
        defaultContentDiv: cssPrefix + '-defaultContentDiv',
        defaultTitleStyle: cssPrefix + '-defaultTitleStyle',
    };
    if (globalThis.document != undefined) {
        webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultWindowDiv, ['box-sizing: border-box', 'pointer-events:auto']);
        webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultContentDiv, ['box-sizing: border-box', 'flex-grow:1', 'background-color:white', 'overflow:auto', 'border:solid black 1px', 'min-height:0px', 'min-width:0px']);
        webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.borderlessWindowContentDiv, ['pointer-events:auto', 'flex-grow:1', 'box-sizing: border-box', 'min-height:0px', 'min-width:0px']);
        webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultTitleStyle, ['box-sizing: border-box', 'background-color:silver', 'color:balck', 'border-left:solid black 1px', 'border-top:solid black 1px', 'border-right:solid black 1px']);
    }
    class DefaultWindowComponent extends domui_1.JsxClassComponent {
        constructor() {
            super(...arguments);
            this.closeIcon = (0, index1_1.getIconUrl)('x.svg');
            this.title = 'untitled';
            this.activateTime = 0;
            this.currentLayout = { left: 0, top: 0 };
            this.errorOccured = null;
            this.children = null;
            this.rref = {
                container: new domui_1.ReactRefEx(),
                contentDiv: new domui_1.ReactRefEx()
            };
            this.resizeEvent = domui_1.JsxClassComponent.defineEventSlot();
            this.moveEvent = domui_1.JsxClassComponent.defineEventSlot();
            this.__resizeObserver = new ResizeObserver(() => this.resizeEvent.dispatch());
            this.userMoveEvent = domui_1.JsxClassComponent.defineEventSlot();
            this.__wndMove = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.layout({ left: curr.x - start.x, top: curr.y - start.y });
                    this.userMoveEvent.dispatch();
                }
            });
            this.__onTitleMouseDownHandler = (evt) => {
                this.__wndMove.start({ x: evt.clientX - this.currentLayout.left, y: evt.clientY - this.currentLayout.top }, true);
                evt.preventDefault();
            };
            this.userResizeEvent = domui_1.JsxClassComponent.defineEventSlot();
            this.__wndResize = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.layout({ ...this.currentLayout, width: curr.x - start.x, height: curr.y - start.y });
                    this.userResizeEvent.dispatch();
                }
            });
            this.__onResizeIconMouseDownHandler = (evt) => {
                this.__wndResize.start({ x: this.currentLayout.left, y: this.currentLayout.top }, true);
                evt.preventDefault();
            };
            this.closeEvent = domui_1.JsxClassComponent.defineEventSlot();
            this.sizeMeasuring = new base_1.Ref2(false);
        }
        static getDerivedStateFromError(error) {
            return { errorOccured: error };
        }
        componentDidMount() {
            if (this.rref.container.current != undefined) {
                this.__resizeObserver.observe(this.rref.container.current);
            }
        }
        componentWillUnmount() {
            this.__resizeObserver.disconnect();
        }
        renderIcon(url, onClick) {
            if (url == null) {
                return null;
            }
            if (url.indexOf(':') >= 0) {
                return React.createElement("div", { className: domui_1.css.simpleCard, onClick: onClick },
                    React.createElement("img", { src: url, width: '16', height: '16' }));
            }
            else {
                return React.createElement("div", { className: domui_1.css.simpleCard, onClick: onClick, style: { userSelect: 'none' } }, url);
            }
        }
        activate(activateTime) {
            if (this.keepTop) {
                activateTime = 95617573200000;
            }
            this.activateTime = activateTime ?? (0, base_1.GetCurrentTime)().getTime();
            this.setState({}, () => { windowsContainerForceUpdate(); });
        }
        hide() {
            this.activateTime = -1;
            this.setState({}, () => { windowsContainerForceUpdate(); });
        }
        isHidden() {
            return this.activateTime < 0 && !this.keepTop;
        }
        renderTitleIcons() {
            return [
                ...(this.titleBarButton ?? []).map(t1 => this.renderIcon(t1.icon, t1.onClick)),
                this.renderIcon(this.closeIcon, () => this.onCloseClick())
            ];
        }
        getLayout() {
            return this.currentLayout;
        }
        async layout(layout) {
            return new Promise((resolve) => {
                let newLayout = { ...this.currentLayout, ...layout };
                let oldLayout = this.currentLayout;
                let windowGroup = this.getAncestorJsxClassComponents({ clazz: WindowGroup, count: 1 }).at(0);
                if (windowGroup != undefined) {
                    let windowGroupSize = windowGroup.getSize();
                    if (newLayout.width != undefined && newLayout.left + newLayout.width > windowGroupSize.width) {
                        newLayout.width = windowGroupSize.width - newLayout.left;
                    }
                    if (newLayout.height != undefined && newLayout.top + newLayout.height > windowGroupSize.height) {
                        newLayout.height = windowGroupSize.height - newLayout.top;
                    }
                }
                this.currentLayout = newLayout;
                this.setState({}, () => {
                    if (newLayout.left != oldLayout.left || newLayout.top != oldLayout.top) {
                        this.moveEvent.dispatch();
                    }
                    resolve();
                });
            });
        }
        renderTitle() {
            let titleString = this.title;
            if (typeof titleString !== 'string') {
                titleString = '';
            }
            return React.createElement("div", { className: [domui_1.css.flexRow, exports.css.defaultTitleStyle].join(' '), style: { alignItems: 'center' } },
                React.createElement("div", { style: { flexGrow: '1', cursor: 'move', userSelect: 'none', overflowY: 'auto', touchAction: 'none' }, onPointerDown: this.__onTitleMouseDownHandler }, titleString.replace(/ /g, String.fromCharCode(160))),
                "\u00A0",
                this.renderTitleIcons());
        }
        renderContent() {
            return React.createElement("div", { className: [this.borderless ? exports.css.borderlessWindowContentDiv : exports.css.defaultContentDiv].join(' '), ref: this.rref.contentDiv }, this.errorOccured == null ? this.children : React.createElement("pre", { style: { backgroundColor: 'white', color: 'black' } },
                this.errorOccured.message,
                this.errorOccured.stack));
        }
        renderResizeHandler() {
            return React.createElement("img", { src: (0, index1_1.getIconUrl)('arrow-down-right.svg'), style: {
                    position: 'absolute', cursor: 'nwse-resize',
                    right: '0px', bottom: '0px', touchAction: 'none',
                    backgroundColor: 'white'
                }, onPointerDown: this.__onResizeIconMouseDownHandler, width: "12", height: "12" });
        }
        async onCloseClick() {
            this.hide();
            this.closeEvent.dispatch();
            this.onClose?.();
        }
        async sizeToContent() {
            this.sizeMeasuring.set(true);
            let width = 0;
            let height = 0;
            let stableCount = 0;
            for (let t1 = 0; t1 < 40 && this.sizeMeasuring.get(); t1++) {
                await (0, base_1.sleep)(25);
                let newWidth = this.rref.container.current?.offsetWidth ?? 0;
                let newHeight = this.rref.container.current?.offsetHeight ?? 0;
                if (width != newWidth || height != newHeight) {
                    width = newWidth;
                    height = newHeight;
                    stableCount = 0;
                }
                else {
                    stableCount++;
                }
                if (stableCount >= 8)
                    break;
            }
            let windowGroup = this.getAncestorJsxClassComponents({ clazz: WindowGroup, count: 1 }).at(0);
            if (this.sizeMeasuring.get() && this.rref.container.current != null && windowGroup != undefined && (this.currentLayout.width == undefined || this.currentLayout.height == undefined)) {
                let layout = { ...this.currentLayout, width: width + 1, height: height + 1 };
                this.layout(layout);
            }
            this.sizeMeasuring.set(false);
        }
        renderWindowMain() {
            try {
                if (!this.borderless) {
                    if ((this.currentLayout.width == undefined || this.currentLayout.height == undefined) && !this.sizeMeasuring.get()) {
                        let windowGroup = this.getAncestorJsxClassComponents({ clazz: WindowGroup, count: 1 }).at(0);
                        if (windowGroup != undefined)
                            this.sizeToContent();
                    }
                    else if (this.currentLayout.width != undefined && this.currentLayout.height != undefined && this.sizeMeasuring.get()) {
                        this.sizeMeasuring.set(false);
                    }
                }
                let windowDivStyle = {
                    position: 'absolute',
                    left: this.currentLayout.left + 'px',
                    top: this.currentLayout.top + 'px',
                    touchAction: 'none'
                };
                if (this.currentLayout.width != undefined) {
                    windowDivStyle.width = this.currentLayout.width + 'px';
                }
                if (this.currentLayout.height != undefined) {
                    windowDivStyle.height = this.currentLayout.height + 'px';
                }
                return React.createElement("div", { className: [domui_1.css.flexColumn, exports.css.defaultWindowDiv].join(' '), style: windowDivStyle, ref: this.rref.container, onPointerDown: () => {
                        if (this.activateTime >= 0 && !this.disableUserInputActivate)
                            this.activate();
                    } },
                    this.borderless ? null : this.renderTitle(),
                    [
                        this.renderContent(),
                        (this.borderless) ? null : this.renderResizeHandler()
                    ]);
            }
            catch (err) {
                return React.createElement("div", null, err.message + err.stack);
            }
        }
        componentDidUpdate() {
            this.onComponentDidUpdate?.();
        }
        jsx() {
            return React.createElement(domui_1.FloatLayerComponent, { activateTime: this.activateTime }, this.renderWindowMain());
        }
    }
    exports.DefaultWindowComponent = DefaultWindowComponent;
    exports.WindowComponent = DefaultWindowComponent;
    function setDefaultWindowComponentImplemention(impl) {
        exports.WindowComponent = impl;
    }
    class WindowGroup extends domui_1.JsxClassComponent {
        constructor() {
            super(...arguments);
            this.container = new domui_1.ReactRefEx();
            this.floatWindowVNodes = new Array();
            this.resizeEvent = domui_1.JsxClassComponent.defineEventSlot();
            this.resizeObserver = new ResizeObserver((ent) => { this.resizeEvent.dispatch(); });
        }
        async componentDidMount() {
            this.resizeObserver.observe(await this.container.waitValid());
        }
        async componentWillUnmount() {
            this.resizeObserver.disconnect();
        }
        jsx() {
            return React.createElement("div", { style: { width: '100%', height: '100%', ...this.props.divStyle }, ref: this.container }, this.floatWindowVNodes);
        }
        appendFloatWindow(window, active) {
            active = active ?? true;
            let ref2 = new domui_1.ReactRefEx().forward([window.ref].filter(v => v != undefined));
            window.ref = ref2;
            if (window.key == undefined) {
                window.key = (0, base_1.GenerateRandomString)();
            }
            this.floatWindowVNodes.push(window);
            if (active) {
                ref2.waitValid().then((v) => {
                    if (v instanceof exports.WindowComponent) {
                        v.activate();
                    }
                });
            }
            ;
            this.setState({});
        }
        removeFloatWindow(window) {
            let index = this.floatWindowVNodes.findIndex(v => v === window);
            if (index >= 0) {
                this.floatWindowVNodes.splice(index, 1);
                this.setState({});
            }
        }
        getSize() {
            return {
                width: this.container.current?.clientWidth ?? 0,
                height: this.container.current?.clientHeight ?? 0
            };
        }
    }
    exports.WindowGroup = WindowGroup;
    exports.rootWindowGroup = new domui_1.ReactRefEx();
    let windowDomRootComponent = null;
    function ensureRootWindowContainer() {
        if (windowDomRootComponent == null) {
            windowDomRootComponent = new domui_1.DomDivComponent();
            domui_1.DomRootComponent.addChild(windowDomRootComponent);
            let div = windowDomRootComponent.getDomElement();
            div.style.width = '100vw';
            div.style.height = '100vh';
            div.style.position = 'absolute';
            div.style.left = '0px';
            div.style.top = '0px';
            div.style.pointerEvents = 'none';
            domui_1.DomRootComponent.addChild(windowDomRootComponent).then(() => domui_1.DomRootComponent.update());
            (0, domui_1.ReactRender)(React.createElement(WindowGroup, { ref: exports.rootWindowGroup }), windowDomRootComponent);
            //To fix bug in EDGE --app mode
            document.body.style.overflow = 'hidden';
        }
    }
    function appendFloatWindow(window, active) {
        ensureRootWindowContainer();
        exports.rootWindowGroup.current?.appendFloatWindow(window, active);
    }
    function removeFloatWindow(window) {
        ensureRootWindowContainer();
        exports.rootWindowGroup.current?.removeFloatWindow(window);
    }
    async function windowsContainerForceUpdate() {
        ensureRootWindowContainer();
        return new Promise((resolve) => exports.rootWindowGroup.current?.forceUpdate(resolve));
    }
    function getFloatWindowVNodeList() {
        ensureRootWindowContainer();
        return exports.rootWindowGroup.current?.floatWindowVNodes ?? [];
    }
    exports.language.set(navigator.language);
    exports.dialogBoxProvider = {};
    async function alert(message, title) {
        if (exports.dialogBoxProvider.alert == null) {
            exports.dialogBoxProvider.alert = (await new Promise((resolve_1, reject_1) => { require(['./workspace'], resolve_1, reject_1); })).defaultDialogBoxImplemention.alert;
        }
        return exports.dialogBoxProvider.alert(message, title);
    }
    async function confirm(message, title) {
        if (exports.dialogBoxProvider.confirm == null) {
            exports.dialogBoxProvider.confirm = (await new Promise((resolve_2, reject_2) => { require(['./workspace'], resolve_2, reject_2); })).defaultDialogBoxImplemention.confirm;
        }
        return exports.dialogBoxProvider.confirm(message, title);
    }
    async function prompt(form, opt) {
        if (exports.dialogBoxProvider.prompt == null) {
            exports.dialogBoxProvider.prompt = (await new Promise((resolve_3, reject_3) => { require(['./workspace'], resolve_3, reject_3); })).defaultDialogBoxImplemention.prompt;
        }
        return exports.dialogBoxProvider.prompt(form, opt);
    }
});
