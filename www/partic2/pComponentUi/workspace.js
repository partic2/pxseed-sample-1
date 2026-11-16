define("partic2/pComponentUi/workspace", ["require", "exports", "preact", "./domui", "./window", "partic2/jsutils1/base", "./window", "partic2/pxseedMedia1/index1", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2"], function (require, exports, React, domui_1, window_1, base_1, window_2, index1_1, webutils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__inited__ = exports.defaultDialogBoxImplemention = exports.openNewWindow = exports.openNewWindowPipeline = exports.WorkspaceWindowComponent = exports.WorkspaceWindowUtils = exports.DefaultWorkspaceWindowComponent = exports.NewWindowHandleLists = exports.css = void 0;
    exports.setBaseWindowView = setBaseWindowView;
    exports.setOpenNewWindowImpl = setOpenNewWindowImpl;
    let __name__ = base_1.requirejs.getLocalRequireModule(require);
    let cssPrefix = __name__.replace(/\//g, '-');
    exports.css = {
        dialogBoxContainer: cssPrefix + '-dialogBoxContainer',
    };
    class CNewWindowHandleLists {
        constructor() {
            this.value = new Array();
            this.onChange = domui_1.JsxClassComponent.defineEventSlot();
        }
    }
    exports.NewWindowHandleLists = new CNewWindowHandleLists();
    let config1 = {};
    class DefaultWorkspaceWindowComponent extends window_1.DefaultWindowComponent {
        constructor() {
            super(...arguments);
            this.beforeMaximizeSize = null;
        }
        async onMaximizeClick() {
            await this.setMaximized(!this.getMaximized());
        }
        getMaximized() {
            return this.beforeMaximizeSize != null;
        }
        componentDidMount() {
            super.componentDidMount();
            this.userMoveEvent.setListener(DefaultWorkspaceWindowComponent.componentClassName, () => { this.beforeMaximizeSize = null; });
            this.userResizeEvent.setListener(DefaultWorkspaceWindowComponent.componentClassName, () => { this.beforeMaximizeSize = null; });
        }
        componentWillUnmount() {
            this.userMoveEvent.clearListener(DefaultWorkspaceWindowComponent.componentClassName);
            this.userResizeEvent.clearListener(DefaultWorkspaceWindowComponent.componentClassName);
            super.componentWillUnmount();
        }
        async setMaximized(maximized) {
            if (maximized) {
                this.beforeMaximizeSize = { ...this.currentLayout };
                let containerDiv = await this.rref.container.waitValid();
                this.layout({ left: 0, top: 0,
                    width: containerDiv.offsetParent.offsetWidth,
                    height: containerDiv.offsetParent.offsetHeight });
            }
            else {
                if (this.beforeMaximizeSize != null) {
                    this.layout({ ...this.beforeMaximizeSize });
                }
                this.beforeMaximizeSize = null;
            }
        }
        renderTitleIcons() {
            return [
                ...(this.titleBarButton ?? []).map(t1 => this.renderIcon(t1.icon, t1.onClick)),
                this.renderIcon((0, index1_1.getIconUrl)('maximize-2.svg'), () => this.onMaximizeClick()),
                this.renderIcon(this.closeIcon, () => this.onCloseClick())
            ];
        }
        hide() {
            super.hide();
            exports.NewWindowHandleLists.onChange.dispatch('hide');
        }
        activate(activateTime) {
            super.activate(activateTime);
            exports.NewWindowHandleLists.onChange.dispatch('show');
        }
    }
    exports.DefaultWorkspaceWindowComponent = DefaultWorkspaceWindowComponent;
    DefaultWorkspaceWindowComponent.componentClassName = __name__ + '.DefaultWorkspaceWindowComponent';
    exports.WorkspaceWindowUtils = {
        async centerWindow(windowComponent) {
            let windowGroup = windowComponent.getAncestorJsxClassComponents({ clazz: window_1.WindowGroup, count: 1 }).at(0);
            if (windowGroup != undefined) {
                for (let t1 = 0; t1 < 40; t1++) {
                    let wndSize = windowGroup.getSize();
                    let width = windowComponent.rref.container.current?.offsetWidth ?? 0;
                    let height = windowComponent.rref.container.current?.offsetHeight ?? 0;
                    if (width > wndSize.width - 5)
                        width = wndSize.width - 5;
                    if (height > wndSize.height - 5)
                        height = wndSize.height - 5;
                    let left = (wndSize.width - width) >> 1;
                    let top = (wndSize.height - height) >> 1;
                    if (left != windowComponent.currentLayout.left || top != windowComponent.currentLayout.top) {
                        await windowComponent.layout({ ...windowComponent.currentLayout, left: left, top: top });
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
                        for (let t1 of this.children) {
                            t1.close();
                        }
                        let at = exports.NewWindowHandleLists.value.indexOf(handle);
                        if (at >= 0)
                            exports.NewWindowHandleLists.value.splice(at, 1);
                        exports.NewWindowHandleLists.onChange.dispatch('remove');
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
                }, titleBarButton: [{
                        icon: (0, index1_1.getIconUrl)('minus.svg'),
                        onClick: async () => handle.hide()
                    }], title: options.title, ...(options.windowOptions ?? {}) }, contentVNode);
            handle.windowVNode = windowVNode;
            (0, window_2.appendFloatWindow)(windowVNode, true);
            if (options.parentWindow != undefined) {
                options.parentWindow.children.add(handle);
            }
            exports.NewWindowHandleLists.value.push(handle);
            exports.NewWindowHandleLists.onChange.dispatch('add');
            context.result = handle;
        } });
    exports.openNewWindowPipeline.arr().push({ name: __name__ + '.openNewWindowLayoutWindow', handler: async (context) => {
            let options = context.request;
            config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
            if (config1.savedWindowLayout == undefined) {
                config1.savedWindowLayout = {};
            }
            ;
            let windowRef = context.result.windowRef;
            let window1 = await windowRef.waitValid();
            if (options.windowOptions?.borderless != true) {
                let layout1 = context.request?.initialLayout ?? null;
                if (layout1 == null && options.layoutHint != undefined && config1.savedWindowLayout[options.layoutHint] != undefined) {
                    layout1 = (0, base_1.objectPickField)(config1.savedWindowLayout[options.layoutHint], ['left', 'top', 'width', 'height']);
                    config1.savedWindowLayout[options.layoutHint].time = (0, base_1.GetCurrentTime)().getTime();
                    await (0, webutils_1.SavePersistentConfig)(__name__, config1);
                }
                if (layout1 == null) {
                    layout1 = { top: 0, left: 0 };
                    for (let t1 = 0; t1 < window.innerHeight / 2; t1 += 20) {
                        let crowded = false;
                        for (let t2 of exports.NewWindowHandleLists.value) {
                            if (t2.windowRef.current != null) {
                                let top = t2.windowRef.current.currentLayout.top;
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
                await window1.layout(layout1);
                if (options.layoutHint != undefined) {
                    context.result.saveWindowPosition = async () => {
                        config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
                        if (config1.savedWindowLayout == undefined)
                            config1.savedWindowLayout = {};
                        config1.savedWindowLayout[options.layoutHint] = { time: (0, base_1.GetCurrentTime)().getTime(), ...(await windowRef.waitValid()).currentLayout };
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
                    let layoutHintTracer = __name__ + '.layoutHintTracer';
                    window1.moveEvent.setListener(layoutHintTracer, () => { saveLayout.call(); });
                    window1.resizeEvent.setListener(layoutHintTracer, () => { saveLayout.call(); });
                    context.result.waitClose().then(() => {
                        window1.moveEvent.clearListener(layoutHintTracer);
                        window1.resizeEvent.clearListener(layoutHintTracer);
                    });
                }
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
    function setBaseWindowView(vnode) {
        (0, window_1.ensureRootWindowContainer)();
        if (baseWindowComponnet != null) {
            (0, window_2.removeFloatWindow)(baseWindowComponnet);
        }
        baseWindowComponnet = vnode;
        (0, window_2.appendFloatWindow)(React.createElement(window_2.WindowComponent, { disableUserInputActivate: true, borderless: true, ref: baseWindowRef }, vnode));
        window_1.rootWindowGroup.waitValid().then((wndGroup) => {
            wndGroup.resizeEvent.setListener(__name__ + '.setBaseWindowView', () => {
                if (baseWindowRef.current != null) {
                    let wndSize = wndGroup.getSize();
                    baseWindowRef.current.layout({
                        left: 0, top: 0,
                        width: wndSize.width,
                        height: wndSize.height
                    });
                }
            });
            baseWindowRef.waitValid().then((baseWindow) => {
                let wndSize = wndGroup.getSize();
                baseWindow.layout({
                    left: 0, top: 0,
                    width: wndSize.width,
                    height: wndSize.height
                });
            });
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
    exports.defaultDialogBoxImplemention = {
        dialogContainerWindow: null,
        async ensureDialogContainerWindowWindow() {
            if (this.dialogContainerWindow == null) {
                //XXX:Should we use mask to prevent user input outside the dialog box?
                this.dialogContainerWindow = await (0, exports.openNewWindow)(React.createElement("div", null), { windowOptions: { borderless: true, disableUserInputActivate: true }, title: i18n.dialogBox });
                exports.NewWindowHandleLists.onChange.setListener(__name__ + '.defaultDialogBoxImplemention.newWindowHandleListsChange', (e) => {
                    this.newWindowHandleListsChange(e);
                });
            }
        },
        newWindowHandleListsChange: function (ev) {
            if (this.dialogContainerWindow != null) {
                let hasDialog = exports.NewWindowHandleLists.value.some(t1 => t1.parentWindow == this.dialogContainerWindow);
                if (!hasDialog) {
                    this.dialogContainerWindow.close();
                    this.dialogContainerWindow = null;
                    exports.NewWindowHandleLists.onChange.clearListener(__name__ + '.defaultDialogBoxImplemention.newWindowHandleListsChange');
                }
            }
        },
        async alertImpl(message, title) {
            await this.ensureDialogContainerWindowWindow();
            let result = new base_1.future();
            let newWnd = await (0, exports.openNewWindow)(React.createElement("div", { className: exports.css.dialogBoxContainer, style: { width: '100%', height: '100%', minWidth: Math.min((window_1.rootWindowGroup.current?.container.current?.offsetWidth) ?? 0 - 10, 300), whiteSpace: 'pre-wrap' } },
                message,
                React.createElement("div", { className: [domui_1.css.flexRow].join(' ') },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }))), { title: title ?? i18n.caution, parentWindow: this.dialogContainerWindow });
            newWnd.waitClose().then(() => result.setResult('closed'));
            exports.WorkspaceWindowUtils.centerWindow(await newWnd.windowRef.waitValid());
            let r = await result.get();
            if (r == 'ok') {
                newWnd.close();
            }
        },
        alert: (...args) => exports.defaultDialogBoxImplemention.alertImpl(...args),
        async confirmImpl(message, title) {
            await this.ensureDialogContainerWindowWindow();
            let result = new base_1.future();
            let newWnd = await (0, exports.openNewWindow)(React.createElement("div", { className: exports.css.dialogBoxContainer, style: { width: '100%', height: '100%', minWidth: Math.min((window_1.rootWindowGroup.current?.container.current?.offsetWidth) ?? 0 - 10, 300), whiteSpace: 'pre-wrap' } },
                message,
                React.createElement("div", { className: [domui_1.css.flexRow].join() },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('ok'), value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => result.setResult('cancel'), value: i18n.cancel }))), { title: title ?? i18n.caution, parentWindow: this.dialogContainerWindow });
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
        confirm: (...args) => exports.defaultDialogBoxImplemention.confirmImpl(...args),
        async promptImpl(form, opt) {
            await this.ensureDialogContainerWindowWindow();
            let result = new base_1.future();
            if (typeof opt === 'string') {
                opt = { title: opt };
            }
            if (opt == undefined) {
                opt = {};
            }
            let title = opt.title;
            let newWnd = await (0, exports.openNewWindow)(React.createElement("div", { className: [domui_1.css.flexColumn, exports.css.dialogBoxContainer].join(' '), style: { height: '100%', width: '100%' } },
                form,
                (opt.noButton !== true) ? React.createElement("div", { className: [domui_1.css.flexRow].join(' ') },
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => {
                            result.setResult('ok');
                            opt?.onButtonClick?.('ok');
                        }, value: i18n.ok }),
                    React.createElement("input", { type: 'button', style: { flexGrow: '1' }, onClick: () => {
                            result.setResult('cancel');
                            opt?.onButtonClick?.('cancel');
                        }, value: i18n.cancel })) : null), { title: title ?? i18n.caution, parentWindow: this.dialogContainerWindow });
            newWnd.waitClose().then(() => result.setResult('cancel'));
            exports.WorkspaceWindowUtils.centerWindow(await newWnd.windowRef.waitValid());
            return {
                response: result,
                close: () => newWnd.close()
            };
        },
        prompt: (...args) => exports.defaultDialogBoxImplemention.promptImpl(...args),
    };
    exports.__inited__ = new Promise(resolve => resolve());
});
