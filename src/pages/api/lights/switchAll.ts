import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import { LightService } from "@/lib/services/light.service";
import { GroupDto } from "@/lib/types/group-dto";
import { z } from "zod";

async function switchAll(
    req: ApiRequest<{ isOn: boolean }>,
    res: ApiResponse
) {
    const service = new LightService();
    await service.switchAll(req.body.isOn);
    res.status(200).json({ status: "ok" });
}

export default ApiRoute.create({
    post: {
        handler: switchAll,
        validator: z.object({
            isOn: z.boolean()
        })
    }
});
