import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import { LightService } from "@/lib/services/light.service";
import {
    LightState,
    LightStateValidator
} from "@/lib/validators/light-state.validator";

async function operateBulb(req: ApiRequest<LightState>, res: ApiResponse) {
    const { groupId, bulbId } = req.query as {
        groupId: string;
        bulbId: string;
    };
    const service = new LightService();
    await service.operateBulb(+bulbId, req.body);
    res.status(200).json({ status: "ok" });
}

export default ApiRoute.create({
    post: {
        handler: operateBulb,
        validator: LightStateValidator
    }
});
