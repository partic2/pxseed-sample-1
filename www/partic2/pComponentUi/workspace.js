define(["require", "exports", "preact", "./domui", "partic2/jsutils1/base", "./window"], function (require, exports, React, domui_1, base_1, window_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TabView = exports.TabInfoBase = exports.openNewWindow = void 0;
    exports.setOpenNewWindowImpl = setOpenNewWindowImpl;
    let openNewWindow = async function (contentVNode, options) {
        let closeFuture = new base_1.future();
        let windowVNode = React.createElement(window_1.WindowComponent, { onClose: () => closeFuture.setResult(true), title: options?.title }, contentVNode);
        (0, window_1.appendFloatWindow)(windowVNode, true);
        return {
            onClose: async function () {
                await closeFuture.get();
                this.close();
                return;
            },
            close: function () { (0, window_1.removeFloatWindow)(windowVNode); }
        };
    };
    exports.openNewWindow = openNewWindow;
    function setOpenNewWindowImpl(impl) {
        exports.openNewWindow = impl;
    }
    class TabInfoBase {
        constructor() {
            this.id = '';
            this.title = '';
            this.container = new base_1.Ref2(null);
        }
        renderPage() {
            throw new Error('Not Implemented');
        }
        async onClose() {
            return true;
        }
        async init(initval) {
            for (let k in initval) {
                this[k] = initval[k];
            }
            return this;
        }
        async requestPageViewUpdate() {
            let tabView = this.container.get();
            if (tabView != null) {
                return new Promise(r => tabView.forceUpdate(r));
            }
            else {
                return new Promise(r => r());
            }
        }
    }
    exports.TabInfoBase = TabInfoBase;
    var eventProcessed = Symbol('eventProcessed');
    class TabView extends React.Component {
        addTab(tabInfo) {
            let foundIndex = this.state.tabs.findIndex(v => v.id == tabInfo.id);
            if (foundIndex < 0) {
                tabInfo.container.set(this);
                this.state.tabs.push(tabInfo);
            }
            else {
                tabInfo.container.set(this);
                this.state.tabs.splice(foundIndex, 1, tabInfo);
            }
            this.forceUpdate();
        }
        getTabs() {
            return this.state.tabs;
        }
        openTab(id) {
            if (this.state.tabs.find(v => v.id == id) != undefined) {
                this.setState({ currTab: id }, () => {
                    this.props.onTabActive?.(id);
                });
            }
        }
        async closeTab(id) {
            let t1 = this.state.tabs.findIndex((v) => v.id == id);
            if (t1 >= 0) {
                let toClose = this.state.tabs[t1];
                if (toClose.onClose) {
                    let confirm = await toClose.onClose();
                    if (!confirm) {
                        //abort
                        return;
                    }
                }
                this.state.tabs.splice(t1, 1);
                if (toClose.id === this.state.currTab) {
                    if (t1 >= this.state.tabs.length) {
                        t1 = this.state.tabs.length - 1;
                    }
                    if (t1 >= 0) {
                        this.setState({ currTab: this.state.tabs[t1].id });
                    }
                    else {
                        this.setState({ currTab: '' });
                    }
                }
                else {
                    this.forceUpdate();
                }
            }
        }
        onTabClick(ev, tab) {
            if (ev[eventProcessed]) {
                return;
            }
            this.openTab(tab.id);
        }
        renderTabs() {
            return this.state.tabs.map(v => React.createElement("div", { className: [
                    domui_1.css.selectable, domui_1.css.simpleCard,
                    this.state.currTab == v.id ? domui_1.css.selected : ''
                ].join(' '), onClick: (ev) => this.onTabClick(ev, v) },
                v.title,
                "\u00A0",
                React.createElement("a", { href: "javascript:;", onClick: (ev) => {
                        ev[eventProcessed] = true;
                        this.closeTab(v.id);
                    } }, "X")));
        }
        getCurrentTab() {
            return this.state.tabs.find(v => v.id === this.state.currTab);
        }
        constructor(props, ctx) {
            super(props, ctx);
            this.rref = {
                tabContainer: React.createRef()
            };
            this.setState({ currTab: '', tabs: [] });
        }
        render(props, state, context) {
            return React.createElement("div", { className: domui_1.css.flexColumn, style: { height: '100%' } },
                React.createElement("div", { className: domui_1.css.flexRow }, this.renderTabs()),
                this.state.tabs.map(tab => {
                    if (tab.id === this.state.currTab) {
                        return React.createElement("div", { key: 'tabid:' + tab.id, style: { flexGrow: 1, display: 'flex', minHeight: 0, overflow: 'auto' }, ref: this.rref.tabContainer }, tab.renderPage());
                    }
                    else {
                        return React.createElement("div", { key: 'tabid:' + tab.id, style: { display: 'none' } }, tab.renderPage());
                    }
                }));
        }
        componentDidUpdate(previousProps, previousState, snapshot) {
            this.getCurrentTab()?.onRendered?.();
        }
    }
    exports.TabView = TabView;
});
//# sourceMappingURL=workspace.js.map