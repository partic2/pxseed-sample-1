define(["require", "exports", "preact", "./domui", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./transform", "partic2/pxseedMedia1/index1"], function (require, exports, React, domui_1, base_1, webutils_1, transform_1, index1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WindowsList = exports.WindowsListContext = exports.WindowComponent = exports.css = void 0;
    exports.ensureRootWindowContainer = ensureRootWindowContainer;
    exports.appendFloatWindow = appendFloatWindow;
    exports.removeFloatWindow = removeFloatWindow;
    exports.windowsContainerForceUpdate = windowsContainerForceUpdate;
    exports.getFloatWindowVNodeList = getFloatWindowVNodeList;
    exports.alert = alert;
    exports.confirm = confirm;
    exports.prompt = prompt;
    exports.css = {
        defaultWindowDiv: (0, base_1.GenerateRandomString)(),
        borderlessWindowDiv: (0, base_1.GenerateRandomString)(),
        defaultContentDiv: (0, base_1.GenerateRandomString)(),
        defaultTitleStyle: (0, base_1.GenerateRandomString)(),
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultWindowDiv, ['border:solid black 1px', 'box-sizing: border-box']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.borderlessWindowDiv, []);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultContentDiv, ['flex-grow:1', 'background-color:white', 'overflow:auto']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultTitleStyle, ['background-color:black', 'color:white']);
    class WindowComponent extends domui_1.ReactEventTarget {
        static getDerivedStateFromError(error) {
            return { errorOccured: error };
        }
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                container: new domui_1.ReactRefEx(),
                contentDiv: new domui_1.ReactRefEx()
            };
            this._triggerResize = () => { this.forceUpdate(); this.dispatchEvent(new Event('resize')); };
            this.__wndMove = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.setState({ layout: { ...this.state.layout, left: curr.x - start.x, top: curr.y - start.y } }, () => this.dispatchEvent(new Event('move')));
                }
            });
            this.__onTitleMouseDownHandler = (evt) => {
                this.__wndMove.start({ x: evt.clientX - this.state.layout.left, y: evt.clientY - this.state.layout.top }, true);
                evt.preventDefault();
            };
            this.__onTitleTouchDownHandler = (evt) => {
                if (evt.touches.length == 1) {
                    this.__wndMove.start({ x: evt.touches.item(0).clientX - this.state.layout.left, y: evt.touches.item(0).clientY - this.state.layout.top }, true);
                    evt.preventDefault();
                }
            };
            this.__wndResize = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.setState({ layout: { ...this.state.layout, width: curr.x - start.x, height: curr.y - start.y } }, () => this.dispatchEvent(new Event('resize')));
                }
            });
            this.__onResizeIconMouseDownHandler = (evt) => {
                this.__wndResize.start({ x: this.state.layout.left, y: this.state.layout.top }, true);
                evt.preventDefault();
            };
            this.__onResizeIconTouchDownHandler = (evt) => {
                if (evt.touches.length == 1) {
                    this.__wndResize.start({ x: this.state.layout.left, y: this.state.layout.top }, true);
                    evt.preventDefault();
                }
            };
            this.beforeMaximizeSize = null;
            this.windowsList = null;
            this.setState({ activateTime: -1, layout: this.props.initialLayout ?? { left: 0, top: 0 }, errorOccured: null });
        }
        componentDidMount() {
            window.addEventListener('resize', this._triggerResize);
        }
        componentWillUnmount() {
            window.removeEventListener('reisze', this._triggerResize);
        }
        async makeCenter() {
            await (async () => {
                let width = 0;
                let height = 0;
                let stableCount = 0;
                for (let t1 = 0; t1 < 100; t1++) {
                    await new Promise(resolve => requestAnimationFrame(resolve));
                    let newWidth = this.rref.container.current?.scrollWidth ?? 0;
                    let newHeight = this.rref.container.current?.scrollHeight ?? 0;
                    if (width != newWidth || height != newHeight) {
                        width = newWidth;
                        height = newHeight;
                        stableCount = 0;
                    }
                    else {
                        stableCount++;
                    }
                    if (stableCount >= 3)
                        break;
                }
            })();
            let width = this.rref.container.current?.scrollWidth ?? 0;
            let height = this.rref.container.current?.scrollHeight ?? 0;
            let wndWidth = (rootWindowsList.current?.container.current?.offsetWidth) ?? 0;
            let wndHeight = (rootWindowsList.current?.container.current?.offsetHeight) ?? 0;
            if (width > wndWidth - 5)
                width = wndWidth - 5;
            if (height > wndHeight - 5)
                height = wndHeight - 5;
            let left = (wndWidth - width) >> 1;
            let top = (wndHeight - height) >> 1;
            if (left != this.state.layout.left || top != this.state.layout.top) {
                await new Promise((resolve) => {
                    this.setState({ layout: { left: left, top: top } }, () => resolve(null));
                });
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
            return React.createElement("div", { className: [domui_1.css.flexRow, exports.css.defaultTitleStyle].join(' '), style: { alignItems: 'center' } },
                React.createElement("div", { style: { flexGrow: '1', cursor: 'move', userSelect: 'none', overflowY: 'auto' }, onMouseDown: this.__onTitleMouseDownHandler, onTouchStart: this.__onTitleTouchDownHandler }, (this.props.title ?? '').replace(/ /g, String.fromCharCode(160))),
                "\u00A0",
                (this.props.titleBarButton ?? []).map(t1 => this.renderIcon(t1.icon, t1.onClick)),
                this.renderIcon(this.props.maximize, () => this.onMaximizeClick()),
                this.renderIcon(this.props.closeIcon, () => this.onCloseClick()));
        }
        async onCloseClick() {
            this.hide();
            this.dispatchEvent(new Event('close'));
            this.props.onClose?.();
        }
        async onMaximizeClick() {
            if (this.beforeMaximizeSize != null) {
                this.setState({ layout: { ...this.beforeMaximizeSize } });
                this.beforeMaximizeSize = null;
            }
            else {
                this.beforeMaximizeSize = { ...this.state.layout };
                let containerDiv = await this.rref.container.waitValid();
                this.setState({ layout: { left: 0, top: 0,
                        width: containerDiv.offsetParent.offsetWidth,
                        height: containerDiv.offsetParent.offsetHeight } });
            }
        }
        renderWindowMain() {
            let windowDivStyle = {
                boxSizing: 'border-box',
                position: 'absolute',
                left: this.state.layout.left + 'px',
                top: this.state.layout.top + 'px',
                pointerEvents: 'auto',
                maxWidth: (window.innerWidth - this.state.layout.left) + 'px',
                maxHeight: (window.innerHeight - this.state.layout.top) + 'px',
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
            if (this.props.windowDivInlineStyle != undefined) {
                Object.assign(windowDivStyle, this.props.windowDivInlineStyle);
            }
            let contentDivStyle = {};
            if (this.props.contentDivInlineStyle != undefined) {
                Object.assign(contentDivStyle, this.props.contentDivInlineStyle);
            }
            return React.createElement("div", { className: [domui_1.css.flexColumn, this.props.windowDivClassName ?? exports.css.defaultWindowDiv].join(' '), style: windowDivStyle, ref: this.rref.container, onMouseDown: () => {
                    if (this.state.activateTime >= 0 && !this.props.disableUserInputActivate)
                        this.activate();
                }, onTouchStart: () => {
                    if (this.state.activateTime >= 0 && !this.props.disableUserInputActivate)
                        this.activate();
                } },
                this.props.noTitleBar ? null : this.renderTitle(),
                [
                    React.createElement("div", { style: { ...contentDivStyle }, className: [this.props.contentDivClassName ?? exports.css.defaultContentDiv].join(' '), ref: this.rref.contentDiv }, this.state.errorOccured == null ? this.props.children : React.createElement("pre", { style: { backgroundColor: 'white', color: 'black' } },
                        this.state.errorOccured.message,
                        this.state.errorOccured.stack)),
                    (this.props.noResizeHandle) ? null : React.createElement("img", { src: (0, index1_1.getIconUrl)('arrow-down-right.svg'), style: {
                            position: 'absolute', cursor: 'nwse-resize',
                            right: '0px', bottom: '0px',
                            backgroundColor: 'white'
                        }, onMouseDown: this.__onResizeIconMouseDownHandler, onTouchStart: this.__onResizeIconTouchDownHandler, width: "12", height: "12" })
                ]);
        }
        componentDidUpdate(previousProps, previousState, snapshot) {
            this.props.onComponentDidUpdate?.();
        }
        render(props, state, context) {
            return React.createElement(domui_1.FloatLayerComponent, { activateTime: this.state.activateTime },
                React.createElement(exports.WindowsListContext.Consumer, null, (value) => { this.windowsList = value; return null; }),
                this.renderWindowMain());
        }
    }
    exports.WindowComponent = WindowComponent;
    WindowComponent.defaultProps = {
        closeIcon: (0, index1_1.getIconUrl)('x.svg'),
        maximize: (0, index1_1.getIconUrl)('maximize-2.svg'),
        title: 'untitled'
    };
    exports.WindowsListContext = React.createContext(null);
    class WindowsList extends React.Component {
        constructor(prop, ctx) {
            super(prop, ctx);
            this.container = new domui_1.ReactRefEx();
            this.setState({ floatWindowVNodes: [] });
        }
        render(props, state, context) {
            return React.createElement(exports.WindowsListContext.Provider, { value: this },
                React.createElement("div", { style: { width: '100%', height: '100%', ...this.props.divStyle }, ref: this.container }, this.state.floatWindowVNodes));
        }
        appendFloatWindow(window, active) {
            active = active ?? true;
            let ref2 = new domui_1.ReactRefEx().forward([window.ref].filter(v => v != undefined));
            window.ref = ref2;
            if (window.key == undefined) {
                window.key = (0, base_1.GenerateRandomString)();
            }
            this.state.floatWindowVNodes.push(window);
            if (active) {
                ref2.waitValid().then((v) => {
                    if (v instanceof WindowComponent) {
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
    let rootWindowsList = new domui_1.ReactRefEx();
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
            domui_1.DomRootComponent.addChild(windowDomRootComponent).then(() => domui_1.DomRootComponent.update());
            (0, domui_1.ReactRender)(React.createElement(WindowsList, { ref: rootWindowsList }), windowDomRootComponent);
        }
    }
    function appendFloatWindow(window, active) {
        ensureRootWindowContainer();
        rootWindowsList.current?.appendFloatWindow(window, active);
    }
    function removeFloatWindow(window) {
        ensureRootWindowContainer();
        rootWindowsList.current?.removeFloatWindow(window);
    }
    async function windowsContainerForceUpdate() {
        ensureRootWindowContainer();
        return new Promise((resolve) => rootWindowsList.current?.forceUpdate(resolve));
    }
    function getFloatWindowVNodeList() {
        ensureRootWindowContainer();
        return rootWindowsList.current?.state.floatWindowVNodes ?? [];
    }
    let i18n = {
        caution: 'caution',
        ok: 'ok',
        cancel: 'cancel'
    };
    if (navigator.language === 'zh-CN') {
        i18n.caution = '提醒';
        i18n.ok = '确认';
        i18n.cancel = '取消';
    }
    async function alert(message, title) {
        let result = new base_1.future();
        let windowRef = new domui_1.ReactRefEx();
        let floatWindow1 = React.createElement(WindowComponent, { key: (0, base_1.GenerateRandomString)(), ref: windowRef, title: title ?? i18n.caution, onClose: () => result.setResult(null) },
            React.createElement("div", { style: { minWidth: Math.min((rootWindowsList.current?.container.current?.offsetWidth) ?? 0 - 10, 300), whiteSpace: 'pre-wrap' } },
                message,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult(null), value: i18n.ok }))));
        appendFloatWindow(floatWindow1);
        windowRef.waitValid().then((w) => w.makeCenter());
        await result.get();
        removeFloatWindow(floatWindow1);
    }
    async function confirm(message, title) {
        let result = new base_1.future();
        let windowRef = new domui_1.ReactRefEx();
        let floatWindow1 = React.createElement(WindowComponent, { key: (0, base_1.GenerateRandomString)(), ref: windowRef, title: title ?? i18n.caution, onClose: () => result.setResult('cancel') },
            React.createElement("div", { style: { minWidth: Math.min((rootWindowsList.current?.container.current?.offsetWidth) ?? 0 - 10, 300), whiteSpace: 'pre-wrap' } },
                message,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('cancel'), value: i18n.cancel }))));
        appendFloatWindow(floatWindow1);
        windowRef.waitValid().then((w) => { w.makeCenter(); });
        let r = await result.get();
        removeFloatWindow(floatWindow1);
        return r;
    }
    async function prompt(form, title) {
        let result = new base_1.future();
        let windowRef = new domui_1.ReactRefEx();
        let floatWindow1 = React.createElement(WindowComponent, { key: (0, base_1.GenerateRandomString)(), ref: windowRef, title: title ?? i18n.caution, onClose: () => result.setResult('cancel') },
            React.createElement("div", { className: domui_1.css.flexColumn },
                form,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('cancel'), value: i18n.cancel }))));
        appendFloatWindow(floatWindow1);
        windowRef.waitValid().then((w) => { w.makeCenter(); });
        return {
            response: result,
            close: () => removeFloatWindow(floatWindow1)
        };
    }
});
//# sourceMappingURL=window.js.map