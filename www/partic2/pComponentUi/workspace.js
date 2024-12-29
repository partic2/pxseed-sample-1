define(["require", "exports", "preact", "./domui", "partic2/jsutils1/base"], function (require, exports, React, domui_1, base_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TabView = exports.TabInfoBase = void 0;
    class TabInfoBase {
        constructor() {
            this.id = '';
            this.title = '';
            this.tabView = new base_1.Ref2(null);
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
    }
    exports.TabInfoBase = TabInfoBase;
    var eventProcessed = Symbol('eventProcessed');
    class TabView extends React.Component {
        addTab(tabInfo) {
            let foundIndex = this.state.tabs.findIndex(v => v.id == tabInfo.id);
            if (foundIndex < 0) {
                tabInfo.tabView.set(this);
                this.state.tabs.push(tabInfo);
            }
            else {
                tabInfo.tabView.set(this);
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