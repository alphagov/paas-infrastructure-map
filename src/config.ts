interface IConfig {
	readonly snapshotURL: string;
	readonly basicAuthUsername?: string;
	readonly basicAuthPassword?: string;
}

const REQUIRED = true;

export function getEnv(key: string, required: boolean = false): string {
	const v = process.env[key];
	if (required && !v) {
		throw new Error(`environemnt variable ${key} must be set`);
	}
	return v || '';
}

export function getConfig(): IConfig {
	return {
		snapshotURL: getEnv('SNAPSHOT_URL', REQUIRED),
		basicAuthUsername: getEnv('BASIC_AUTH_USERNAME'),
		basicAuthPassword: getEnv('BASIC_AUTH_PASSWORD'),
	};
}
