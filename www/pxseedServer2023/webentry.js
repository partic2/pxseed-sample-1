define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pxprpcClient/registry", "pxprpc/backend"], function (require, exports, base_1, webutils_1, registry_1, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    (async () => {
        await registry_1.persistent.load();
        let url = base_1.requirejs.getConfig().baseUrl;
        if (url.endsWith('/'))
            url = url.substring(0, url.length - 1);
        let slashAt = url.lastIndexOf('/');
        let pxseedBase = slashAt >= 0 ? url.substring(0, slashAt) : '';
        let pxprpcUrl = (pxseedBase + '/pxprpc/0').replace(/^http/, 'ws');
        let key = (0, webutils_1.GetUrlQueryVariable)('__pxprpcKey');
        if (key != null) {
            pxprpcUrl += '?key=' + key;
        }
        let wstest;
        try {
            wstest = await new backend_1.WebSocketIo().connect(pxprpcUrl);
            wstest.close();
            await (0, registry_1.addClient)(pxprpcUrl, registry_1.ServerHostRpcName);
        }
        catch (e) { }
        await registry_1.persistent.save();
        window.open((0, webutils_1.BuildUrlFromJsEntryModule)('partic2/packageManager/webui'), '_self');
    })();
});
//# sourceMappingURL=webentry.js.map