import { useToast } from "@chakra-ui/react";
import useSWR from "swr";
import { ApiData } from "../api-route";
import { BulbDto } from "../types/bulb-dto";
import { GroupDto } from "../types/group-dto";
import { getErrorMessage } from "../utilities";
import { LightState } from "../validators/light-state.validator";
import { useHttp } from "./useHttp";

export function useLights() {
    const toast = useToast();
    const http = useHttp();
    const {
        data: groups = [],
        isLoading,
        mutate
    } = useSWR("/api/groups", groupFetcher);

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

    async function changeGroupLights(groupId: number, lightState: LightState) {
        const group = groups.find((group) => group.id === groupId);
        if (
            !group ||
            group.bulbs.length === 0 ||
            lightStateEquals(group.lightState, lightState)
        ) {
            return;
        }

        group.lightState = lightState;
        group.bulbs = group.bulbs.map((bulb) => ({ ...bulb, lightState }));

        const callLightApi = async () => {
            const res = await http.post<ApiData<{ group: GroupDto }>>(
                `/api/groups/${group.id}/lights`,
                {
                    payload: lightState
                }
            );
            if (!res.data?.group || res.data?.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not update group lights (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return groups.map((prev) =>
                prev.id === group.id ? res.data!.group : prev
            );
        };

        mutate(callLightApi(), {
            optimisticData: groups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function changeBulbLights(bulbId: number, lightState: LightState) {
        const group = groups.find((group) =>
            group.bulbs.some((bulb) => bulb.id === bulbId)
        );
        const bulb = group?.bulbs.find((bulb) => bulb.id === bulbId);
        if (!group || !bulb || lightStateEquals(bulb.lightState, lightState)) {
            return;
        }
        bulb.lightState = lightState;
        group.bulbs = group.bulbs.map((prev) =>
            prev.id === bulb.id ? bulb : prev
        );
        const optimisticGroups = groups.map((prev) =>
            prev.id === group.id ? group : prev
        );

        const callLightApi = async () => {
            const res = await http.post<ApiData<{ bulb: BulbDto }>>(
                `/api/bulbs/${bulb.id}/lights`,
                {
                    payload: lightState
                }
            );
            if (!res.data?.bulb || res.data?.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not update bulb lights (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            group.bulbs = group.bulbs.map((prev) =>
                prev.id === bulb.id ? res.data!.bulb : prev
            );
            return optimisticGroups.map((oGroup) =>
                oGroup.id === group.id ? group : oGroup
            );
        };

        mutate(callLightApi(), {
            optimisticData: optimisticGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function switchAll(isOn: boolean) {
        const optimisticGroups: GroupDto[] = groups.map((group) => ({
            ...group,
            lightState: { ...group.lightState, isOn },
            bulbs: group.bulbs.map((bulb) => ({
                ...bulb,
                lightState: { ...bulb.lightState, isOn }
            }))
        }));

        const callLightApi = async () => {
            const res = await http.post<ApiData<{ groups: GroupDto[] }>>(
                `/api/groups`,
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
                    description: `Could not switch bulbs (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return res.data.groups;
        };

        mutate(callLightApi(), {
            optimisticData: optimisticGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function renameGroup(groupId: number, name: string) {
        const group = groups.find((group) => group.id === groupId);
        if (!group || !name) {
            return;
        }

        group.name = name;
        const optimisticGroups = groups.map((prev) =>
            prev.id === groupId ? group : prev
        );

        const callDetailsApi = async () => {
            const res = await http.post<ApiData<{ group: GroupDto }>>(
                `/api/groups/${groupId}/details`,
                {
                    payload: { name }
                }
            );
            if (!res.data?.group || res.data.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not rename group (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            return optimisticGroups.map((oGroup) =>
                oGroup.id === groupId ? res.data!.group : oGroup
            );
        };

        mutate(callDetailsApi(), {
            optimisticData: optimisticGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    async function renameBulb(bulbId: number, name: string) {
        const group = groups.find((group) =>
            group.bulbs.some((bulb) => bulb.id === bulbId)
        );
        const bulb = group?.bulbs.find((bulb) => bulb.id === bulbId);
        if (!group || !bulb || !name) {
            return;
        }

        bulb.name = name;
        group.bulbs = group.bulbs.map((prev) =>
            prev.id === bulbId ? bulb : prev
        );
        const optimisticGroups = groups.map((prev) =>
            prev.id === group.id ? group : prev
        );

        const callDetailsApi = async () => {
            const res = await http.post<ApiData<{ bulb: BulbDto }>>(
                `/api/bulbs/${bulbId}/details`,
                {
                    payload: { name }
                }
            );
            if (!res.data?.bulb || res.data.status === "error" || res.error) {
                toast({
                    status: "error",
                    description: `Could not rename bulb (${getErrorMessage(
                        res.error
                    )})`
                });
                return Promise.reject(res.error);
            }
            group.bulbs = group.bulbs.map((prev) =>
                prev.id === bulbId ? res.data!.bulb : prev
            );
            return optimisticGroups.map((oGroup) =>
                oGroup.id === group.id ? group : oGroup
            );
        };

        mutate(callDetailsApi(), {
            optimisticData: optimisticGroups,
            rollbackOnError: true,
            populateCache: true,
            revalidate: false
        });
    }

    return {
        groups,
        isLoading,
        changeGroupLights,
        changeBulbLights,
        switchAll,
        renameGroup,
        renameBulb
    };
}

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
