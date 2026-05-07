define("partic2/pComponentUi/transform", ["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./domui"], function (require, exports, base_1, webutils_1, domui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cssAnimation = exports.ReactDragController = exports.PointTrace = void 0;
    class PointTrace {
        constructor(opt) {
            this.opt = opt;
            this.startPos = { x: 0, y: 0 };
            this.currPos = { x: 0, y: 0 };
            this.stopped = true;
            this.__onPointerMove = (ev) => {
                this.currPos.x = ev.clientX;
                this.currPos.y = ev.clientY;
                this.opt.onMove?.(this.currPos, this.startPos);
                if (this.opt.preventDefault) {
                    ev.preventDefault();
                }
            };
            this.__onPointerUp = (ev) => {
                this.stop();
                this.currPos.x = ev.clientX;
                this.currPos.y = ev.clientY;
                this.opt.onStop?.(this.currPos, this.startPos);
                if (this.opt.preventDefault) {
                    ev.preventDefault();
                }
            };
            this.opt.preventDefault = this.opt.preventDefault ?? true;
        }
        start(initClientPosition, stopOnUp) {
            this.startPos = { ...this.startPos, ...initClientPosition };
            document.addEventListener('pointermove', this.__onPointerMove, { passive: false });
            if (stopOnUp === true) {
                document.addEventListener('pointerup', this.__onPointerUp, { passive: false });
            }
            this.stopped = false;
        }
        stop() {
            document.removeEventListener('pointermove', this.__onPointerMove);
            document.removeEventListener('pointerup', this.__onPointerUp);
            this.stopped = true;
        }
    }
    exports.PointTrace = PointTrace;
    class ReactDragController extends EventTarget {
        constructor() {
            super(...arguments);
            this.dragged = {};
            this.positionInitialized = false;
            this._ref = null;
            this.moved = false;
            this._moveTrace = new PointTrace({
                onMove: (curr, start) => {
                    this.onMove?.(curr, start);
                    this.dragged.newPos?.({ left: curr.x - start.x + this.moveStartPos.left, top: curr.y - start.y + this.moveStartPos.top });
                    if (Math.abs(curr.x - start.x) + Math.abs(curr.y - start.y) > 5) {
                        this.moved = true;
                    }
                }
            });
            this.moveStartPos = { left: 0, top: 0 };
            this.trigger = {
                onPointerDown: (ev) => {
                    this.moveStartPos = this.dragged.curPos?.() ?? { left: 0, top: 0 };
                    this._moveTrace.start({ x: ev.clientX, y: ev.clientY }, true);
                },
            };
        }
        draggedRef(initPos) {
            if (this._ref != null) {
                return this._ref;
            }
            let ref = new domui_1.ReactRefEx();
            this._ref = ref;
            this.dragged.curPos = () => {
                let elem = ref.current;
                if (elem == null)
                    return { left: 0, top: 0 };
                return { left: Number(elem.style.left.replace(/px/, '')), top: Number(elem.style.top.replace(/px/, '')) };
            };
            this.dragged.newPos = (pos) => {
                let elem = ref.current;
                if (elem != null) {
                    elem.style.left = pos.left + 'px';
                    elem.style.top = pos.top + 'px';
                }
            };
            if (initPos != undefined && !this.positionInitialized) {
                this.positionInitialized = true;
                ref.waitValid().then((elem) => {
                    elem.style.left = initPos.left + 'px';
                    elem.style.top = initPos.top + 'px';
                });
            }
            return ref;
        }
        //Usually used for click handle
        checkIsMovedSinceLastCheck() {
            let moved = this.moved;
            this.moved = false;
            return moved;
        }
    }
    exports.ReactDragController = ReactDragController;
    exports.cssAnimation = {
        registerSimpleKeyframes: function (name, skf) {
            webutils_1.DynamicPageCSSManager.PutCss('@keyframes ' + name, [skf.map(v => v.percent + '% { ' + v.rule.join(';') + '} ').join('')]);
            return name;
        },
        unregisterSimpleKeyframes: function (name) {
            webutils_1.DynamicPageCSSManager.RemoveCss('@keyframes ' + name);
        },
        blink: (0, base_1.GenerateRandomString)()
    };
    exports.cssAnimation.registerSimpleKeyframes(exports.cssAnimation.blink, [{ percent: 0, rule: ['opacity:0'] }, { percent: 50, rule: ['opacity:1'] }, { percent: 100, rule: ['opacity:0'] }]);
});
