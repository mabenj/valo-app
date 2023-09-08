export interface BulbDto {
    name: string;
    accessoryId: number;
    isOn: boolean;
    isOnline: boolean;
    lastSeenUnixTimestamp: number;
    rgba: {
        red: number;
        green: number;
        blue: number;
        alpha: number;
    };
}
