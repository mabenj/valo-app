import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import GatewayClient from "@/lib/gateway-client";
import { GroupDto } from "@/lib/types/group-dto";
import {
    LightState,
    LightStateValidator
} from "@/lib/validators/light-state.validator";

async function operateGroup(
    req: ApiRequest<LightState>,
    res: ApiResponse<{ group: GroupDto }>
) {
    const { groupId } = req.query as { groupId: string };
    const client = await GatewayClient.getInstance();
    const group = await client.changeGroupLights(+groupId, req.body);
    res.status(200).json({ status: "ok", group });
}

export default ApiRoute.create({
    post: {
        handler: operateGroup,
        validator: LightStateValidator
    }
});
