import { LightOperation } from "node-tradfri-client";
import { NotFoundError } from "../errors";
import GatewayClient from "../gateway-client";
import { GroupDto } from "../types/group-dto";
import { caseInsensitiveSorter } from "../utilities";
import { LightState } from "../validators/light-state.validator";

const EMPTY_LIGHT_STATE: LightState = {
    red: 0,
    green: 0,
    blue: 0,
    alpha: 1,
    isOn: true
};

export class LightService {
    async switchAll(on: boolean) {
        const client = await GatewayClient.getInstance();
        const superGroup = client.groups.find(
            (group) => group.name === "SuperGroup"
        );
        if (!superGroup) {
            throw new NotFoundError(`Could not find super group`);
        }
        await client.operateGroup(superGroup, { onOff: on });
    }

    async operateGroup(groupId: number, state: LightState) {
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

        const operation = getLightOperation(state);
        await Promise.all(
            accessories.map((accessory) =>
                client.operateLight(accessory, operation)
            )
        );
    }

    async operateBulb(bulbId: number, state: LightState) {
        const client = await GatewayClient.getInstance();
        const accessory = client.accessories.find(
            (accessory) => accessory.instanceId === bulbId
        );
        if (!accessory) {
            throw new NotFoundError(`Bulb with ID '${bulbId}' not found`);
        }
        await client.operateLight(accessory, getLightOperation(state));
    }

    async getGroups(): Promise<GroupDto[]> {
        const client = await GatewayClient.getInstance();
        return this.getGroupDtos(client);
    }

    private getGroupDtos(client: GatewayClient): GroupDto[] {
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
                            lightState: getLightState(
                                light.color,
                                light.dimmer,
                                light.onOff
                            )
                        }))
                    )
                    .sort(caseInsensitiveSorter("name"));
                return {
                    name: group.name,
                    id: group.instanceId,
                    bulbs: bulbs,
                    lightState: bulbs[0]
                        ? bulbs[0].lightState
                        : EMPTY_LIGHT_STATE
                };
            })
            .sort(caseInsensitiveSorter("name"));
    }
}

function getLightOperation({
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

function rgbToHex(red: number, green: number, blue: number) {
    const redHex = red.toString(16).padStart(2, "0");
    const greenHex = green.toString(16).padStart(2, "0");
    const blueHex = blue.toString(16).padStart(2, "0");
    return redHex + greenHex + blueHex;
}

function getLightState(
    hex: string,
    brightness: number,
    isOn: boolean
): LightState {
    const red = parseInt(hex.substring(0, 2), 16);
    const green = parseInt(hex.substring(2, 4), 16);
    const blue = parseInt(hex.substring(4, 6), 16);
    const alpha = brightness / 100;
    return {
        red,
        green,
        blue,
        alpha,
        isOn
    };
}
