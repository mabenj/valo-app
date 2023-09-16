import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import GatewayClient from "@/lib/gateway-client";
import { GroupDto } from "@/lib/types/group-dto";
import { z } from "zod";

async function renameGroup(
    req: ApiRequest<{ name: string }>,
    res: ApiResponse<{ group: GroupDto }>
) {
    const { groupId } = req.query as {
        groupId: string;
    };
    const client = await GatewayClient.getInstance();
    const group = await client.renameGroup(+groupId, req.body.name);
    res.status(200).json({ status: "ok", group });
}

export default ApiRoute.create({
    post: {
        handler: renameGroup,
        validator: z.object({
            name: z.string().min(1)
        })
    }
});
