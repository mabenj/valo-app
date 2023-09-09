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
        try {
            await this.tradfri.operateGroup(group, operation, true);
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }

    public async operateLight(accessory: Accessory, operation: LightOperation) {
        try {
            await this.tradfri.operateLight(accessory, operation, true);
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }

    public static async getInstance() {
        while (GatewayClient.instance?.initializing) {
            await sleep(100);
        }
        if (!GatewayClient.instance) {
            GatewayClient.logger.debug("Initializing client instance...");
            GatewayClient.instance = new GatewayClient();
            await this.init();
        } else {
            GatewayClient.logger.debug("Reusing client instance");
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

    private static async dispose() {
        while (GatewayClient.instance?.initializing) {
            await sleep(100);
        }
        GatewayClient.instance?.tradfri.destroy();
        GatewayClient.instance = null;
    }
}

async function getGroupsAndAccessories(tradfri: TradfriClient) {
    try {
        const groupsPromise = new Promise<Group[]>(async (resolve, reject) => {
            const groupsById: Record<string, Group> = {};
            tradfri.on(
                "group updated",
                (group) => (groupsById[group.instanceId] = group)
            );
            tradfri.on("error", reject);
            await tradfri.observeGroupsAndScenes();
            resolve(Object.values(groupsById));
        });
        const accessoriesPromise = new Promise<Accessory[]>(
            async (resolve, reject) => {
                const accessoriesById: Record<string, Accessory> = {};
                tradfri.on(
                    "device updated",
                    (accessory) =>
                        (accessoriesById[accessory.instanceId] = accessory)
                );
                tradfri.on("error", reject);
                await tradfri.observeDevices();
                resolve(Object.values(accessoriesById));
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
