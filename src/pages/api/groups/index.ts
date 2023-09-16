import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import GatewayClient from "@/lib/gateway-client";
import { GroupDto } from "@/lib/types/group-dto";
import { z } from "zod";

async function getAllGroups(
    req: ApiRequest,
    res: ApiResponse<{ groups: GroupDto[] }>
) {
    const client = await GatewayClient.getInstance();
    res.status(200).json({ status: "ok", groups: client.groups });
}

async function switchAll(
    req: ApiRequest<{ isOn: boolean }>,
    res: ApiResponse<{ groups: GroupDto[] }>
) {
    const client = await GatewayClient.getInstance();
    await client.switchAll(req.body.isOn);
    res.status(200).json({ status: "ok", groups: client.groups });
}

export default ApiRoute.create({
    get: getAllGroups,
    post: {
        handler: switchAll,
        validator: z.object({
            isOn: z.boolean()
        })
    }
});
