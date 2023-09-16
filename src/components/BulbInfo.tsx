import { BulbDto } from "@/lib/types/bulb-dto";
import { timeAgo } from "@/lib/utilities";
import { LightState } from "@/lib/validators/light-state.validator";
import { Badge, Box, Flex } from "@chakra-ui/react";
import EditableHeader from "./ui/EditableHeader";
import LightControl from "./ui/LightControl";

interface BulbInfoProps {
    bulb: BulbDto;
    onLightChange: (rgba: LightState) => void;
    onNameChange: (newName: string) => void;
}

export default function BulbInfo({
    bulb,
    onLightChange,
    onNameChange
}: BulbInfoProps) {
    return (
        <Box>
            <Box>
                <EditableHeader value={bulb.name} onChange={onNameChange} />
                {!bulb.isOnline && (
                    <Flex alignItems="center" gap={2}>
                        <Badge colorScheme="gray">Offline</Badge>
                        <Box fontSize="sm" color="gray.500">
                            Last seen{" "}
                            {timeAgo(
                                new Date(bulb.lastSeenUnixTimestamp * 1000)
                            )}
                        </Box>
                    </Flex>
                )}
                <LightControl
                    header={bulb.name}
                    value={bulb.lightState}
                    onChange={onLightChange}
                />
            </Box>
        </Box>
    );
}
