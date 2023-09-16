import { LightState } from "../validators/light-state.validator";

export interface BulbDto {
    name: string;
    id: number;
    isOnline: boolean;
    lastSeenUnixTimestamp: number;
    lightState: LightState;
}
