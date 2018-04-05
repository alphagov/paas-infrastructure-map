import * as snapshot from './snapshot';

export interface IAppState {
	readonly infrastructure: IInfrastructure;
}

export interface IInstance extends snapshot.IBoshInstance {
	readonly ec2?: snapshot.IAWSEC2Instance;
	readonly vm_type_details?: snapshot.IBoshVMType;
}

export interface IAvailabilityZone extends snapshot.IBoshAZ {
	readonly instances: ReadonlyArray<IInstance>;
}

export interface ILoadBalancer extends snapshot.IAWSELBInstance {
	readonly boshName: string;
}

export interface IInfrastructure {
	readonly azs: ReadonlyArray<IAvailabilityZone>;
	readonly lbs: ReadonlyArray<ILoadBalancer>;
	readonly links: ReadonlyArray<ILink>;
}

enum LinkScope {
	LB = 'lb',
	AZ = 'az',
	REGION = 'region',
	VM = 'vm',
	PROCESS = 'process',
}

enum LinkPayload {
	LOGS = 'logs',
}

export interface ILinkTarget {
	readonly scope: LinkScope;
	readonly id: string;
}

export interface ILink {
	readonly id: string;
	readonly scope: LinkScope;
	readonly payload: LinkPayload;
	readonly from: ILinkTarget;
	readonly to: ILinkTarget;
}

// Links show the wiring between components
// hardcoded for now since unsure how to fetch this programatically
const links: ReadonlyArray<ILink> = [
	{
		id: 'metron-to-dopplers',
		scope: LinkScope.AZ,
		payload: LinkPayload.LOGS,
		from: {
			scope: LinkScope.PROCESS,
			id: 'metron_agent',
		},
		to: {
			scope: LinkScope.PROCESS,
			id: 'doppler',
		},
	},
];

export function getInitialState(): IAppState {
	return {
		infrastructure: {
			azs: [],
			lbs: [],
			links,
		},
	};
}
