import {
    Accessory,
    Group,
    Light,
    LightOperation,
    TradfriClient
} from "node-tradfri-client";
import Config from "./config";
import { NotFoundError, ValoError } from "./errors";
import Logger, { LogColor } from "./logger";
import { BulbDto } from "./types/bulb-dto";
import { GroupDto } from "./types/group-dto";
import {
    caseInsensitiveSorter,
    getErrorMessage,
    rgbToHex,
    sleep,
    stringEqualsCi
} from "./utilities";
import { LightState } from "./validators/light-state.validator";

interface BulbGroup {
    name: string;
    gatewayInstance: Group;
}

interface Bulb {
    name: string;
    lightState: LightState;
    gatewayInstance: Accessory;
}

export default class GatewayClient {
    private static instance: GatewayClient | null = null;
    private static readonly logger = new Logger(
        "GATEWAY-CLIENT",
        LogColor.CYAN
    );

    private tradfri: TradfriClient;
    private initializing = false;
    private groupsById: Record<number, BulbGroup> = {};
    private bulbsById: Record<number, Bulb> = {};

    private constructor() {
        this.tradfri = new TradfriClient(Config.gatewayAddress);
    }

    public get groups(): GroupDto[] {
        return Object.values(this.groupsById)
            .filter((group) => group.name !== "SuperGroup")
            .map((group) => this.groupToDto(group));
    }

    public async renameGroup(groupId: number, name: string): Promise<GroupDto> {
        const group = this.groupsById[groupId];
        if (!group) {
            throw new NotFoundError(`Group '${groupId}' not found`);
        }
        if (group.name === name) {
            return this.groupToDto(group);
        }
        if (
            Object.values(this.groupsById).some((group) =>
                stringEqualsCi(group.name, name)
            )
        ) {
            throw new ValoError(`Name already in use '${name}'`);
        }

        try {
            group.name = name;
            group.gatewayInstance.name = name;
            await this.tradfri.updateGroup(group.gatewayInstance);
            this.groupsById[groupId] = group;
            return this.groupToDto(group);
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }

    public async renameBulb(bulbId: number, name: string): Promise<BulbDto> {
        const bulb = this.bulbsById[bulbId];
        if (!bulb) {
            throw new NotFoundError(`Bulb '${bulbId}' not found`);
        }
        if (bulb.name === name) {
            return this.bulbToDto(bulb);
        }
        if (
            Object.values(this.bulbsById).some((bulb) =>
                stringEqualsCi(bulb.name, name)
            )
        ) {
            throw new ValoError(`Name already in use '${name}'`);
        }

        try {
            bulb.name = name;
            bulb.gatewayInstance.name = name;
            await this.tradfri.updateDevice(bulb.gatewayInstance);
            this.bulbsById[bulbId] = bulb;
            return this.bulbToDto(bulb);
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }

    public async switchAll(onOff: boolean) {
        const superGroup = Object.values(this.groupsById).find(
            (group) => group.name === "SuperGroup"
        );
        if (!superGroup) {
            throw new NotFoundError("Super group not found");
        }

        try {
            await this.tradfri.operateGroup(
                superGroup.gatewayInstance,
                { onOff },
                true
            );
            Object.keys(this.bulbsById).forEach((bulbId) => {
                this.bulbsById[+bulbId].lightState.isOn = onOff;
            });
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }

    public async changeGroupLights(
        groupId: number,
        lightState: LightState
    ): Promise<GroupDto> {
        const group = this.groupsById[groupId];
        if (!group) {
            throw new NotFoundError(`Group '${groupId}' not found`);
        }

        try {
            const bulbs = group.gatewayInstance.deviceIDs
                .map((deviceId) => this.bulbsById[deviceId])
                .filter((bulb) => !!bulb);
            const operation = generateLightOperation(lightState);
            await Promise.all(
                bulbs.map((bulb) =>
                    this.tradfri.operateLight(
                        bulb.gatewayInstance,
                        operation,
                        true
                    )
                )
            );

            bulbs.forEach((bulb) => {
                bulb.lightState = lightState;
                this.bulbsById[bulb.gatewayInstance.instanceId] = bulb;
            });

            return this.groupToDto(group);
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }

    public async changeBulbLights(
        bulbId: number,
        lightState: LightState
    ): Promise<BulbDto> {
        const bulb = this.bulbsById[bulbId];
        if (!bulb) {
            throw new NotFoundError(`Bulb '${bulbId}' not found`);
        }

        try {
            const operation = generateLightOperation(lightState);
            await this.tradfri.operateLight(
                bulb.gatewayInstance,
                operation,
                true
            );
            bulb.lightState = lightState;
            this.bulbsById[bulbId] = bulb;
            return this.bulbToDto(bulb);
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
            const { groups, bulbs } = await getGroupsAndBulbs(
                GatewayClient.instance!.tradfri
            );
            GatewayClient.instance!.groupsById = groups;
            GatewayClient.instance!.bulbsById = bulbs;
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

    private groupToDto(group: BulbGroup): GroupDto {
        const EMPTY_LIGHT_STATE: LightState = {
            red: 0,
            green: 0,
            blue: 0,
            alpha: 1,
            isOn: true
        };
        const bulbs = group.gatewayInstance.deviceIDs
            .map((deviceId) => this.bulbsById[deviceId])
            .filter((bulb): bulb is Bulb => !!bulb)
            .map((bulb) => this.bulbToDto(bulb))
            .sort(caseInsensitiveSorter("name"));
        return {
            name: group.name,
            id: group.gatewayInstance.instanceId,
            bulbs: bulbs,
            lightState: bulbs[0] ? bulbs[0].lightState : EMPTY_LIGHT_STATE
        };
    }

    private bulbToDto(bulb: Bulb): BulbDto {
        return {
            id: bulb.gatewayInstance.instanceId,
            isOnline: bulb.gatewayInstance.alive,
            lastSeenUnixTimestamp: bulb.gatewayInstance.lastSeen,
            lightState: bulb.lightState,
            name: bulb.name
        };
    }
}

async function getGroupsAndBulbs(
    tradfri: TradfriClient
): Promise<{ groups: Record<number, BulbGroup>; bulbs: Record<number, Bulb> }> {
    try {
        const groupsPromise = new Promise<Group[]>(async (resolve, reject) => {
            const groupsById: Record<number, Group> = {};
            tradfri.on(
                "group updated",
                (group) => (groupsById[group.instanceId] = group)
            );
            tradfri.on("error", reject);
            await tradfri.observeGroupsAndScenes();
            resolve(Object.values(groupsById));
        });
        const devicesPromise = new Promise<Accessory[]>(
            async (resolve, reject) => {
                const devicesById: Record<number, Accessory> = {};
                tradfri.on(
                    "device updated",
                    (accessory) =>
                        (devicesById[accessory.instanceId] = accessory)
                );
                tradfri.on("error", reject);
                await tradfri.observeDevices();
                resolve(Object.values(devicesById));
            }
        );
        const [groups, devices] = await Promise.all([
            groupsPromise,
            devicesPromise
        ]);

        return {
            groups: groups.reduce((acc, curr) => {
                acc[curr.instanceId] = {
                    name: curr.name,
                    gatewayInstance: curr
                };
                return acc;
            }, {} as Record<number, BulbGroup>),
            bulbs: devices.reduce((acc, curr) => {
                acc[curr.instanceId] = {
                    name: curr.name,
                    lightState: generateLightState(curr.lightList[0]),
                    gatewayInstance: curr
                };
                return acc;
            }, {} as Record<number, Bulb>)
        };
    } catch (error) {
        tradfri.destroy();
        throw error;
    }
}

function generateLightOperation({
    red,
    green,
    blue,
    alpha,
    isOn
}: LightState): LightOperation {
    const operation: LightOperation = {
        transitionTime: 0
    };
    operation.onOff = isOn;
    operation.color = rgbToHex(red, green, blue);
    operation.dimmer = alpha * 100;
    return operation;
}

function generateLightState(light: Light): LightState {
    const red = parseInt(light.color.substring(0, 2), 16);
    const green = parseInt(light.color.substring(2, 4), 16);
    const blue = parseInt(light.color.substring(4, 6), 16);
    const alpha = light.dimmer / 100;
    return {
        red,
        green,
        blue,
        alpha,
        isOn: light.onOff
    };
}
