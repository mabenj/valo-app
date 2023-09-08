import { ApiData } from "@/lib/api-route";
import useDebounce from "@/lib/hooks/useDebounce";
import { useHttp } from "@/lib/hooks/useHttp";
import { BulbDto } from "@/lib/types/bulb-dto";
import { GroupDto } from "@/lib/types/group-dto";
import { getErrorMessage, timeAgo } from "@/lib/utilities";
import { Rgba } from "@/lib/validators/rgba.validator";
import {
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    CardHeader,
    Container,
    Divider,
    Flex,
    Heading,
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    Stack,
    useDisclosure,
    useToast
} from "@chakra-ui/react";
import { mdiLightbulb, mdiLightbulbGroup, mdiLightbulbGroupOff } from "@mdi/js";
import Icon from "@mdi/react";
import { Inter } from "next/font/google";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { RgbaColorPicker } from "react-colorful";
import useSWR from "swr";

const inter = Inter({ subsets: ["latin"] });

export default function Home() {
    const toast = useToast();
    const http = useHttp();
    const {
        data: groups = [],
        isLoading,
        mutate
    } = useSWR("/api/lights/groups", groupFetcher);

    async function groupFetcher(url: string) {
        const res = await http.get<ApiData<{ groups: GroupDto[] }>>(url);
        if (res.error || !res.data || res.data.status === "error") {
            toast({
                status: "error",
                description: `Could not fetch groups (${getErrorMessage(
                    res.error
                )})`
            });
            return [];
        }
        return res.data.groups;
    }

    async function changeGroupColor(group: GroupDto, color: Rgba) {
        if (group.bulbs.length === 0 || rgbaEquals(group.rgba, color)) {
            return;
        }

        const newGroups = groups.map((prevGroup) =>
            prevGroup.id === group.id
                ? {
                      ...group,
                      rgba: color,
                      bulbs: group.bulbs.map((bulb) => ({
                          ...bulb,
                          rgba: color
                      }))
                  }
                : prevGroup
        );

        const updateGroupColor = async () => {
            const res = await http.post<ApiData>(
                `/api/lights/groups/${group.id}`,
                {
                    payload: color
                }
            );
            if (res.data?.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not update group color (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return newGroups;
        };

        mutate(updateGroupColor(), {
            optimisticData: newGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function changeBulbColor(
        group: GroupDto,
        bulb: BulbDto,
        color: Rgba
    ) {
        if (rgbaEquals(bulb.rgba, color)) {
            return;
        }
        group.bulbs = group.bulbs.map((prevBulb) =>
            prevBulb.accessoryId === bulb.accessoryId
                ? { ...bulb, rgba: color }
                : prevBulb
        );
        const newGroups = groups.map((prevGroup) =>
            prevGroup.id === group.id ? group : prevGroup
        );

        const updateBulbColor = async () => {
            const res = await http.post<ApiData>(
                `/api/lights/groups/${group.id}/${bulb.accessoryId}`,
                {
                    payload: color
                }
            );
            if (res.data?.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not update bulb color (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return newGroups;
        };

        mutate(updateBulbColor(), {
            optimisticData: newGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function changeAll(isOn: boolean) {
        const updateAll = async () => {
            const res = await http.post<ApiData<{ groups: GroupDto[] }>>(
                `/api/lights`,
                {
                    payload: { isOn }
                }
            );
            if (
                !res.data?.groups ||
                res.data?.status === "error" ||
                res.error
            ) {
                toast({
                    status: "error",
                    description: `Could not update bulb color (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return res.data.groups;
        };

        mutate(updateAll(), {
            optimisticData: groups.map((group) => ({
                ...group,
                rgba: { red: 0, green: 0, blue: 0, alpha: 1 },
                bulbs: group.bulbs.map((bulb) => ({
                    ...bulb,
                    rgba: { red: 0, green: 0, blue: 0, alpha: 1 }
                }))
            })),
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    return (
        <>
            <Head>
                <title>Valo App</title>
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className={`${inter.className}`}>
                <Container size="2xl">
                    {isLoading && (
                        <Flex
                            alignItems="center"
                            justifyContent="center"
                            gap={2}
                            w="100%"
                            p={5}>
                            <Spinner />
                            <span>Loading...</span>
                        </Flex>
                    )}
                    {!isLoading && groups.length === 0 && (
                        <Box color="gray.500">No groups</Box>
                    )}
                    {!isLoading && (
                        <>
                            <Flex
                                p={5}
                                alignItems="center"
                                justifyContent="center"
                                gap={4}>
                                <Button
                                    size="lg"
                                    rightIcon={
                                        <Icon
                                            path={mdiLightbulbGroup}
                                            size={1}
                                        />
                                    }
                                    onClick={() => changeAll(true)}>
                                    All on
                                </Button>
                                <Button
                                    size="lg"
                                    rightIcon={
                                        <Icon
                                            path={mdiLightbulbGroupOff}
                                            size={1}
                                        />
                                    }
                                    onClick={() => changeAll(false)}>
                                    All off
                                </Button>
                            </Flex>
                            <Flex
                                direction={["column", "column", "row"]}
                                gap={5}
                                pb={8}>
                                {groups.map((group) => (
                                    <GroupCard
                                        key={group.id}
                                        group={group}
                                        onGroupColorChange={(color) =>
                                            changeGroupColor(group, color)
                                        }
                                        onBulbColorChange={(bulb, color) =>
                                            changeBulbColor(group, bulb, color)
                                        }
                                    />
                                ))}
                            </Flex>
                        </>
                    )}
                </Container>
            </main>
        </>
    );
}

const GroupCard = ({
    group,
    onGroupColorChange,
    onBulbColorChange
}: {
    group: GroupDto;
    onGroupColorChange: (rgba: Rgba) => void;
    onBulbColorChange: (bulb: BulbDto, rgba: Rgba) => void;
}) => {
    return (
        <Card minW="300px">
            <CardHeader>
                <Flex justifyContent="space-between" alignItems="flex-start">
                    <Heading as="h2" size="lg">
                        <Box>{group.name}</Box>
                        <Box color="gray.500" fontSize="sm">
                            Group
                        </Box>
                    </Heading>
                    <ColorPicker
                        value={group.rgba}
                        onChange={onGroupColorChange}
                        header={group.name}
                        icon={<Icon path={mdiLightbulbGroup} size={1} />}
                    />
                </Flex>
                <Divider mt={5} />
            </CardHeader>
            <CardBody>
                {group.bulbs.length === 0 && (
                    <Box color="gray.500">No bulbs in this group...</Box>
                )}
                <Stack spacing={10}>
                    {group.bulbs.map((bulb) => (
                        <BulbInfo
                            key={bulb.accessoryId}
                            bulb={bulb}
                            onColorChange={(color) =>
                                onBulbColorChange(bulb, color)
                            }
                        />
                    ))}
                </Stack>
            </CardBody>
        </Card>
    );
};

const BulbInfo = ({
    bulb,
    onColorChange
}: {
    bulb: BulbDto;
    onColorChange: (rgba: Rgba) => void;
}) => {
    return (
        <Box>
            <Flex justifyContent="space-between" alignItems="center">
                <Heading as="h3" size="md">
                    <Flex alignItems="center" gap={2}>
                        <Box>{bulb.name}</Box>
                        <Badge colorScheme={bulb.isOnline ? "green" : "gray"}>
                            {bulb.isOnline ? "Online" : "Offline"}
                        </Badge>
                    </Flex>
                </Heading>
                <ColorPicker
                    header={bulb.name}
                    value={bulb.rgba}
                    onChange={onColorChange}
                    icon={<Icon path={mdiLightbulb} size={1} />}
                />
            </Flex>
            <Box fontSize="sm" color="gray.500">
                Last seen {timeAgo(new Date(bulb.lastSeenUnixTimestamp * 1000))}
            </Box>
        </Box>
    );
};

interface ColorPickerModalProps {
    header: string;
    value: Rgba;
    onChange: (newValue: Rgba) => void;
    icon: React.ReactElement;
}

const ColorPicker = ({
    header,
    value,
    onChange,
    icon
}: ColorPickerModalProps) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [color, setColor] = useState({
        r: value.red,
        g: value.green,
        b: value.blue,
        a: value.alpha
    });
    const debouncedColor = useDebounce(color, 200);
    const backupRef = useRef(value);

    useEffect(() => {
        onChange({
            red: debouncedColor.r,
            green: debouncedColor.g,
            blue: debouncedColor.b,
            alpha: debouncedColor.a
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedColor]);

    useEffect(() => {
        setColor({
            r: value.red,
            g: value.green,
            b: value.blue,
            a: value.alpha
        });
    }, [value]);

    const handleOpen = () => {
        backupRef.current = value;
        onOpen();
    };

    const handleOk = () => {
        onClose();
    };

    const handleCancel = () => {
        onChange(backupRef.current);
        onClose();
    };

    return (
        <>
            <IconButton
                isRound
                variant="solid"
                icon={icon ? icon : undefined}
                aria-label="Select color"
                background={`rgb(${value.red}, ${value.green}, ${value.blue})`}
                onClick={handleOpen}
            />
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{header}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody display="flex" justifyContent="center">
                        <RgbaColorPicker color={color} onChange={setColor} />
                    </ModalBody>
                    <ModalFooter display="flex" justifyContent="flex-end">
                        <Button onClick={handleCancel} variant="ghost">
                            Cancel
                        </Button>
                        <Button onClick={handleOk}>Ok</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

function rgbaEquals(rgba1?: Rgba, rgba2?: Rgba) {
    if (!rgba1 && !rgba2) {
        return true;
    }
    if (!rgba1 || !rgba2) {
        return false;
    }
    return (
        rgba1.red === rgba2.red &&
        rgba1.green === rgba2.green &&
        rgba1.blue === rgba2.blue &&
        rgba1.alpha === rgba2.alpha
    );
}
