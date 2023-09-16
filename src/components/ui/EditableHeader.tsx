import {
    ButtonGroup,
    Editable,
    EditableInput,
    EditablePreview,
    IconButton,
    useEditableControls
} from "@chakra-ui/react";
import { mdiCheck, mdiClose, mdiPencil } from "@mdi/js";
import Icon from "@mdi/react";
import { useEffect, useState } from "react";

export default function EditableHeader({
    value,
    onChange
}: {
    value: string;
    onChange: (newValue: string) => void;
}) {
    const [inputValue, setInputValue] = useState(value);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    const handleSubmit = (newValue: string) => {
        if (newValue === value) {
            return;
        }
        onChange(newValue);
    };

    function EditableControls() {
        const {
            isEditing,
            getSubmitButtonProps,
            getCancelButtonProps,
            getEditButtonProps
        } = useEditableControls();

        if (isEditing) {
            return (
                <ButtonGroup w="100%" justifyContent="flex-end" gap={2} pt={2}>
                    <IconButton
                        isRound
                        variant="ghost"
                        color="gray.500"
                        aria-label="Cancel"
                        icon={<Icon path={mdiClose} size={1} />}
                        {...getCancelButtonProps()}
                    />
                    <IconButton
                        isRound
                        variant="ghost"
                        color="gray.500"
                        aria-label="Rename"
                        icon={<Icon path={mdiCheck} size={1} />}
                        type="submit"
                        {...getSubmitButtonProps()}
                    />
                </ButtonGroup>
            );
        }

        return (
            <IconButton
                isRound
                variant="ghost"
                aria-label="Rename"
                color="gray.500"
                ml={2}
                icon={<Icon path={mdiPencil} size={0.6} />}
                {...getEditButtonProps()}
            />
        );
    }
    return (
        <Editable
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleSubmit}>
            <EditablePreview />
            <EditableInput />
            <EditableControls />
        </Editable>
    );
}
