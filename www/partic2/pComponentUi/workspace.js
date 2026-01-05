define(["require", "exports", "preact", "./domui", "./window", "partic2/jsutils1/base", "./window", "partic2/pxseedMedia1/index1", "partic2/jsutils1/webutils", "partic2/CodeRunner/jsutils2"], function (require, exports, React, domui_1, window_1, base_1, window_2, index1_1, webutils_1, jsutils2_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.openNewWindow = exports.WorkspaceWindowContext = exports.NewWindowHandleLists = void 0;
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
    let openNewWindow = async function (contentVNode, options) {
        options = options ?? {};
        let closeFuture = new base_1.future();
        let windowRef = new domui_1.ReactRefEx();
        let handle = {
            ...options,
            waitClose: async function () {
                await closeFuture.get();
            },
            close: function () {
                for (let t1 of this.children) {
                    t1.close();
                }
                (0, window_2.removeFloatWindow)(windowVNode);
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
            async saveWindowPosition() {
                config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
                config1.savedWindowLayout[options.layoutHint] = { time: (0, base_1.GetCurrentTime)().getTime(), ...(await windowRef.waitValid()).state.layout };
                await (0, webutils_1.SavePersistentConfig)(__name__);
            },
            async forgetWindowPosition() {
                config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
                delete config1.savedWindowLayout[options.layoutHint];
                await (0, webutils_1.SavePersistentConfig)(__name__);
            },
            windowRef, windowVNode: null,
            children: new Set()
        };
        config1 = await (0, webutils_1.GetPersistentConfig)(__name__);
        if (config1.savedWindowLayout == undefined) {
            config1.savedWindowLayout = {};
        }
        ;
        let layout1 = null;
        if (options.layoutHint != undefined && config1.savedWindowLayout[options.layoutHint] != undefined) {
            layout1 = (0, base_1.partial)(config1.savedWindowLayout[options.layoutHint], ['left', 'top', 'width', 'height']);
            config1.savedWindowLayout[options.layoutHint].time = (0, base_1.GetCurrentTime)().getTime();
            await (0, webutils_1.SavePersistentConfig)(__name__);
        }
        let allEnt = Array.from(Object.entries(config1.savedWindowLayout));
        if (allEnt.length > 100) {
            allEnt.sort((a, b) => (a[1].time ?? 0) - (b[1].time ?? 0));
            for (let t1 = 0; allEnt.length - 100; t1++) {
                delete config1.savedWindowLayout[allEnt[t1][0]];
            }
            await (0, webutils_1.SavePersistentConfig)(__name__);
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
        let onWindowLayooutChange = null;
        let windowVNode = React.createElement(window_2.WindowComponent, { ref: windowRef, onClose: async () => {
                for (let t1 of exports.NewWindowHandleLists.value) {
                    if (t1.parentWindow === handle) {
                        t1.close();
                    }
                }
                closeFuture.setResult(true);
                (0, window_2.removeFloatWindow)(windowVNode);
                let at = exports.NewWindowHandleLists.value.indexOf(handle);
                if (at >= 0)
                    exports.NewWindowHandleLists.value.splice(at, 1);
                exports.NewWindowHandleLists.dispatchEvent(new Event('change'));
                if (onWindowLayooutChange != null) {
                    let window1 = await windowRef.waitValid();
                    window1.removeEventListener('move', onWindowLayooutChange);
                    window1.removeEventListener('resize', onWindowLayooutChange);
                }
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
        exports.NewWindowHandleLists.dispatchEvent(new Event('change'));
        let window1 = await windowRef.waitValid();
        window1.setState({ layout: { ...layout1 } });
        if (options.layoutHint != undefined) {
            let saveLayout = new jsutils2_1.DebounceCall(handle.saveWindowPosition, 3000);
            onWindowLayooutChange = () => {
                saveLayout.call();
            };
            window1.addEventListener('move', onWindowLayooutChange);
            window1.addEventListener('resize', onWindowLayooutChange);
        }
        return handle;
    };
    exports.openNewWindow = openNewWindow;
    let baseWindowComponnet = null;
    let baseWindowRef = new domui_1.ReactRefEx();
    function setBaseWindowView(vnode) {
        if (baseWindowComponnet != null) {
            (0, window_2.removeFloatWindow)(baseWindowComponnet);
        }
        baseWindowComponnet = vnode;
        (0, window_2.appendFloatWindow)(React.createElement(window_2.WindowComponent, { disableUserInputActivate: true, noTitleBar: true, noResizeHandle: true, windowDivClassName: window_1.css.borderlessWindowDiv, ref: baseWindowRef, initialLayout: { left: 0, top: 0, width: '100%', height: '100%' } }, vnode));
        baseWindowRef.waitValid().then((wnd) => wnd.activate(1));
    }
    function setOpenNewWindowImpl(impl) {
        exports.openNewWindow = impl;
    }
});
//# sourceMappingURL=workspace.js.map