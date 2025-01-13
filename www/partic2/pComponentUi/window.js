define(["require", "exports", "preact", "./domui", "partic2/jsutils1/base", "./domui", "./transform", "partic2/pxseedMedia1/index1"], function (require, exports, React, domui_1, base_1, domui_2, transform_1, index1_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.WindowComponent = void 0;
    exports.appendFloatWindow = appendFloatWindow;
    exports.removeFloatWindow = removeFloatWindow;
    exports.alert = alert;
    exports.confirm = confirm;
    exports.prompt = prompt;
    class WindowComponent extends React.Component {
        constructor(props, ctx) {
            super(props, ctx);
            this.layerTransformer = new transform_1.TransformHelper();
            this.rref = {
                container: new domui_1.ReactRefEx()
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
            this.setState({ activeTime: -1, folded: false, layout: { left: 0, top: 0 } });
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
            let wndWidth = window.innerWidth;
            let wndHeight = window.innerHeight;
            if (width > wndWidth - 5)
                width = wndWidth - 5;
            if (height > wndHeight - 5)
                height = wndHeight - 5;
            let left = (wndWidth - width) >> 1;
            let top = (wndHeight - height) >> 1;
            await new Promise((resolve) => {
                this.setState({ layout: { left: left, top: top, width: width, height: height } }, () => resolve(null));
            });
            //check if scroll bar still appear?
        }
        renderIcon(url, onClick) {
            if (url == null) {
                return null;
            }
            if (url.indexOf(':') >= 0) {
                return React.createElement("div", { className: domui_2.css.simpleCard, onClick: onClick },
                    React.createElement("img", { src: url, width: '16', height: '16' }));
            }
            else {
                return React.createElement("div", { className: domui_2.css.simpleCard, onClick: onClick, style: { userSelect: 'none' } }, url);
            }
        }
        active() {
            if (this.state.activeTime < 0 && ['initial center', 'keep center'].indexOf(this.props.position) >= 0) {
                this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() }, () => {
                    this.makeCenter();
                });
            }
            else {
                this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() });
            }
        }
        hide() {
            this.setState({ activeTime: -1 });
        }
        isFolded() {
            return this.state.folded;
        }
        setFolded(v) {
            this.setState({ folded: v });
        }
        renderTitle() {
            return React.createElement("div", { className: domui_2.css.flexRow, style: { borderBottom: 'solid black 1px', alignItems: 'center', backgroundColor: '#f88' } },
                React.createElement("div", { style: { flexGrow: '1', cursor: 'move', userSelect: 'none' }, onMouseDown: this.__onTitleMouseDownHandler, onTouchStart: this.__onTitleTouchDownHandler }, (this.props.title ?? '').replace(/ /g, String.fromCharCode(160))),
                "\u00A0",
                this.state.folded ?
                    this.renderIcon(this.props.expandIcon, () => this.onExpandClick()) :
                    this.renderIcon(this.props.foldIcon, () => this.onFoldClick()),
                this.renderIcon(this.props.closeIcon, () => this.onCloseClick()));
        }
        onFoldClick() {
            this.setState({ folded: true });
        }
        onExpandClick() {
            this.setState({ folded: false });
        }
        onCloseClick() {
            this.hide();
            this.props.onClose?.();
        }
        doRelayout() {
            if (this.props.position === 'keep center') {
                this.makeCenter();
            }
        }
        renderWindowMain() {
            let windowDivStyle = {
                border: 'solid black 1px',
                position: 'absolute',
                left: this.state.layout.left + 'px',
                top: this.state.layout.top + 'px',
            };
            if (this.props.position === 'static') {
                windowDivStyle.position = 'static';
            }
            if (this.state.layout.width != undefined && !this.state.folded) {
                windowDivStyle.width = this.state.layout.width + 'px';
            }
            if (this.state.layout.height != undefined && !this.state.folded) {
                windowDivStyle.height = this.state.layout.height + 'px';
            }
            let contentDivStyle = {};
            if (this.state.folded) {
                contentDivStyle.display = 'none';
            }
            return React.createElement("div", { className: domui_2.css.flexColumn, style: windowDivStyle, ref: this.rref.container, onMouseDown: () => {
                    if (this.state.activeTime >= 0)
                        this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() });
                }, onTouchStart: () => {
                    if (this.state.activeTime >= 0)
                        this.setState({ activeTime: (0, base_1.GetCurrentTime)().getTime() });
                } },
                this.renderTitle(),
                [
                    React.createElement("div", { style: { overflow: 'auto', ...contentDivStyle } }, this.props.children),
                    this.state.folded ? null : React.createElement("img", { src: (0, index1_1.getIconUrl)('arrow-down-right.svg'), style: {
                            position: 'absolute', cursor: 'nwse-resize',
                            right: '0px', bottom: '0px',
                            backgroundColor: 'white'
                        }, onMouseDown: this.__onResizeIconMouseDownHandler, onTouchStart: this.__onResizeIconTouchDownHandler, width: "12", height: "12" })
                ]);
        }
        render(props, state, context) {
            if (this.props.position === 'static') {
                return React.createElement("div", null, this.renderWindowMain());
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
        title: 'untitled',
        position: 'initial center'
    };
    let floatWindowContainer = null;
    function ensureFloatWindowContainer() {
        if (floatWindowContainer == null) {
            floatWindowContainer = document.createElement('div');
            document.body.appendChild(floatWindowContainer);
        }
        return floatWindowContainer;
    }
    let floatWindowVNodes = [];
    function appendFloatWindow(window, active) {
        active = active ?? true;
        let ref2 = new domui_1.ReactRefEx().forward([window.ref].filter(v => v != undefined));
        window.ref = ref2;
        if (window.key == undefined) {
            window.key = (0, base_1.GenerateRandomString)();
        }
        ensureFloatWindowContainer();
        floatWindowVNodes.push(window);
        (0, domui_1.ReactRender)(floatWindowVNodes, floatWindowContainer);
        if (active) {
            ref2.waitValid().then((v) => v.active());
        }
    }
    function removeFloatWindow(window) {
        new base_1.ArrayWrap2(floatWindowVNodes).removeFirst(v => v === window);
        (0, domui_1.ReactRender)(floatWindowVNodes, floatWindowContainer);
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
            React.createElement("div", { style: { backgroundColor: '#FFF', minWidth: Math.min(window.innerWidth - 10, 300) } },
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
            React.createElement("div", { style: { backgroundColor: '#FFF', minWidth: Math.min(window.innerWidth - 10, 300) } },
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