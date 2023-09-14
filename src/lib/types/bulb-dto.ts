import { LightState } from "../validators/light-state.validator";

export interface BulbDto {
    name: string;
    accessoryId: number;
    isOnline: boolean;
    lastSeenUnixTimestamp: number;
    lightState: LightState
}
