import { LightOperation } from "node-tradfri-client";
import { NotFoundError } from "../errors";
import GatewayClient from "../gateway-client";
import { GroupDto } from "../types/group-dto";
import { caseInsensitiveSorter } from "../utilities";
import { Rgba } from "../validators/rgba.validator";

const TURNED_OFF_COLOR = { red: 0, green: 0, blue: 0, alpha: 1 };

export class LightService {
    async operateAll(isOn: boolean): Promise<GroupDto[]> {
        const client = await GatewayClient.getInstance();
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
            rgba: TURNED_OFF_COLOR,
            bulbs: group.bulbs.map((bulb) => ({
                ...bulb,
                rgba: TURNED_OFF_COLOR
            }))
        }));
    }

    async operateGroup(groupId: number, rgba: Rgba) {
        const client = await GatewayClient.getInstance();
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
    }

    async operateBulb(bulbId: number, rgba: Rgba) {
        const client = await GatewayClient.getInstance();
        const accessory = client.accessories.find(
            (accessory) => accessory.instanceId === bulbId
        );
        if (!accessory) {
            throw new NotFoundError(`Bulb with ID '${bulbId}' not found`);
        }
        await client.operateLight(accessory, rgbaToLightOperation(rgba));
    }

    async getGroups(): Promise<GroupDto[]> {
        const client = await GatewayClient.getInstance();
        return this.getGroupDtos(client);
    }

    private async getGroupDtos(client: GatewayClient) {
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
                            rgba: light.onOff
                                ? getRgba(light.color, light.dimmer)
                                : TURNED_OFF_COLOR
                        }))
                    )
                    .sort(caseInsensitiveSorter("name"));
                return {
                    name: group.name,
                    id: group.instanceId,
                    rgba:
                        group.onOff && bulbs[0]
                            ? bulbs[0].rgba
                            : TURNED_OFF_COLOR,
                    bulbs: bulbs
                };
            })
            .sort(caseInsensitiveSorter("name"));
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
