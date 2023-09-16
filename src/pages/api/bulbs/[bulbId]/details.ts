import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import GatewayClient from "@/lib/gateway-client";
import { BulbDto } from "@/lib/types/bulb-dto";
import { z } from "zod";

async function renameBulb(
    req: ApiRequest<{ name: string }>,
    res: ApiResponse<{ bulb: BulbDto }>
) {
    const { bulbId } = req.query as {
        bulbId: string;
    };
    const client = await GatewayClient.getInstance();
    const bulb = await client.renameBulb(+bulbId, req.body.name)
    res.status(200).json({ status: "ok", bulb });
}

export default ApiRoute.create({
    post: {
        handler: renameBulb,
        validator: z.object({
            name: z.string().min(1)
        })
    }
});
