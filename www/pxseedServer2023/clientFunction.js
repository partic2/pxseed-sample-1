define("pxseedServer2023/clientFunction", ["require", "exports", "partic2/jsutils1/base", "partic2/pxprpcClient/registry"], function (require, exports, base_1, registry_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.defaultPxseedServer2023Invoker = exports.PxseedServer2023Function = void 0;
    exports.setServerInformation = setServerInformation;
    exports.getServerInformation = getServerInformation;
    exports.broadcastToQueryServerInformation = broadcastToQueryServerInformation;
    class PxseedServer2023Function {
        constructor() {
            this.initMutex = new base_1.mutex();
        }
        async init(client1) {
            return this.initMutex.exec(async () => {
                if (this.remoteModule != undefined) {
                    return this;
                }
                this.client1 = client1 ?? registry_1.ServerHostRpc;
                this.remoteModule = await (0, registry_1.importRemoteModule)(this.client1, 'pxseedServer2023/pxseedhttpserver');
                return this;
            });
        }
        async exit() {
            await this.serverCommand('exit');
        }
        async subprocessWaitExitCode(index) {
            return this.serverCommand('subprocessWaitExitCode', index);
        }
        async subprocessRestart(index) {
            return this.serverCommand('subprocessRestart', index);
        }
        async serverCommand(cmd, param) {
            return this.remoteModule.serverCommand(cmd, param);
        }
        async buildEnviron() {
            return this.serverCommand('buildEnviron');
        }
        async buildPackages() {
            return this.serverCommand('buildPackages');
        }
        async rebuildPackages() {
            return this.serverCommand('rebuildPackages');
        }
        async getConfig() {
            return await this.serverCommand('getConfig');
        }
        async saveConfig(cfg) {
            return await this.serverCommand('saveConfig', cfg);
        }
        async restartListener() {
            await this.serverCommand('restartListener').catch(() => { });
        }
        async setServerInformation(info) {
            return this.remoteModule.__serverHostSetServerInformation(info);
        }
        async getServerInformation() {
            return this.remoteModule.__serverHostGetServerInformation();
        }
        async broadcastToQueryServerInformation(waitSecond) {
            return this.remoteModule.__serverHostBroadcastToQueryServerInformation(waitSecond);
        }
    }
    exports.PxseedServer2023Function = PxseedServer2023Function;
    exports.defaultPxseedServer2023Invoker = new PxseedServer2023Function();
    async function setServerInformation(info) {
        await exports.defaultPxseedServer2023Invoker.init();
        return await exports.defaultPxseedServer2023Invoker.setServerInformation(info);
    }
    async function getServerInformation() {
        await exports.defaultPxseedServer2023Invoker.init();
        return await exports.defaultPxseedServer2023Invoker.getServerInformation();
    }
    async function broadcastToQueryServerInformation(waitSecond) {
        return await exports.defaultPxseedServer2023Invoker.broadcastToQueryServerInformation(waitSecond);
    }
});
