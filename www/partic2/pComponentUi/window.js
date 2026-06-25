define("partic2/pComponentUi/window", ["require", "exports", "preact", "./domui", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./transform", "partic2/pxseedMedia1/index1"], function (require, exports, React, domui_1, base_1, webutils_1, transform_1, index1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.dialogBoxProvider = exports.rootWindowsList = exports.WindowsList = exports.WindowComponent = exports.DefaultWindowComponent = exports.css = exports.language = void 0;
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
        borderlessWindowDiv: cssPrefix + '-borderlessWindowDiv',
        defaultContentDiv: cssPrefix + '-defaultContentDiv',
        defaultTitleStyle: cssPrefix + '-defaultTitleStyle',
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultWindowDiv, ['border:solid black 1px', 'box-sizing: border-box', 'pointer-events:auto']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.borderlessWindowDiv, ['pointer-events:auto']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultContentDiv, ['flex-grow:1', 'background-color:white', 'overflow:auto']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultTitleStyle, ['background-color:black', 'color:white']);
    class DefaultWindowComponent extends domui_1.ReactEventTarget {
        static getDerivedStateFromError(error) {
            return { errorOccured: error };
        }
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                container: new domui_1.ReactRefEx(),
                contentDiv: new domui_1.ReactRefEx()
            };
            this.__resizeObserver = new ResizeObserver(() => this.dispatchEvent(new Event('resize')));
            this.__wndMove = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.beforeMaximizeSize = null;
                    this.setState({ layout: { ...this.state.layout, left: curr.x - start.x, top: curr.y - start.y } }, () => this.dispatchEvent(new Event('move')));
                }
            });
            this.__onTitleMouseDownHandler = (evt) => {
                this.__wndMove.start({ x: evt.clientX - this.state.layout.left, y: evt.clientY - this.state.layout.top }, true);
                evt.preventDefault();
            };
            this.__wndResize = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.beforeMaximizeSize = null;
                    this.setState({ layout: { ...this.state.layout, width: curr.x - start.x, height: curr.y - start.y } });
                }
            });
            this.__onResizeIconMouseDownHandler = (evt) => {
                this.__wndResize.start({ x: this.state.layout.left, y: this.state.layout.top }, true);
                evt.preventDefault();
            };
            this.beforeMaximizeSize = null;
            this._sizeMeasuring = false;
            this.setState({ activateTime: -1, layout: this.props.initialLayout ?? { left: 0, top: 0 }, errorOccured: null });
            this.addEventListener('resize', () => this.onResize());
            this.addEventListener('move', () => this.onMove());
        }
        componentDidMount() {
            if (this.rref.container.current != undefined) {
                this.__resizeObserver.observe(this.rref.container.current);
            }
        }
        componentWillUnmount() {
            this.__resizeObserver.disconnect();
        }
        onResize() {
        }
        onMove() {
        }
        async makeCenter() {
            if (this.props.windowsList?.container.current != null) {
                for (let t1 = 0; t1 < 40; t1++) {
                    let wndWidth = (this.props.windowsList.container.current.offsetWidth) ?? 0;
                    let wndHeight = (this.props.windowsList.container.current.offsetHeight) ?? 0;
                    let width = this.rref.container.current?.offsetWidth ?? 0;
                    let height = this.rref.container.current?.offsetHeight ?? 0;
                    if (width > wndWidth - 5)
                        width = wndWidth - 5;
                    if (height > wndHeight - 5)
                        height = wndHeight - 5;
                    let left = (wndWidth - width) >> 1;
                    let top = (wndHeight - height) >> 1;
                    if (left != this.state.layout.left || top != this.state.layout.top) {
                        await new Promise((resolve) => {
                            this.setState({ layout: { ...this.state.layout, left: left, top: top } }, () => resolve(null));
                        });
                    }
                    if (!this._sizeMeasuring)
                        break;
                    await (0, base_1.sleep)(25);
                }
            }
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
            if (this.props.keepTop) {
                activateTime = 95617573200000;
            }
            this.setState({ activateTime: activateTime ?? (0, base_1.GetCurrentTime)().getTime() }, () => {
                windowsContainerForceUpdate();
            });
        }
        hide() {
            this.setState({ activateTime: -1 });
            windowsContainerForceUpdate();
        }
        isHidden() {
            return this.state.activateTime < 0 && !this.props.keepTop;
        }
        renderTitle() {
            let titleString = this.props.title;
            if (typeof titleString !== 'string') {
                titleString = '';
            }
            return React.createElement("div", { className: [domui_1.css.flexRow, exports.css.defaultTitleStyle].join(' '), style: { alignItems: 'center' } },
                React.createElement("div", { style: { flexGrow: '1', cursor: 'move', userSelect: 'none', overflowY: 'auto', touchAction: 'none' }, onPointerDown: this.__onTitleMouseDownHandler }, titleString.replace(/ /g, String.fromCharCode(160))),
                "\u00A0",
                (this.props.titleBarButton ?? []).map(t1 => this.renderIcon(t1.icon, t1.onClick)),
                this.renderIcon(this.props.maximize, () => this.onMaximizeClick()),
                this.renderIcon(this.props.closeIcon, () => this.onCloseClick()));
        }
        renderContent() {
            return React.createElement("div", { className: [exports.css.defaultContentDiv].join(' '), ref: this.rref.contentDiv }, this.state.errorOccured == null ? this.props.children : React.createElement("pre", { style: { backgroundColor: 'white', color: 'black' } },
                this.state.errorOccured.message,
                this.state.errorOccured.stack));
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
            this.dispatchEvent(new Event('close'));
            this.props.onClose?.();
        }
        async onMaximizeClick() {
            await this.setMaximized(!this.getMaximized());
        }
        getMaximized() {
            return this.beforeMaximizeSize != null;
        }
        async setMaximized(maximized) {
            if (maximized) {
                this.beforeMaximizeSize = { ...this.state.layout };
                let containerDiv = await this.rref.container.waitValid();
                this.setState({ layout: { left: 0, top: 0,
                        width: containerDiv.offsetParent.offsetWidth,
                        height: containerDiv.offsetParent.offsetHeight } }, () => this.dispatchEvent(new Event('move')));
            }
            else {
                if (this.beforeMaximizeSize != null) {
                    this.setState({ layout: { ...this.beforeMaximizeSize } }, () => this.dispatchEvent(new Event('move')));
                }
                this.beforeMaximizeSize = null;
            }
        }
        async _measureSize() {
            this._sizeMeasuring = true;
            let width = 0;
            let height = 0;
            let stableCount = 0;
            for (let t1 = 0; t1 < 40 && this._sizeMeasuring; t1++) {
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
            if (this._sizeMeasuring && this.rref.container.current != null && this.props.windowsList != null && (this.state.layout.width == undefined || this.state.layout.height == undefined)) {
                let layout = { ...this.state.layout, width: width + 1, height: height + 1 };
                if (this.rref.container.current.offsetLeft + this.rref.container.current.offsetWidth > this.props.windowsList.container.current.offsetWidth) {
                    layout.width = this.props.windowsList.container.current.offsetWidth - this.rref.container.current.offsetLeft;
                }
                if (this.rref.container.current.offsetTop + this.rref.container.current.offsetHeight > this.props.windowsList.container.current.offsetHeight) {
                    layout.height = this.props.windowsList.container.current.offsetHeight - this.rref.container.current.offsetTop;
                }
                this.setState({ layout });
            }
            this._sizeMeasuring = false;
        }
        renderWindowMain() {
            try {
                if ((this.state.layout.width == undefined || this.state.layout.height == undefined) && !this._sizeMeasuring && this.props.windowsList != null) {
                    this._measureSize();
                }
                else if (this.state.layout.width != undefined && this.state.layout.height && this._sizeMeasuring) {
                    this._sizeMeasuring = false;
                }
                let windowDivStyle = {
                    boxSizing: 'border-box',
                    position: 'absolute',
                    left: this.state.layout.left + 'px',
                    top: this.state.layout.top + 'px',
                    touchAction: 'none'
                };
                if (typeof this.state.layout.width === 'number') {
                    windowDivStyle.width = this.state.layout.width + 'px';
                }
                else if (typeof this.state.layout.width === 'string') {
                    windowDivStyle.width = this.state.layout.width;
                }
                if (typeof this.state.layout.height === 'number') {
                    windowDivStyle.height = this.state.layout.height + 'px';
                }
                else if (typeof this.state.layout.height === 'string') {
                    windowDivStyle.height = this.state.layout.height;
                }
                return React.createElement("div", { className: [domui_1.css.flexColumn, this.props.borderless ? exports.css.borderlessWindowDiv : exports.css.defaultWindowDiv].join(' '), style: windowDivStyle, ref: this.rref.container, onPointerDown: () => {
                        if (this.state.activateTime >= 0 && !this.props.disableUserInputActivate)
                            this.activate();
                    } },
                    this.props.borderless ? null : this.renderTitle(),
                    [
                        this.renderContent(),
                        (this.props.borderless) ? null : this.renderResizeHandler()
                    ]);
            }
            catch (err) {
                return React.createElement("div", null, err.message + err.stack);
            }
        }
        componentDidUpdate(previousProps, previousState, snapshot) {
            this.props.onComponentDidUpdate?.();
        }
        render(props, state, context) {
            return React.createElement(domui_1.FloatLayerComponent, { activateTime: this.state.activateTime }, this.renderWindowMain());
        }
    }
    exports.DefaultWindowComponent = DefaultWindowComponent;
    DefaultWindowComponent.defaultProps = {
        closeIcon: (0, index1_1.getIconUrl)('x.svg'),
        maximize: (0, index1_1.getIconUrl)('maximize-2.svg'),
        title: 'untitled'
    };
    exports.WindowComponent = DefaultWindowComponent;
    function setDefaultWindowComponentImplemention(impl) {
        exports.WindowComponent = impl;
    }
    class WindowsList extends React.Component {
        constructor(prop, ctx) {
            super(prop, ctx);
            this.container = new domui_1.ReactRefEx();
            this.onResize = new Set();
            this.resizeObserver = new ResizeObserver((ent) => {
                for (let t1 of this.onResize) {
                    t1();
                }
            });
            this.setState({ floatWindowVNodes: [] });
        }
        async componentDidMount() {
            this.resizeObserver.observe(await this.container.waitValid());
        }
        async componentWillUnmount() {
            this.resizeObserver.disconnect();
        }
        render(props, state, context) {
            return React.createElement("div", { style: { width: '100%', height: '100%', ...this.props.divStyle }, ref: this.container }, this.state.floatWindowVNodes);
        }
        appendFloatWindow(window, active) {
            active = active ?? true;
            window.props.windowsList = this;
            let ref2 = new domui_1.ReactRefEx().forward([window.ref].filter(v => v != undefined));
            window.ref = ref2;
            if (window.key == undefined) {
                window.key = (0, base_1.GenerateRandomString)();
            }
            this.state.floatWindowVNodes.push(window);
            if (active) {
                ref2.waitValid().then((v) => {
                    if (v instanceof exports.WindowComponent) {
                        v.activate();
                    }
                });
            }
            ;
            this.forceUpdate();
        }
        removeFloatWindow(window) {
            let index = this.state.floatWindowVNodes.findIndex(v => v === window);
            if (index >= 0) {
                this.state.floatWindowVNodes.splice(index, 1);
                this.forceUpdate();
            }
        }
    }
    exports.WindowsList = WindowsList;
    exports.rootWindowsList = new domui_1.ReactRefEx();
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
            (0, domui_1.ReactRender)(React.createElement(WindowsList, { ref: exports.rootWindowsList }), windowDomRootComponent);
            //To fix bug in EDGE --app mode
            document.body.style.overflow = 'hidden';
        }
    }
    function appendFloatWindow(window, active) {
        ensureRootWindowContainer();
        exports.rootWindowsList.current?.appendFloatWindow(window, active);
    }
    function removeFloatWindow(window) {
        ensureRootWindowContainer();
        exports.rootWindowsList.current?.removeFloatWindow(window);
    }
    async function windowsContainerForceUpdate() {
        ensureRootWindowContainer();
        return new Promise((resolve) => exports.rootWindowsList.current?.forceUpdate(resolve));
    }
    function getFloatWindowVNodeList() {
        ensureRootWindowContainer();
        return exports.rootWindowsList.current?.state.floatWindowVNodes ?? [];
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
