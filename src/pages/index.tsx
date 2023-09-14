import { ApiData } from "@/lib/api-route";
import useDebounce from "@/lib/hooks/useDebounce";
import { useHttp } from "@/lib/hooks/useHttp";
import { BulbDto } from "@/lib/types/bulb-dto";
import { GroupDto } from "@/lib/types/group-dto";
import { getErrorMessage, timeAgo } from "@/lib/utilities";
import { LightState } from "@/lib/validators/light-state.validator";
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
    IconButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    Spinner,
    Stack,
    useDisclosure,
    useToast
} from "@chakra-ui/react";
import {
    mdiCircleOpacity,
    mdiLightbulbGroup,
    mdiLightbulbGroupOff,
    mdiPower
} from "@mdi/js";
import Icon from "@mdi/react";
import { Nunito } from "next/font/google";
import Head from "next/head";
import { useEffect, useRef, useState } from "react";
import { RgbColorPicker } from "react-colorful";
import useSWR from "swr";

const nunito = Nunito({ subsets: ["latin"] });

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

    async function changeGroupLight(group: GroupDto, lightState: LightState) {
        if (
            group.bulbs.length === 0 ||
            lightStateEquals(group.lightState, lightState)
        ) {
            return;
        }

        const newGroups = groups.map((prevGroup) =>
            prevGroup.id === group.id
                ? {
                      ...group,
                      lightState: lightState,
                      bulbs: group.bulbs.map((bulb) => ({
                          ...bulb,
                          rgba: lightState
                      }))
                  }
                : prevGroup
        );

        const callGroupApi = async () => {
            const res = await http.post<ApiData>(
                `/api/lights/groups/${group.id}`,
                {
                    payload: lightState
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

        mutate(callGroupApi(), {
            optimisticData: newGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function changeBulbLight(
        group: GroupDto,
        bulb: BulbDto,
        lightState: LightState
    ) {
        if (lightStateEquals(bulb.lightState, lightState)) {
            return;
        }
        group.bulbs = group.bulbs.map((prevBulb) =>
            prevBulb.accessoryId === bulb.accessoryId
                ? { ...bulb, lightState: lightState }
                : prevBulb
        );
        const newGroups = groups.map((prevGroup) =>
            prevGroup.id === group.id ? group : prevGroup
        );

        const callBulbApi = async () => {
            const res = await http.post<ApiData>(
                `/api/lights/groups/${group.id}/${bulb.accessoryId}`,
                {
                    payload: lightState
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

        mutate(callBulbApi(), {
            optimisticData: newGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function switchAll(isOn: boolean) {
        const newGroups: GroupDto[] = groups.map((group) => ({
            ...group,
            lightState: { ...group.lightState, isOn },
            bulbs: group.bulbs.map((bulb) => ({
                ...bulb,
                lightState: { ...bulb.lightState, isOn }
            }))
        }));

        const callApi = async () => {
            const res = await http.post<ApiData>(`/api/lights/switchAll`, {
                payload: { isOn }
            });
            if (res.data?.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not switch bulbs (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return newGroups;
        };

        mutate(callApi(), {
            optimisticData: newGroups,
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
            <main className={`${nunito.className}`}>
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
                                    onClick={() => switchAll(true)}>
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
                                    onClick={() => switchAll(false)}>
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
                                        onGroupLightChange={(state) =>
                                            changeGroupLight(group, state)
                                        }
                                        onBulbLightChange={(bulb, state) =>
                                            changeBulbLight(group, bulb, state)
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
    onGroupLightChange,
    onBulbLightChange
}: {
    group: GroupDto;
    onGroupLightChange: (lightState: LightState) => void;
    onBulbLightChange: (bulb: BulbDto, lightState: LightState) => void;
}) => {
    return (
        <Card minW="300px">
            <CardHeader>
                <Box as="h2" fontWeight="bold" fontSize="xl">
                    <span>{group.name}</span>
                    <Box display="inline" ml={2} color="gray.500" fontSize="sm">
                        Group
                    </Box>
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
                            key={bulb.accessoryId}
                            bulb={bulb}
                            onLightChange={(lightState) =>
                                onBulbLightChange(bulb, lightState)
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
    onLightChange
}: {
    bulb: BulbDto;
    onLightChange: (rgba: LightState) => void;
}) => {
    return (
        <Box>
            <Box>
                <Flex alignItems="center" gap={2}>
                    <Box as="h3" fontWeight="bold">
                        {bulb.name}
                    </Box>
                    <Badge colorScheme={bulb.isOnline ? "green" : "gray"}>
                        {bulb.isOnline ? "Online" : "Offline"}
                    </Badge>
                    {!bulb.isOnline && (
                        <Box fontSize="sm" color="gray.500">
                            Last seen{" "}
                            {timeAgo(
                                new Date(bulb.lastSeenUnixTimestamp * 1000)
                            )}
                        </Box>
                    )}
                </Flex>
                <LightControl
                    header={bulb.name}
                    value={bulb.lightState}
                    onChange={onLightChange}
                />
            </Box>
        </Box>
    );
};

interface LightControl {
    header: string;
    value: LightState;
    onChange: (newValue: LightState) => void;
}

const LightControl = ({ header, value, onChange }: LightControl) => {
    const DEBOUNCE_MS = 200;
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [lightState, setLightState] = useState(value);
    const debouncedState = useDebounce(lightState, DEBOUNCE_MS);
    const backupRef = useRef(value);

    useEffect(() => {
        onChange(debouncedState);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedState]);

    useEffect(() => {
        setLightState(value);
    }, [value]);

    const toggleLight = () => {
        setLightState((prev) => ({
            ...prev,
            isOn: !prev.isOn
        }));
    };

    const openModal = () => {
        backupRef.current = value;
        onOpen();
    };

    const onModalOk = () => {
        onClose();
    };

    const onModalCancel = () => {
        onChange(backupRef.current);
        onClose();
    };

    return (
        <>
            <Flex alignItems="center" gap={5} py={2}>
                <IconButton
                    isRound
                    variant={lightState.isOn ? "solid" : "outline"}
                    icon={<Icon path={mdiPower} size={1} />}
                    aria-label="Toggle light"
                    colorScheme={lightState.isOn ? "green" : "gray"}
                    color={lightState.isOn ? undefined : "gray.500"}
                    onClick={toggleLight}
                />
                <Slider
                    value={lightState.alpha * 100}
                    onChange={(value) =>
                        setLightState((prev) => ({
                            ...prev,
                            alpha: value / 100
                        }))
                    }
                    isDisabled={!lightState.isOn}>
                    <SliderTrack>
                        <SliderFilledTrack />
                    </SliderTrack>
                    <SliderThumb boxSize={6}>
                        <Icon path={mdiCircleOpacity} size={1} />
                    </SliderThumb>
                </Slider>
                <IconButton
                    isRound
                    variant="solid"
                    aria-label="Select color"
                    background={`rgb(${value.red}, ${value.green}, ${value.blue})`}
                    isDisabled={!lightState.isOn}
                    onClick={openModal}
                />
            </Flex>
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{header}</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody display="flex" justifyContent="center">
                        <RgbColorPicker
                            color={{
                                r: lightState.red,
                                g: lightState.green,
                                b: lightState.blue
                            }}
                            onChange={({ r, g, b }) =>
                                setLightState((prev) => ({
                                    ...prev,
                                    red: r,
                                    green: g,
                                    blue: b
                                }))
                            }
                        />
                    </ModalBody>
                    <ModalFooter display="flex" justifyContent="flex-end">
                        <Button onClick={onModalCancel} variant="ghost">
                            Cancel
                        </Button>
                        <Button onClick={onModalOk}>Ok</Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};

function lightStateEquals(state1?: LightState, state2?: LightState) {
    if (!state1 && !state2) {
        return true;
    }
    if (!state1 || !state2) {
        return false;
    }
    return (
        state1.red === state2.red &&
        state1.green === state2.green &&
        state1.blue === state2.blue &&
        state1.alpha === state2.alpha &&
        state1.isOn === state2.isOn
    );
}
