define("partic2/pComponentUi/workspace", ["require", "exports", "preact", "./domui", "./window", "partic2/jsutils1/base", "./window", "partic2/pxseedMedia1/index1", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2"], function (require, exports, React, domui_1, window_1, base_1, window_2, index1_1, webutils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultDialogBoxImplemention = exports.openNewWindow = exports.openNewWindowPipeline = exports.WorkspaceWindowComponent = exports.WorkspaceWindowUtils = exports.DefaultWorkspaceWindowComponent = exports.WorkspaceWindowContext = exports.NewWindowHandleLists = void 0;
    exports.setBaseWindowView = setBaseWindowView;
    exports.setOpenNewWindowImpl = setOpenNewWindowImpl;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    class CNewWindowHandleLists extends EventTarget {
        constructor() {
            super(...arguments);
            this.value = new Array();
        }
    }
    exports.NewWindowHandleLists = new CNewWindowHandleLists();
    let config1 = {};
    exports.WorkspaceWindowContext = React.createContext({});
    class DefaultWorkspaceWindowComponent extends window_2.WindowComponent {
        constructor() {
            super(...arguments);
            this.beforeMaximizeSize = null;
            this.__onAnyUserLayout = () => { this.beforeMaximizeSize = null; };
        }
        async onMaximizeClick() {
            await this.setMaximized(!this.getMaximized());
        }
        getMaximized() {
            return this.beforeMaximizeSize != null;
        }
        componentDidMount() {
            super.componentDidMount();
            this.addEventListener('user-move', this.__onAnyUserLayout);
            this.addEventListener('user-resize', this.__onAnyUserLayout);
        }
        componentWillUnmount() {
            this.removeEventListener('user-move', this.__onAnyUserLayout);
            this.removeEventListener('user-resize', this.__onAnyUserLayout);
            super.componentWillUnmount();
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
        renderTitleIcons() {
            return [
                ...(this.state.titleBarButton ?? []).map(t1 => this.renderIcon(t1.icon, t1.onClick)),
                this.renderIcon((0, index1_1.getIconUrl)('maximize-2.svg'), () => this.onMaximizeClick()),
                this.renderIcon(this.props.closeIcon, () => this.onCloseClick())
            ];
        }
    }
    exports.DefaultWorkspaceWindowComponent = DefaultWorkspaceWindowComponent;
    exports.WorkspaceWindowUtils = {
        async centerWindow(windowComponent) {
            if (windowComponent.props.windowsList?.container.current != null) {
                for (let t1 = 0; t1 < 40; t1++) {
                    let wndWidth = (windowComponent.props.windowsList.container.current.offsetWidth) ?? 0;
                    let wndHeight = (windowComponent.props.windowsList.container.current.offsetHeight) ?? 0;
                    let width = windowComponent.rref.container.current?.offsetWidth ?? 0;
                    let height = windowComponent.rref.container.current?.offsetHeight ?? 0;
                    if (width > wndWidth - 5)
                        width = wndWidth - 5;
                    if (height > wndHeight - 5)
                        height = wndHeight - 5;
                    let left = (wndWidth - width) >> 1;
                    let top = (wndHeight - height) >> 1;
                    if (left != windowComponent.state.layout.left || top != windowComponent.state.layout.top) {
                        await new Promise((resolve) => {
                            windowComponent.setState({ layout: { ...windowComponent.state.layout, left: left, top: top } }, () => resolve(null));
                        });
                    }
                    if (!windowComponent.sizeMeasuring.get())
                        break;
                    await (0, base_1.sleep)(25);
                }
            }
        }
    };
    exports.WorkspaceWindowComponent = DefaultWorkspaceWindowComponent;
    exports.openNewWindowPipeline = new jsutils2_1.ArrayWrap3();
    exports.openNewWindowPipeline.arr().push({ name: __name__ + '.openNewWindowCreateWindow', handler: async (context) => {
            let options = context.request;
            let contentVNode = context.contentVNode;
            let closeFuture = new base_1.future();
            let windowRef = new domui_1.ReactRefEx();
            let handle = {
                ...options,
                waitClose: async function () {
                    await closeFuture.get();
                },
                close: async function () {
                    if (!closeFuture.done) {
                        closeFuture.setResult(true);
                        (0, window_2.removeFloatWindow)(windowVNode);
                        exports.NewWindowHandleLists.dispatchEvent(new Event('change'));
                        for (let t1 of this.children) {
                            t1.close();
                        }
                        let at = exports.NewWindowHandleLists.value.indexOf(handle);
                        if (at >= 0)
                            exports.NewWindowHandleLists.value.splice(at, 1);
                    }
                },
                async activate() {
                    (await this.windowRef.waitValid()).activate();
                    for (let t1 of this.children) {
                        await t1.activate();
                    }
                },
                async hide() {
                    for (let t1 of this.children) {
                        await t1.hide();
                    }
                    (await this.windowRef.waitValid()).hide();
                },
                async isHidden() {
                    return (await this.windowRef.waitValid()).isHidden();
                },
                async forgetWindowPosition() {
                    config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
                    delete config1.savedWindowLayout[options.layoutHint];
                    await (0, webutils_1.SavePersistentConfig)(__name__, config1);
                },
                windowRef, windowVNode: null,
                children: new Set()
            };
            let WindowComponentClass = options.WindowComponentClass ?? exports.WorkspaceWindowComponent;
            let windowVNode = React.createElement(WindowComponentClass, { ref: windowRef, onClose: async () => {
                    handle.close();
                }, onComponentDidUpdate: () => {
                    exports.NewWindowHandleLists.dispatchEvent(new Event('change'));
                }, titleBarButton: [{
                        icon: (0, index1_1.getIconUrl)('minus.svg'),
                        onClick: async () => handle.hide()
                    }], title: options.title, ...(options.windowOptions ?? {}) },
                React.createElement(exports.WorkspaceWindowContext.Provider, { value: { lastWindow: handle } }, contentVNode));
            handle.windowVNode = windowVNode;
            (0, window_2.appendFloatWindow)(windowVNode, true);
            exports.NewWindowHandleLists.value.push(handle);
            if (options.parentWindow != undefined) {
                options.parentWindow.children.add(handle);
            }
            context.result = handle;
            exports.NewWindowHandleLists.dispatchEvent(new Event('change'));
        } });
    exports.openNewWindowPipeline.arr().push({ name: __name__ + '.openNewWindowLayoutWindow', handler: async (context) => {
            let options = context.request;
            config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
            if (config1.savedWindowLayout == undefined) {
                config1.savedWindowLayout = {};
            }
            ;
            let layout1 = null;
            if (options.layoutHint != undefined && config1.savedWindowLayout[options.layoutHint] != undefined) {
                layout1 = (0, base_1.partial)(config1.savedWindowLayout[options.layoutHint], ['left', 'top', 'width', 'height']);
                config1.savedWindowLayout[options.layoutHint].time = (0, base_1.GetCurrentTime)().getTime();
                await (0, webutils_1.SavePersistentConfig)(__name__, config1);
            }
            if (layout1 == null) {
                layout1 = { top: 0, left: 0 };
                for (let t1 = 0; t1 < window.innerHeight / 2; t1 += 20) {
                    let crowded = false;
                    for (let t2 of exports.NewWindowHandleLists.value) {
                        if (t2.windowRef.current != null) {
                            let top = t2.windowRef.current.state.layout.top;
                            if (top >= t1 - 10 && top < t1 + 10) {
                                crowded = true;
                                break;
                            }
                        }
                    }
                    if (!crowded) {
                        layout1.top = t1;
                        layout1.left = t1 / 2;
                        break;
                    }
                }
            }
            let windowRef = context.result.windowRef;
            let window1 = await windowRef.waitValid();
            window1.setState({ layout: { ...layout1 } });
            if (options.layoutHint != undefined) {
                context.result.saveWindowPosition = async () => {
                    config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
                    if (config1.savedWindowLayout == undefined)
                        config1.savedWindowLayout = {};
                    config1.savedWindowLayout[options.layoutHint] = { time: (0, base_1.GetCurrentTime)().getTime(), ...(await windowRef.waitValid()).state.layout };
                    let allEnt = Array.from(Object.entries(config1.savedWindowLayout));
                    if (allEnt.length > 16) {
                        allEnt.sort((a, b) => (a[1].time ?? 0) - (b[1].time ?? 0));
                        for (let t1 = 0; allEnt.length - 16; t1++) {
                            delete config1.savedWindowLayout[allEnt[t1][0]];
                        }
                    }
                    await (0, webutils_1.SavePersistentConfig)(__name__, config1);
                };
                let saveLayout = new jsutils2_1.DebounceCall(() => context.result.saveWindowPosition(), 3000);
                let onWindowLayoutChange = () => { saveLayout.call(); };
                window1.addEventListener('move', onWindowLayoutChange);
                window1.addEventListener('resize', onWindowLayoutChange);
                context.result.waitClose().then(() => {
                    window1.removeEventListener('move', onWindowLayoutChange);
                    window1.removeEventListener('resize', onWindowLayoutChange);
                });
            }
        } });
    let openNewWindow = async function (contentVNode, options) {
        let context = { contentVNode, request: options ?? {}, result: null };
        let handlers = exports.openNewWindowPipeline.arr();
        for (let t1 of handlers) {
            await t1.handler(context);
        }
        (0, base_1.assert)(context.result != null);
        return context.result;
    };
    exports.openNewWindow = openNewWindow;
    let baseWindowComponnet = null;
    let baseWindowRef = new domui_1.ReactRefEx();
    const onRootWindowsListResize = () => {
        if (baseWindowRef.current != null) {
            baseWindowRef.current.setState({ layout: { left: 0, top: 0,
                    width: window_1.rootWindowsList.current?.container?.current?.offsetWidth,
                    height: window_1.rootWindowsList.current?.container?.current?.offsetHeight
                } });
        }
    };
    function setBaseWindowView(vnode) {
        (0, window_1.ensureRootWindowContainer)();
        if (baseWindowComponnet != null) {
            (0, window_2.removeFloatWindow)(baseWindowComponnet);
        }
        baseWindowComponnet = vnode;
        (0, window_2.appendFloatWindow)(React.createElement(window_2.WindowComponent, { disableUserInputActivate: true, borderless: true, ref: baseWindowRef, initialLayout: { left: 0, top: 0,
                width: window_1.rootWindowsList.current?.container?.current?.offsetWidth,
                height: window_1.rootWindowsList.current?.container?.current?.offsetHeight } }, vnode));
        window_1.rootWindowsList.waitValid().then((wndList) => {
            if (!wndList.onResize.has(onRootWindowsListResize)) {
                wndList.onResize.add(onRootWindowsListResize);
            }
        });
        baseWindowRef.waitValid().then((wnd) => wnd.activate(1));
    }
    function setOpenNewWindowImpl(impl) {
        exports.openNewWindow = impl;
    }
    let i18n = {
        caution: '',
        ok: '',
        cancel: '',
        dialogBox: ''
    };
    window_1.language.watch((r) => {
        let lang = r.get();
        if (lang === 'zh-CN') {
            i18n.caution = '提醒';
            i18n.ok = '确认';
            i18n.cancel = '取消';
            i18n.dialogBox = '对话框';
        }
        else {
            i18n.caution = 'caution';
            i18n.ok = 'ok';
            i18n.cancel = 'cancel';
            i18n.dialogBox = 'dialog box';
        }
    });
    window_1.language.set(window_1.language.get());
    let dialogContainer = null;
    exports.NewWindowHandleLists.addEventListener('change', (ev) => {
        if (dialogContainer != null) {
            let hasDialog = exports.NewWindowHandleLists.value.some(t1 => t1.parentWindow == dialogContainer);
            if (!hasDialog) {
                dialogContainer.close();
                dialogContainer = null;
            }
        }
    });
    exports.defaultDialogBoxImplemention = {
        async alert(message, title) {
            if (dialogContainer == null) {
                dialogContainer = await (0, exports.openNewWindow)(React.createElement("div", null), { windowOptions: { borderless: true }, title: i18n.dialogBox });
            }
            let result = new base_1.future();
            let newWnd = await (0, exports.openNewWindow)(React.createElement("div", { style: { width: '100%', height: '100%', minWidth: Math.min((window_1.rootWindowsList.current?.container.current?.offsetWidth) ?? 0 - 10, 300), whiteSpace: 'pre-wrap' } },
                message,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }))), { title: title ?? i18n.caution, parentWindow: dialogContainer });
            newWnd.waitClose().then(() => result.setResult('closed'));
            exports.WorkspaceWindowUtils.centerWindow(await newWnd.windowRef.waitValid());
            let r = await result.get();
            if (r == 'ok') {
                newWnd.close();
            }
        },
        async confirm(message, title) {
            if (dialogContainer == null) {
                dialogContainer = await (0, exports.openNewWindow)(React.createElement("div", null), { windowOptions: { borderless: true }, title: i18n.dialogBox });
            }
            let result = new base_1.future();
            let newWnd = await (0, exports.openNewWindow)(React.createElement("div", { style: { width: '100%', height: '100%', minWidth: Math.min((window_1.rootWindowsList.current?.container.current?.offsetWidth) ?? 0 - 10, 300), whiteSpace: 'pre-wrap' } },
                message,
                React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('cancel'), value: i18n.cancel }))), { title: title ?? i18n.caution, parentWindow: dialogContainer });
            newWnd.waitClose().then(() => result.setResult('closed'));
            exports.WorkspaceWindowUtils.centerWindow(await newWnd.windowRef.waitValid());
            let r = await result.get();
            if (r == 'closed') {
                r = 'cancel';
            }
            else {
                newWnd.close();
            }
            return r;
        },
        async prompt(form, opt) {
            if (dialogContainer == null) {
                dialogContainer = await (0, exports.openNewWindow)(React.createElement("div", null), { windowOptions: { borderless: true }, title: i18n.dialogBox });
            }
            let result = new base_1.future();
            if (typeof opt === 'string') {
                opt = { title: opt };
            }
            if (opt == undefined) {
                opt = {};
            }
            let title = opt.title;
            let newWnd = await (0, exports.openNewWindow)(React.createElement("div", { className: domui_1.css.flexColumn, style: { height: '100%', width: '100%' } },
                form,
                (opt.noButton !== true) ? React.createElement("div", { className: domui_1.css.flexRow },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => {
                            result.setResult('ok');
                            opt?.onButtonClick?.('ok');
                        }, value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => {
                            result.setResult('cancel');
                            opt?.onButtonClick?.('cancel');
                        }, value: i18n.cancel })) : null), { title: title ?? i18n.caution, parentWindow: dialogContainer });
            newWnd.waitClose().then(() => result.setResult('cancel'));
            exports.WorkspaceWindowUtils.centerWindow(await newWnd.windowRef.waitValid());
            return {
                response: result,
                close: () => newWnd.close()
            };
        }
    };
});
