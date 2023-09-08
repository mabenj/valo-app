const Config = {
    gatewayAddress: getEnvVariable("VALO_APP_GATEWAY_ADDRESS"),
    gatewaySecurityCode: getEnvVariable("VALO_APP_GATEWAY_SECURITY_CODE")
} as const;

export default Config;

function getEnvVariable(
    key: string,
    type?: "string",
    defaultValue?: string
): string;

function getEnvVariable(
    key: string,
    type: "number",
    defaultValue?: number
): number;

function getEnvVariable(
    key: string,
    type?: "boolean",
    defaultValue?: boolean
): boolean;

function getEnvVariable(
    key: string,
    type?: "string" | "number" | "boolean",
    defaultValue?: string | number | boolean
): string | number | boolean {
    let value = process.env[key];
    if (!value) {
        if (defaultValue) {
            return defaultValue;
        }
        if (process.env.NEXT_PHASE !== "phase-production-build") {
            throw new Error(`Couldn't find environment variable '${key}'`);
        }
        value = "0";
    }
    if (type === "number") {
        const parsed = parseInt(value, 10);
        if (isNaN(parsed) || !isFinite(parsed)) {
            throw new Error(`Could not parse number from '${value}'`);
        }
        return parsed;
    }
    if (type === "boolean") {
        return value.toLowerCase() === "true" || value === "1";
    }
    return value;
}
