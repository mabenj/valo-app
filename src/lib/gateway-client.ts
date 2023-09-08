import {
    Accessory,
    Group,
    GroupOperation,
    LightOperation,
    TradfriClient
} from "node-tradfri-client";
import Config from "./config";
import { ValoError } from "./errors";
import Logger, { LogColor } from "./logger";
import { getErrorMessage, sleep } from "./utilities";

export default class GatewayClient {
    private static instance: GatewayClient | null = null;
    private static readonly logger = new Logger(
        "GATEWAY-CLIENT",
        LogColor.CYAN
    );

    private tradfri: TradfriClient;
    private initializing = false;

    private _groups: Group[] = [];
    private _accessories: Accessory[] = [];

    private constructor() {
        this.tradfri = new TradfriClient(Config.gatewayAddress);
    }

    public get groups() {
        return this._groups;
    }

    public get accessories() {
        return this._accessories;
    }

    public async operateGroup(group: Group, operation: GroupOperation) {
        await this.tradfri.operateGroup(group, operation, true);
    }

    public async operateLight(accessory: Accessory, operation: LightOperation) {
        await this.tradfri.operateLight(accessory, operation, true);
    }

    public static async dispose() {
        while (GatewayClient.instance?.initializing) {
            await sleep(100);
        }
        GatewayClient.instance?.tradfri.destroy();
        GatewayClient.instance = null;
    }

    public static async getInstance() {
        while (GatewayClient.instance?.initializing) {
            await sleep(100);
        }
        if (!GatewayClient.instance) {
            GatewayClient.instance = new GatewayClient();
            await this.init();
        } else {
            console.log("instance already initialized");
        }
        return GatewayClient.instance;
    }

    private static async init() {
        GatewayClient.instance!.initializing = true;
        try {
            const { identity, psk } =
                await GatewayClient.instance!.tradfri.authenticate(
                    Config.gatewaySecurityCode
                );
            await GatewayClient.instance!.tradfri.connect(identity, psk);
            const { groups, accessories } = await getGroupsAndAccessories(
                GatewayClient.instance!.tradfri
            );
            GatewayClient.instance!._groups = groups;
            GatewayClient.instance!._accessories = accessories;
            GatewayClient.instance!.initializing = false;
        } catch (error) {
            GatewayClient.logger.error(
                `Unable to connect to Tradfri gateway (${getErrorMessage(
                    error
                )})`
            );
            GatewayClient.instance!.tradfri.destroy();
            GatewayClient.instance = null;
            throw new ValoError("Unable to connect to Tradfri gateway");
        }
    }
}

async function getGroupsAndAccessories(tradfri: TradfriClient) {
    try {
        const groupsPromise = new Promise<Group[]>(async (resolve, reject) => {
            const groupList: Group[] = [];
            tradfri.on("group updated", (group) => groupList.push(group));
            tradfri.on("error", reject);
            await tradfri.observeGroupsAndScenes();
            resolve(groupList);
        });
        const accessoriesPromise = new Promise<Accessory[]>(
            async (resolve, reject) => {
                const accessoryList: Accessory[] = [];
                tradfri.on("device updated", (device) =>
                    accessoryList.push(device)
                );
                tradfri.on("error", reject);
                await tradfri.observeDevices();
                resolve(accessoryList);
            }
        );
        const [groups, accessories] = await Promise.all([
            groupsPromise,
            accessoriesPromise
        ]);

        return { groups, accessories };
    } catch (error) {
        tradfri.destroy();
        throw error;
    }
}
