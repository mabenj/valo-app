import { LightOperation } from "node-tradfri-client";
import { NotFoundError } from "../errors";
import GatewayClient from "../gateway-client";
import { GroupDto } from "../types/group-dto";
import { caseInsensitiveSorter } from "../utilities";
import { Rgba } from "../validators/rgba.validator";

export class LightService {
    async operateAll(isOn: boolean): Promise<GroupDto[]> {
        const client = await GatewayClient.getInstance();
        try {
            const superGroup = client.groups.find(
                (group) => group.name === "SuperGroup"
            );
            if (!superGroup) {
                throw new NotFoundError(`Could not find super group`);
            }
            await client.operateGroup(superGroup, { onOff: isOn });
            const groups = await this.getGroupDtos(client);
            if (isOn) {
                return groups;
            }
            return groups.map((group) => ({
                ...group,
                rgba: { red: 0, green: 0, blue: 0, alpha: 0 },
                bulbs: group.bulbs.map((bulb) => ({
                    ...bulb,
                    rgba: { red: 0, green: 0, blue: 0, alpha: 0 }
                }))
            }));
        } finally {
            await GatewayClient.dispose();
        }
    }

    async operateGroup(groupId: number, rgba: Rgba) {
        const client = await GatewayClient.getInstance();
        try {
            const group = client.groups.find(
                (group) => group.instanceId === groupId
            );
            if (!group) {
                throw new NotFoundError(`Group with ID ${groupId} not found`);
            }
            const accessories = client.accessories.filter((accessory) =>
                group.deviceIDs.includes(accessory.instanceId)
            );

            const operation = rgbaToLightOperation(rgba);
            await Promise.all(
                accessories.map((accessory) =>
                    client.operateLight(accessory, operation)
                )
            );
        } finally {
            await GatewayClient.dispose();
        }
    }

    async operateBulb(bulbId: number, rgba: Rgba) {
        const client = await GatewayClient.getInstance();
        try {
            const accessory = client.accessories.find(
                (accessory) => accessory.instanceId === bulbId
            );
            if (!accessory) {
                throw new NotFoundError(`Bulb with ID '${bulbId}' not found`);
            }
            await client.operateLight(accessory, rgbaToLightOperation(rgba));
        } finally {
            await GatewayClient.dispose();
        }
    }

    async getGroups(): Promise<GroupDto[]> {
        const client = await GatewayClient.getInstance();
        try {
            return this.getGroupDtos(client);
        } finally {
            await GatewayClient.dispose();
        }
    }

    private async getGroupDtos(client: GatewayClient) {
        try {
            return client.groups
                .filter((group) => group.name !== "SuperGroup")
                .map((group) => {
                    const bulbs = client.accessories
                        .filter((accessory) =>
                            group.deviceIDs.includes(accessory.instanceId)
                        )
                        .flatMap((accessory) =>
                            accessory.lightList.map((light) => ({
                                accessoryId: accessory.instanceId,
                                isOnline: accessory.alive,
                                lastSeenUnixTimestamp: accessory.lastSeen,
                                name: accessory.name,
                                isOn: light.onOff,
                                rgba: getRgba(light.color, light.dimmer)
                            }))
                        )
                        .sort(caseInsensitiveSorter("name"));
                    return {
                        name: group.name,
                        id: group.instanceId,
                        rgba: bulbs[0]
                            ? bulbs[0].rgba
                            : { red: 0, green: 0, blue: 0, alpha: 1 },
                        bulbs: bulbs
                    };
                })
                .sort(caseInsensitiveSorter("name"));
        } catch (error) {
            await GatewayClient.dispose();
            throw error;
        }
    }
}

function rgbaToLightOperation({
    red,
    green,
    blue,
    alpha
}: Rgba): LightOperation {
    const operation: LightOperation = {
        transitionTime: 0
    };
    if ((red === 0 && green === 0 && blue === 0) || alpha === 0) {
        operation.onOff = false;
        return operation;
    }
    operation.onOff = true;
    operation.color = rgbToHex(red, green, blue);
    operation.dimmer = alpha * 100;
    return operation;
}

function rgbToHex(red: number, green: number, blue: number) {
    const redHex = red.toString(16);
    const greenHex = green.toString(16);
    const blueHex = blue.toString(16);
    return redHex + greenHex + blueHex;
}

function getRgba(hex: string, brightness: number) {
    const red = parseInt(hex.substring(0, 2), 16);
    const green = parseInt(hex.substring(2, 4), 16);
    const blue = parseInt(hex.substring(4, 6), 16);
    const alpha = brightness / 100;
    return {
        red,
        green,
        blue,
        alpha
    };
}
