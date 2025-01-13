define(["require", "exports", "preact"], function (require, exports, React) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SvgShape = void 0;
    var SvgShape;
    (function (SvgShape) {
        class Fan extends React.Component {
            render(props, state, context) {
                let startPt = [this.props.cx + Math.cos(this.props.startAngle) * this.props.radius, this.props.cy + Math.sin(this.props.startAngle) * this.props.radius];
                let endPt = [this.props.cx + Math.cos(this.props.endAngle) * this.props.radius, this.props.cy + Math.sin(this.props.endAngle) * this.props.radius];
                let largeArc = (this.props.endAngle - this.props.startAngle) % (Math.PI * 2) > Math.PI;
                let pathD = `M ${this.props.cx} ${this.props.cy} L ${startPt.join(' ')} A ${this.props.radius} ${this.props.radius} 0 ${largeArc ? 1 : 0} 1 ${endPt.join(' ')}`;
                return React.createElement("path", { fill: this.props.fill, stroke: this.props.stroke, d: pathD, style: this.props.style });
            }
        }
        SvgShape.Fan = Fan;
    })(SvgShape || (exports.SvgShape = SvgShape = {}));
});
//# sourceMappingURL=shape.js.map