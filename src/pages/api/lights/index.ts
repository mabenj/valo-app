import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import { LightService } from "@/lib/services/light.service";
import { GroupDto } from "@/lib/types/group-dto";
import { z } from "zod";

async function operateAll(
    req: ApiRequest<{ isOn: boolean }>,
    res: ApiResponse<{groups: GroupDto[]}>
) {
    const service = new LightService();
    const groups = await service.operateAll(req.body.isOn);
    res.status(200).json({ status: "ok", groups });
}

export default ApiRoute.create({
    post: {
        handler: operateAll,
        validator: z.object({
            isOn: z.boolean()
        })
    }
});
