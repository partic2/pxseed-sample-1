define(["require", "exports", "partic2/jsutils1/base", "partic2/jsutils1/webutils", "partic2/pxprpcClient/registry", "pxprpc/backend"], function (require, exports, base_1, webutils_1, registry_1, backend_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.__name__ = void 0;
    exports.getPxseedUrl = getPxseedUrl;
    exports.updatePxseedServerConfig = updatePxseedServerConfig;
    exports.createNewEntryUrlWithPxprpcKey = createNewEntryUrlWithPxprpcKey;
    exports.__name__ = base_1.requirejs.getLocalRequireModule(require);
    async function getPxseedUrl() {
        let pxseedBaseUrl = base_1.requirejs.getConfig().baseUrl;
        if (pxseedBaseUrl.endsWith('/'))
            pxseedBaseUrl = pxseedBaseUrl.substring(0, pxseedBaseUrl.length - 1);
        let slashAt = pxseedBaseUrl.lastIndexOf('/');
        let pxseedBase = slashAt >= 0 ? pxseedBaseUrl.substring(0, slashAt) : '';
        let pxprpcUrl = (pxseedBase + '/pxprpc/0').replace(/^http/, 'ws');
        let wsPipeUrl = (pxseedBase + '/ws/pipe').replace(/^http/, 'ws');
        return { pxseedBaseUrl, pxprpcUrl, wsPipeUrl };
    }
    async function updatePxseedServerConfig(pxprpcKey) {
        await registry_1.persistent.load();
        if (pxprpcKey === undefined) {
            pxprpcKey = (0, webutils_1.GetUrlQueryVariable)('__pxprpcKey');
        }
        if ((0, registry_1.getRegistered)(registry_1.ServerHostRpcName) != null) {
            await (0, registry_1.removeClient)(registry_1.ServerHostRpcName);
        }
        let { pxprpcUrl } = await getPxseedUrl();
        if (pxprpcKey != null) {
            pxprpcUrl += '?key=' + pxprpcKey;
        }
        let wstest;
        try {
            wstest = await new backend_1.WebSocketIo().connect(pxprpcUrl);
            wstest.close();
            await (0, registry_1.addClient)(pxprpcUrl, registry_1.ServerHostRpcName);
        }
        catch (e) { }
    }
    async function createNewEntryUrlWithPxprpcKey(jsentry, urlarg) {
        let clientInfo = await (0, registry_1.getPersistentRegistered)(registry_1.ServerHostRpcName);
        let key = null;
        if (clientInfo != null) {
            key = (0, webutils_1.GetUrlQueryVariable2)(clientInfo.url, 'key');
        }
        let url2 = (0, webutils_1.BuildUrlFromJsEntryModule)(exports.__name__, `__redirectjsentry=${encodeURIComponent(jsentry)}&__pxprpcKey=${key}` + (urlarg ? '&' + urlarg : ''));
        return new URL(url2, window.location.toString()).toString();
    }
    (async () => {
        if ((0, webutils_1.GetJsEntry)() == exports.__name__) {
            await updatePxseedServerConfig();
            let redirectJsEntry = (0, webutils_1.GetUrlQueryVariable)('__redirectjsentry');
            if (redirectJsEntry == null) {
                redirectJsEntry = 'partic2/packageManager/webui';
            }
            else {
                redirectJsEntry = decodeURIComponent(redirectJsEntry);
            }
            window.open((0, webutils_1.BuildUrlFromJsEntryModule)(redirectJsEntry), '_self');
        }
    })();
});
//# sourceMappingURL=webentry.js.map