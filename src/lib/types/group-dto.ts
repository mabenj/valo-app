import { Rgba } from "../validators/rgba.validator";
import { BulbDto } from "./bulb-dto";

export interface GroupDto {
    name: string;
    id: number;
    bulbs: BulbDto[];
    rgba: Rgba;
}
