import { LightState } from "../validators/light-state.validator";
import { BulbDto } from "./bulb-dto";

export interface GroupDto {
    name: string;
    id: number;
    bulbs: BulbDto[];
    lightState: LightState;
}
