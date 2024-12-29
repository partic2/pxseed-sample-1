define(["require", "exports", "pxprpc/backend", "pxprpc/base", "pxprpc/extend"], function (require, exports, backend_1, base_1, extend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultClient = exports.defaultServiceUrl = void 0;
    exports.getDefaultClient = getDefaultClient;
    exports.defaultServiceUrl = 'ws://' + location.host + '/pxprpc/2050';
    exports.defaultClient = null;
    async function getDefaultClient() {
        if (exports.defaultClient === null) {
            exports.defaultClient = await new extend_1.RpcExtendClient1(new base_1.Client(await new backend_1.WebSocketIo().connect(exports.defaultServiceUrl))).init();
        }
        return exports.defaultClient;
    }
});
//# sourceMappingURL=pxprpc_config.js.map