import useDebounce from "@/lib/hooks/useDebounce";
import { LightState } from "@/lib/validators/light-state.validator";
import {
    Box,
    Button,
    Flex,
    IconButton,
    Slider,
    SliderFilledTrack,
    SliderThumb,
    SliderTrack,
    useDisclosure
} from "@chakra-ui/react";
import { mdiCircleOpacity, mdiPower } from "@mdi/js";
import Icon from "@mdi/react";
import { useEffect, useRef, useState } from "react";
import { RgbColorPicker } from "react-colorful";
import Dialog from "./Dialog";

interface LightControlProps {
    header: string;
    value: LightState;
    onChange: (newValue: LightState) => void;
}

export default function LightControl({
    header,
    value,
    onChange
}: LightControlProps) {
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

    const onColorPickerOk = () => {
        onClose();
    };

    const onColorPickerCancel = () => {
        onChange(backupRef.current);
        onClose();
    };

    return (
        <Flex alignItems="center" gap={5} py={2}>
            <IconButton
                isRound
                variant={lightState.isOn ? "solid" : "outline"}
                icon={<Icon path={mdiPower} size={1} />}
                aria-label="Toggle light"
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
            <Dialog
                isOpen={isOpen}
                onClose={onClose}
                onOpen={onOpen}
                title={
                    <Box
                        as="h2"
                        fontSize="xl"
                        fontWeight="semibold"
                        textAlign="center">
                        {header}
                    </Box>
                }
                trigger={
                    <IconButton
                        isRound
                        variant="solid"
                        aria-label="Select color"
                        background={`rgb(${value.red}, ${value.green}, ${value.blue})`}
                        isDisabled={!lightState.isOn}
                        onClick={openModal}
                    />
                }>
                <Flex justifyContent="center" w="100%">
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
                </Flex>
                <Flex justifyContent="flex-end" w="100%" pt={6}>
                    <Button onClick={onColorPickerCancel} variant="ghost">
                        Cancel
                    </Button>
                    <Button onClick={onColorPickerOk}>Ok</Button>
                </Flex>
            </Dialog>
        </Flex>
    );
}
