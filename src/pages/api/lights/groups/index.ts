import { ApiRequest, ApiResponse, ApiRoute } from "@/lib/api-route";
import { LightService } from "@/lib/services/light.service";
import { GroupDto } from "@/lib/types/group-dto";

async function getAllGroups(
    req: ApiRequest,
    res: ApiResponse<{ groups: GroupDto[] }>
) {
    const service = new LightService();
    const groups = await service.getGroups();
    res.status(200).json({ status: "ok", groups });
}

export default ApiRoute.create({
    get: getAllGroups
});
