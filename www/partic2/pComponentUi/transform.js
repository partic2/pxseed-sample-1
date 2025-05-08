define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "./domui"], function (require, exports, base_1, webutils_1, domui_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.cssAnimation = exports.DragController = exports.DraggableAndScalable = exports.TransformHelper = exports.PointTrace = void 0;
    class PointTrace {
        constructor(opt) {
            this.opt = opt;
            this.startPos = { x: 0, y: 0 };
            this.currPos = { x: 0, y: 0 };
            this.__onMouseMove = (ev) => {
                this.currPos.x = ev.clientX;
                this.currPos.y = ev.clientY;
                this.opt.onMove?.(this.currPos, this.startPos);
                if (this.opt.preventDefault) {
                    ev.preventDefault();
                }
            };
            this.__onTouchMove = (ev) => {
                if (ev.touches.length >= 1) {
                    this.currPos = { x: ev.touches.item(0).clientX, y: ev.touches.item(0).clientY };
                }
                this.opt.onMove?.(this.currPos, this.startPos);
                if (this.opt.preventDefault) {
                    ev.preventDefault();
                }
            };
            this.__onMouseUp = (ev) => {
                this.stop();
                if (this.opt.preventDefault) {
                    ev.preventDefault();
                }
            };
            this.__onTouchEnd = (ev) => {
                if (ev.touches.length == 0) {
                    this.stop();
                }
                if (this.opt.preventDefault) {
                    ev.preventDefault();
                }
            };
            this.opt.preventDefault = this.opt.preventDefault ?? true;
        }
        start(initClientPosition, stopOnUp) {
            this.startPos = { ...this.startPos, ...initClientPosition };
            document.addEventListener('mousemove', this.__onMouseMove, { passive: false });
            document.addEventListener('touchmove', this.__onTouchMove, { passive: false });
            if (stopOnUp === true) {
                document.addEventListener('mouseup', this.__onMouseUp, { passive: false });
                document.addEventListener('touchend', this.__onTouchEnd, { passive: false });
            }
        }
        stop() {
            document.removeEventListener('mousemove', this.__onMouseMove);
            document.removeEventListener('touchmove', this.__onTouchMove);
            document.removeEventListener('mouseup', this.__onMouseUp);
            document.removeEventListener('touchend', this.__onTouchEnd);
        }
    }
    exports.PointTrace = PointTrace;
    class TransformHelper {
        constructor() {
            this.scale = 1.0;
            this.translate = [0, 0];
            this.translateMode = 'translate';
        }
        applyTransform() {
            let translateCss = `translate(${this.translate.map(v => v + 'px').join(',')}) scale(${this.scale})`;
            if (this.transElem != null) {
                this.transElem.style.transform = translateCss;
            }
        }
        attach(transElement, eventElement) {
            this.transElem = transElement;
            this.transElem.style.position = 'absolute';
            this.eventElem = eventElement ?? transElement;
            return this;
        }
        setTransform(translate, scale) {
            this.translate = translate;
            this.scale = scale;
            this.applyTransform();
            return this;
        }
        getTransform() {
            return { translate: this.translate, scale: this.scale };
        }
        detach() { }
    }
    exports.TransformHelper = TransformHelper;
    class DraggableAndScalable extends TransformHelper {
        constructor() {
            super(...arguments);
            this.dragging = false;
            this.mouseinitpos = [0, 0];
            this.inittranslate = [0, 0];
            this.listener = {};
            this.resizable = { left: false, top: false, right: false, bottom: false };
            this.resizing = '';
            this.touchScaleCenter = [0, 0];
            this.lastTouchDistance = 0;
            this.touchmode = 'none';
        }
        onWheel(ev) {
            let sscale = this.scale;
            this.scale += ev.deltaY * -0.001;
            // Restrict scale
            this.scale = Math.min(Math.max(0.125, this.scale), 4);
            // Apply scale transform
            let offx = ev.offsetX;
            let offy = ev.offsetY;
            this.translate[0] += sscale * offx - offx * this.scale;
            this.translate[1] += sscale * offy - offy * this.scale;
            this.applyTransform();
        }
        onMouseMove(ev) {
            if (this.resizing == '') {
                this.translate[0] = this.inittranslate[0] + ev.clientX - this.mouseinitpos[0];
                this.translate[1] = this.inittranslate[1] + ev.clientY - this.mouseinitpos[1];
            }
            this.applyTransform();
        }
        onMouseDown(ev) {
            if (this.listener.mousemove == undefined) {
                let domRc = this.transElem.getBoundingClientRect();
                let borderWidth = 3;
                if (this.resizable.left && ev.clientX <= domRc.left + borderWidth) {
                    this.resizing = 'l';
                }
                else if (this.resizable.right && ev.clientX >= domRc.right - borderWidth) {
                    this.resizing = 'r';
                }
                else if (this.resizable.top && ev.clientY <= domRc.top + borderWidth) {
                    this.resizing = 't';
                }
                else if (this.resizable.bottom && ev.clientY >= domRc.bottom - borderWidth) {
                    this.resizing = 'b';
                }
                this.mouseinitpos = [ev.clientX, ev.clientY];
                this.inittranslate = (0, base_1.clone)(this.translate, 1);
                this.listener.mousemove = (ev) => { this.onMouseMove(ev); };
                this.transElem.addEventListener('mousemove', this.listener.mousemove, { passive: false });
            }
        }
        onMouseUp(ev) {
            if (this.listener.mousemove != undefined) {
                this.transElem.removeEventListener('mousemove', this.listener.mousemove);
                delete this.listener.mousemove;
            }
            this.resizing = '';
        }
        onTouchStart(ev) {
            if (ev.touches.length >= 2 && this.touchmode != 'scale') {
                this.touchmode = 'scale';
                let touch1 = ev.touches.item(0);
                let touch2 = ev.touches.item(1);
                let dx = touch1.clientX - touch2.clientX;
                let dy = touch1.clientY - touch2.clientY;
                this.lastTouchDistance = Math.sqrt(dx * dx + dy * dy);
                this.touchScaleCenter[0] = ((touch1.clientX + touch2.clientX) / 2 - this.transElem.clientLeft - this.translate[0]) / this.scale;
                this.touchScaleCenter[1] = ((touch1.clientY + touch2.clientY) / 2 - this.transElem.clientTop - this.translate[1]) / this.scale;
            }
            else if (ev.touches.length == 1 && this.touchmode == 'none') {
                this.touchmode = 'translate';
                this.mouseinitpos = [ev.touches.item(0).clientX, ev.touches.item(0).clientY];
                this.inittranslate = (0, base_1.clone)(this.translate, 1);
            }
            if (this.listener.touchmove == undefined) {
                this.listener.touchmove = (ev) => { ev.preventDefault(); this.onTouchMove(ev); };
                this.transElem.addEventListener('touchmove', this.listener.touchmove, { passive: false });
            }
        }
        onTouchMove(ev) {
            if (ev.touches.length >= 2 && this.touchmode == 'scale') {
                let dx = ev.touches.item(0).clientX - ev.touches.item(1).clientX;
                let dy = ev.touches.item(0).clientY - ev.touches.item(1).clientY;
                let dist2 = Math.sqrt(dx * dx + dy * dy);
                let sscale = this.scale;
                this.scale *= dist2 / this.lastTouchDistance;
                this.lastTouchDistance = dist2;
                this.scale = Math.min(Math.max(0.125, this.scale), 4);
                this.translate[0] += sscale * this.touchScaleCenter[0] - this.touchScaleCenter[0] * this.scale;
                this.translate[1] += sscale * this.touchScaleCenter[1] - this.touchScaleCenter[1] * this.scale;
            }
            else if (ev.touches.length == 1 && this.touchmode == 'translate') {
                this.translate[0] = this.inittranslate[0] + ev.touches.item(0).clientX - this.mouseinitpos[0];
                this.translate[1] = this.inittranslate[1] + ev.touches.item(0).clientY - this.mouseinitpos[1];
            }
            this.applyTransform();
        }
        onTouchEnd(ev) {
            if (ev.touches.length == 0 && this.listener.touchmove != undefined) {
                this.transElem.removeEventListener('touchmove', this.listener.touchmove);
                delete this.listener.touchmove;
                this.touchmode = 'none';
            }
        }
        attach(transElement, eventElement) {
            super.attach(transElement, eventElement);
            this.listener.mousedown = (ev) => { this.onMouseDown(ev); };
            eventElement.addEventListener('mousedown', this.listener.mousedown, { passive: false });
            this.listener.mouseup = (ev) => { this.onMouseUp(ev); };
            eventElement.addEventListener('mouseup', this.listener.mouseup, { passive: false });
            this.listener.wheel = (ev) => { ev.preventDefault(); this.onWheel(ev); };
            eventElement.addEventListener('wheel', this.listener.wheel, { passive: false });
            this.listener.touchstart = (ev) => { this.onTouchStart(ev); };
            eventElement.addEventListener('touchstart', this.listener.touchstart, { passive: false });
            this.listener.touchend = (ev) => { this.onTouchEnd(ev); };
            eventElement.addEventListener('touchend', this.listener.touchend, { passive: false });
            if (transElement.style.transformOrigin == '')
                transElement.style.transformOrigin = '0 0';
            return this;
        }
        detach() {
            super.detach();
            for (let k in this.listener) {
                this.eventElem.removeEventListener(k, this.listener[k]);
            }
        }
    }
    exports.DraggableAndScalable = DraggableAndScalable;
    class DragController {
        constructor() {
            this.dragged = {};
            this.positionInitialized = false;
            this.moved = false;
            this._moveTrace = new PointTrace({
                onMove: (curr, start) => {
                    this.dragged.newPos?.({ left: curr.x - start.x, top: curr.y - start.y });
                    this.moved = true;
                }
            });
            this.trigger = {
                onMouseDown: (ev) => {
                    let { left, top } = this.dragged.curPos?.() ?? { left: 0, top: 0 };
                    this._moveTrace.start({ x: ev.clientX - left, y: ev.clientY - top }, true);
                },
                onTouchStart: (ev) => {
                    let { left, top } = this.dragged.curPos?.() ?? { left: 0, top: 0 };
                    this._moveTrace.start({ x: ev.touches[0].clientX - left, y: ev.touches[0].clientY - top }, true);
                }
            };
        }
        draggedRef(initPos) {
            let ref = new domui_1.ReactRefEx();
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
    exports.DragController = DragController;
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
//# sourceMappingURL=transform.js.map