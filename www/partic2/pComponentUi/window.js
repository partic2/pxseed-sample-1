define(["require", "exports", "preact", "./domui", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./transform", "partic2/pxseedMedia1/index1"], function (require, exports, React, domui_1, base_1, webutils_1, transform_1, index1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.rootWindowContainer = exports.WindowComponent = exports.css = void 0;
    exports.ensureRootWindowContainer = ensureRootWindowContainer;
    exports.appendFloatWindow = appendFloatWindow;
    exports.removeFloatWindow = removeFloatWindow;
    exports.alert = alert;
    exports.confirm = confirm;
    exports.prompt = prompt;
    exports.css = {
        defaultWindowDiv: (0, base_1.GenerateRandomString)(),
        borderlessWindowDiv: (0, base_1.GenerateRandomString)(),
        defaultContentDiv: (0, base_1.GenerateRandomString)(),
        defaultTitleStyle: (0, base_1.GenerateRandomString)(),
    };
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultWindowDiv, ['max-height:100vh', 'max-width:100vw', 'border:solid black 1px']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.borderlessWindowDiv, ['max-height:100vh', 'max-width:100vw']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultContentDiv, ['flex-grow:1', 'background-color:white', 'overflow:auto']);
    webutils_1.DynamicPageCSSManager.PutCss('.' + exports.css.defaultTitleStyle, ['background-color:black', 'color:white']);
    class WindowComponent extends React.Component {
        static getDerivedStateFromError(error) {
            return { errorOccured: error };
        }
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                container: new domui_1.ReactRefEx(),
                contentDiv: new domui_1.ReactRefEx()
            };
            this.__wndMove = new transform_1.PointTrace({
                onMove: (curr, start) => {
                    this.setState({ layout: { ...this.state.layout, left: curr.x - start.x, top: curr.y - start.y } });
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
                    this.setState({ layout: { ...this.state.layout, width: curr.x - start.x, height: curr.y - start.y } });
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
            this.__initialLayout = false;
            this.beforeMaximizeSize = null;
            this.setState({ activeTime: -1, folded: false, layout: { left: 0, top: 0 }, errorOccured: null });
        }
        async makeCenter() {
            //wait for layout complete?     
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
            let wndWidth = (exports.rootWindowContainer?.offsetWidth) ?? 0;
            let wndHeight = (exports.rootWindowContainer?.offsetHeight) ?? 0;
            if (width > wndWidth - 5)
                width = wndWidth - 5;
            if (height > wndHeight - 5)
                height = wndHeight - 5;
            let left = (wndWidth - width) >> 1;
            let top = (wndHeight - height) >> 1;
            await new Promise((resolve) => {
                this.setState({ layout: { left: left, top: top } }, () => resolve(null));
            });
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
        active() {
            this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() }, () => {
                if (!this.__initialLayout) {
                    if (['initial center', 'keep center'].indexOf(this.props.position) >= 0) {
                        this.makeCenter();
                    }
                    this.__initialLayout = true;
                }
            });
            globalWindowsList.current?.forceUpdate();
        }
        hide() {
            this.setState({ activeTime: -1 });
            globalWindowsList.current?.forceUpdate();
        }
        isHidden() {
            return this.state.activeTime < 0 && !this.props.keepTop;
        }
        isFolded() {
            return this.state.folded;
        }
        setFolded(v) {
            this.setState({ folded: v });
        }
        renderTitle() {
            return React.createElement("div", { className: [domui_1.css.flexRow, exports.css.defaultTitleStyle].join(' '), style: { alignItems: 'center' } },
                React.createElement("div", { style: { flexGrow: '1', cursor: 'move', userSelect: 'none' }, onMouseDown: this.__onTitleMouseDownHandler, onTouchStart: this.__onTitleTouchDownHandler }, (this.props.title ?? '').replace(/ /g, String.fromCharCode(160))),
                "\u00A0",
                this.renderIcon(this.props.maximize, () => this.onMaximizeClick()),
                this.state.folded ?
                    this.renderIcon(this.props.expandIcon, () => this.onExpandClick()) :
                    this.renderIcon(this.props.foldIcon, () => this.onFoldClick()),
                this.renderIcon(this.props.closeIcon, () => this.onCloseClick()));
        }
        async onFoldClick() {
            this.setState({ folded: true });
        }
        async onExpandClick() {
            this.setState({ folded: false });
        }
        async onCloseClick() {
            this.hide();
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
        doRelayout() {
            if (this.props.position === 'keep center') {
                this.makeCenter();
            }
        }
        renderWindowMain() {
            let windowDivStyle = {
                boxSizing: 'border-box',
                position: 'absolute',
                left: this.state.layout.left + 'px',
                top: this.state.layout.top + 'px',
                pointerEvents: 'auto'
            };
            if (this.state.layout.width != undefined && !this.state.folded) {
                windowDivStyle.width = this.state.layout.width + 'px';
            }
            if (this.state.layout.height != undefined && !this.state.folded) {
                windowDivStyle.height = this.state.layout.height + 'px';
            }
            if (this.props.position == 'fill') {
                windowDivStyle.width = '100%';
                windowDivStyle.height = '100%';
            }
            if (this.props.windowDivInlineStyle != undefined) {
                Object.assign(windowDivStyle, this.props.windowDivInlineStyle);
            }
            let contentDivStyle = {};
            if (this.state.folded) {
                contentDivStyle.display = 'none';
            }
            if (this.props.contentDivInlineStyle != undefined) {
                Object.assign(contentDivStyle, this.props.contentDivInlineStyle);
            }
            return React.createElement("div", { className: [domui_1.css.flexColumn, this.props.windowDivClassName ?? exports.css.defaultWindowDiv].join(' '), style: windowDivStyle, ref: this.rref.container, onMouseDown: () => {
                    if (this.state.activeTime >= 0 && !this.props.disablePassiveActive)
                        this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() });
                }, onTouchStart: () => {
                    if (this.state.activeTime >= 0 && !this.props.disablePassiveActive)
                        this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() });
                } },
                this.props.noTitleBar ? null : this.renderTitle(),
                [
                    React.createElement("div", { style: { ...contentDivStyle }, className: [this.props.contentDivClassName ?? exports.css.defaultContentDiv].join(' '), ref: this.rref.contentDiv }, this.state.errorOccured == null ? this.props.children : React.createElement("pre", { style: { backgroundColor: 'white', color: 'black' } },
                        this.state.errorOccured.message,
                        this.state.errorOccured.stack)),
                    (this.state.folded || this.props.noResizeHandle || this.props.position == 'fill') ? null : React.createElement("img", { src: (0, index1_1.getIconUrl)('arrow-down-right.svg'), style: {
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
            if (this.props.keepTop) {
                return React.createElement("div", { className: domui_1.css.overlayLayer }, this.renderWindowMain());
            }
            else {
                return React.createElement(domui_1.FloatLayerComponent, { activeTime: this.state.activeTime, onLayout: () => this.doRelayout() }, this.renderWindowMain());
            }
        }
    }
    exports.WindowComponent = WindowComponent;
    WindowComponent.defaultProps = {
        closeIcon: (0, index1_1.getIconUrl)('x.svg'),
        foldIcon: (0, index1_1.getIconUrl)('minus.svg'),
        expandIcon: (0, index1_1.getIconUrl)('plus.svg'),
        maximize: (0, index1_1.getIconUrl)('maximize-2.svg'),
        title: 'untitled',
        position: 'initial center'
    };
    exports.rootWindowContainer = null;
    function ensureRootWindowContainer() {
        if (exports.rootWindowContainer == null) {
            let div = new domui_1.DomDivComponent();
            exports.rootWindowContainer = div.getDomElement();
            exports.rootWindowContainer.style.position = 'absolute';
            exports.rootWindowContainer.style.left = '0px';
            exports.rootWindowContainer.style.top = '0px';
            exports.rootWindowContainer.style.width = '100vw';
            exports.rootWindowContainer.style.height = '100vh';
            domui_1.DomRootComponent.addChild(div);
            (0, domui_1.ReactRender)(React.createElement(WindowsList, { ref: globalWindowsList }), exports.rootWindowContainer);
        }
        return exports.rootWindowContainer;
    }
    let floatWindowVNodes = [];
    class WindowsList extends React.Component {
        constructor() {
            super(...arguments);
            this.windowActiveTimeCompare = (t1, t2) => {
                let t3 = t1.current?.state?.activeTime ?? 0;
                let t4 = t2.current?.state?.activeTime ?? 0;
                return t3 - t4;
            };
        }
        render(props, state, context) {
            floatWindowVNodes.sort((t1, t2) => this.windowActiveTimeCompare(t1.ref, t2.ref));
            return floatWindowVNodes;
        }
    }
    let globalWindowsList = new domui_1.ReactRefEx();
    function appendFloatWindow(window, active) {
        active = active ?? true;
        let ref2 = new domui_1.ReactRefEx().forward([window.ref].filter(v => v != undefined));
        window.ref = ref2;
        if (window.key == undefined) {
            window.key = (0, base_1.GenerateRandomString)();
        }
        ensureRootWindowContainer();
        globalWindowsList.current?.forceUpdate();
        floatWindowVNodes.push(window);
        if (active) {
            ref2.waitValid().then((v) => v.active?.());
        }
    }
    function removeFloatWindow(window) {
        new base_1.ArrayWrap2(floatWindowVNodes).removeFirst(v => v === window);
        ensureRootWindowContainer();
        globalWindowsList.current?.forceUpdate();
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
        let floatWindow1 = React.createElement(WindowComponent, { key: (0, base_1.GenerateRandomString)(), title: title ?? i18n.caution, onClose: () => result.setResult(null) },
            React.createElement("div", { style: { backgroundColor: '#FFF', minWidth: Math.min((exports.rootWindowContainer?.offsetWidth) ?? 0 - 10, 300) } },
                message,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult(null), value: i18n.ok }))));
        appendFloatWindow(floatWindow1);
        await result.get();
        removeFloatWindow(floatWindow1);
    }
    async function confirm(message, title) {
        let result = new base_1.future();
        let floatWindow1 = React.createElement(WindowComponent, { key: (0, base_1.GenerateRandomString)(), title: title ?? i18n.caution, onClose: () => result.setResult('cancel') },
            React.createElement("div", { style: { backgroundColor: '#FFF', minWidth: Math.min((exports.rootWindowContainer?.offsetWidth) ?? 0 - 10, 300) } },
                message,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('cancel'), value: i18n.cancel }))));
        appendFloatWindow(floatWindow1);
        let r = await result.get();
        removeFloatWindow(floatWindow1);
        return r;
    }
    async function prompt(form, title) {
        let result = new base_1.future();
        let floatWindow1 = React.createElement(WindowComponent, { title: title ?? i18n.caution, onClose: () => result.setResult('cancel'), key: (0, base_1.GenerateRandomString)() },
            React.createElement("div", { className: domui_1.css.flexColumn },
                form,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('cancel'), value: i18n.cancel }))));
        appendFloatWindow(floatWindow1);
        return {
            answer: result,
            close: () => removeFloatWindow(floatWindow1)
        };
    }
});
//# sourceMappingURL=window.js.map