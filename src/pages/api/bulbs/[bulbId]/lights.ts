import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import GatewayClient from "@/lib/gateway-client";
import { BulbDto } from "@/lib/types/bulb-dto";
import {
    LightState,
    LightStateValidator
} from "@/lib/validators/light-state.validator";

async function operateBulb(
    req: ApiRequest<LightState>,
    res: ApiResponse<{ bulb: BulbDto }>
) {
    const { bulbId } = req.query as {
        bulbId: string;
    };
    const client = await GatewayClient.getInstance();
    const bulb = await client.changeBulbLights(+bulbId, req.body);
    res.status(200).json({ status: "ok", bulb });
}

export default ApiRoute.create({
    post: {
        handler: operateBulb,
        validator: LightStateValidator
    }
});
