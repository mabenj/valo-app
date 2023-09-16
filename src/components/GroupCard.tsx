import { BulbDto } from "@/lib/types/bulb-dto";
import { GroupDto } from "@/lib/types/group-dto";
import { LightState } from "@/lib/validators/light-state.validator";
import {
    Box,
    Card,
    CardBody,
    CardHeader,
    Divider,
    Stack
} from "@chakra-ui/react";
import BulbInfo from "./BulbInfo";
import EditableHeader from "./ui/EditableHeader";
import LightControl from "./ui/LightControl";

interface GroupCardProps {
    group: GroupDto;
    onGroupLightChange: (lightState: LightState) => void;
    onBulbLightChange: (bulb: BulbDto, lightState: LightState) => void;
    onGroupNameChange: (newName: string) => void
    onBulbNameChange: (bulb: BulbDto, newName: string) => void
}

export default function GroupCard({
    group,
    onGroupLightChange,
    onBulbLightChange,
    onGroupNameChange,
    onBulbNameChange,
}: GroupCardProps) {
    return (
        <Card minW="300px">
            <CardHeader>
                <Box as="h2" fontWeight="bold" fontSize="xl">
                    <EditableHeader value={group.name} onChange={onGroupNameChange} />
                </Box>
                <LightControl
                    value={group.lightState}
                    onChange={onGroupLightChange}
                    header={group.name}
                />
                <Divider mt={5} />
            </CardHeader>
            <CardBody>
                {group.bulbs.length === 0 && (
                    <Box color="gray.500">No bulbs in this group...</Box>
                )}
                <Stack spacing={12}>
                    {group.bulbs.map((bulb) => (
                        <BulbInfo
                            key={bulb.id}
                            bulb={bulb}
                            onLightChange={(lightState) =>
                                onBulbLightChange(bulb, lightState)
                            }
                            onNameChange={newName => onBulbNameChange(bulb, newName)}
                        />
                    ))}
                </Stack>
            </CardBody>
        </Card>
    );
}
