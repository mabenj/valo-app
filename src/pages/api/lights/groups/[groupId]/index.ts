import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import { LightService } from "@/lib/services/light.service";
import { Rgba, RgbaValidator } from "@/lib/validators/rgba.validator";

async function operateGroup(req: ApiRequest<Rgba>, res: ApiResponse) {
    const { groupId } = req.query as { groupId: string };
    const service = new LightService();
    await service.operateGroup(+groupId, req.body);
    res.status(200).json({ status: "ok" });
}

export default ApiRoute.create({
    post: {
        handler: operateGroup,
        validator: RgbaValidator
    }
});