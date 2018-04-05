import * as fs from 'fs';
import fetch from 'node-fetch';

export interface ISnapshot {
	readonly bosh: {
		readonly instances: ReadonlyArray<IBoshInstance>;
		readonly vms: ReadonlyArray<IBoshInstance>;
		readonly vm_types: ReadonlyArray<IBoshVMType>;
		readonly azs: ReadonlyArray<IBoshAZ>;
		readonly elbs: ReadonlyArray<IBoshELB>;
	};
	readonly aws: {
		readonly elbs: ReadonlyArray<IAWSELBInstance>;
		readonly ec2: ReadonlyArray<IAWSEC2Instance>;
	};
}

export enum IBoshProcessState {
	RUNNING = 'running',
	STOPPED = 'stopped',
	INITIALIZING = 'initializing',
}

export enum IBoshInstanceState {
	STARTED = 'started',
	STOPPED = 'stopped',
}

export interface IBoshAZ {
	readonly cloud_properties: {
		readonly availability_zone: string;
	};
	readonly name: string;
}

export interface IBoshELB {
	readonly name: string;
	readonly elbs: ReadonlyArray<string>;
}

export interface IBoshVMType {
	readonly name: string;
	readonly elbs?: ReadonlyArray<string>;
	readonly type: string;
}

export interface IBoshProcess {
	readonly name: string;
	readonly state: IBoshProcessState;
	readonly uptime: {
		readonly secs: number;
	};
	readonly mem: {
		readonly kb: number;
		readonly percent: number;
	};
	readonly cpu: {
		readonly total: number;
	};
}

export interface IBoshInstance {
	readonly vm_cid: string;
	readonly vm_created_at: string;
	readonly disk_cid: string | null;
	readonly disk_cids: ReadonlyArray<string>;
	readonly ips: ReadonlyArray<string>;
	readonly dns: ReadonlyArray<string>;
	readonly agent_id: string;
	readonly job_name: string;
	readonly index: number;
	readonly job_state: IBoshProcessState;
	readonly state: IBoshInstanceState;
	readonly resource_pool: string;
	readonly vm_type: string;
	readonly vitals: {
		readonly cpu: {
			readonly sys: string;
			readonly user: string;
			readonly wait: string;
		};
		readonly disk: {
			readonly ephemeral: {
				readonly inode_percent: string;
				readonly percent: string;
			};
			readonly persistent: {
				readonly inode_percent: string;
				readonly percent: string;
			};
			readonly system: {
				readonly inode_percent: string;
				readonly percent: string;
			};
		};
		readonly load: [string, string, string]
		readonly mem: {
			readonly kb: string;
			readonly percent: string;
		};
		readonly swap: {
			readonly kb: string;
			readonly percent: string;
		};
		readonly uptime: {
			readonly secs: number;
		}
	};
	readonly processes: ReadonlyArray<IBoshProcess>;
	readonly resurrection_paused: boolean;
	readonly az: string;
	readonly id: string;
	readonly bootstrap: boolean;
	readonly ignore: boolean;
}

export interface IAWSTag {
	readonly Value: string;
	readonly Key: string;
}

export interface IAWSELBInstance {
	readonly Subnets: ReadonlyArray<string>;
	readonly CanonicalHostedZoneNameID: string;
	readonly CanonicalHostedZoneName: string;
	readonly ListenerDescriptions: ReadonlyArray<{
		readonly Listener: {
			readonly InstancePort: number;
			readonly SSLCertificateId: string;
			readonly LoadBalancerPort: number;
			readonly Protocol: string;
			readonly InstanceProtocol: 'TCP' | 'HTTP';
		};
		readonly PolicyNames: ReadonlyArray<string>;
	}>;
	readonly HealthCheck: {
		readonly HealthyThreshold: number;
		readonly Interval: number;
		readonly Target: string;
		readonly Timeout: number;
		readonly UnhealthyThreshold: number;
	};
	readonly VPCId: string;
	readonly BackendServerDescriptions: ReadonlyArray<{
		readonly InstancePort: number;
		readonly PolicyNames: ReadonlyArray<string>;
	}>;
	readonly Instances: ReadonlyArray<{
		readonly InstanceId: string;
	}>;
	readonly DNSName: string;
	readonly SecurityGroups: ReadonlyArray<string>;
	readonly Policies: {
		readonly LBCookieStickinessPolicies: ReadonlyArray<string>;
		readonly AppCookieStickinessPolicies: ReadonlyArray<string>;
		readonly OtherPolicies: ReadonlyArray<string>;
	};
	readonly LoadBalancerName: string;
	readonly CreatedTime: string;
	readonly AvailabilityZones: ReadonlyArray<string>;
	readonly Scheme: 'internet-facing' | 'internal';
	readonly SourceSecurityGroup: {
		readonly OwnerAlias: string;
		readonly GroupName: string;
	};
}

export interface IAWSEC2Instance {
	readonly Monitoring: {
		readonly State: 'disabled' | 'enabled';
	};
	readonly PublicDnsName: string;
	readonly State: {
		readonly Code: number;
		readonly Name: 'pending' | 'running' | 'shutting-down' | 'terminated' | 'stopping' | 'stopped';
	};
	readonly EbsOptimized: boolean;
	readonly LaunchTime: string;
	readonly PrivateIpAddress: string;
	readonly ProductCodes: ReadonlyArray<{}>;
	readonly VpcId: string;
	readonly StateTransitionReason: string;
	readonly InstanceId: string;
	readonly ImageId: string;
	readonly PrivateDnsName: string;
	readonly KeyName: string;
	readonly SecurityGroups: ReadonlyArray<{
		readonly GroupName: string;
		readonly GroupId: string;
	}>;
	readonly ClientToken: string;
	readonly SubnetId: string;
	readonly InstanceType: string;
	readonly NetworkInterfaces: ReadonlyArray<{
		readonly Status: 'available' | 'in-use';
		readonly MacAddress: string;
		readonly SourceDestCheck: boolean;
		readonly VpcId: string;
		readonly Description: string;
		readonly NetworkInterfaceId: string;
		readonly PrivateIpAddresses: ReadonlyArray< {
			readonly Primary: boolean;
			readonly PrivateIpAddress: string;
		} >;
		readonly SubnetId: string;
		readonly Attachment: {
			readonly Status: 'attaching' | 'attached' | 'detaching' | 'detached';
			readonly DeviceIndex: number;
			readonly DeleteOnTermination: boolean;
			readonly AttachmentId: string;
			readonly AttachTime: string;
		};
		readonly Groups: ReadonlyArray< {
			readonly GroupName: string;
			readonly GroupId: string;
		}>;
		readonly Ipv6Addresses: ReadonlyArray<any>;
		readonly OwnerId: string;
		readonly PrivateIpAddress: string;
	}>;
	readonly SourceDestCheck: boolean;
	readonly Placement: {
		readonly Tenancy: 'default' | 'dedicated';
		readonly GroupName: string;
		readonly AvailabilityZone: string;
	};
	readonly Hypervisor: string;
	readonly BlockDeviceMappings: ReadonlyArray<{
		readonly DeviceName: string;
		readonly Ebs: {
			readonly Status: 'attached';
			readonly DeleteOnTermination: boolean;
			readonly VolumeId: string;
			readonly AttachTime: string;
		}
	}>;
	readonly Architecture: 'x86_64' | 'i386';
	readonly RootDeviceType: string;
	readonly IamInstanceProfile: {
		readonly Id: string;
		readonly Arn: string;
	};
	readonly RootDeviceName: string;
	readonly VirtualizationType: string;
	readonly Tags: ReadonlyArray<IAWSTag>;
	readonly AmiLaunchIndex: number;
}

export async function fileExists(filename: string): Promise<boolean> {
	return new Promise<boolean>(resolve => {
		fs.access(filename, 0, err => {
			resolve(!err);
		});
	});
}
export async function getSnapshotFromFile(filename: string): Promise<ISnapshot> {
	const ok = fileExists(filename);
	if (!ok) {
		throw new Error(`Bosh state file ${filename} does not exist`);
	}
	return new Promise<ISnapshot>((resolve, reject) => {
		fs.readFile(filename, (err, data) => {
			if (err) {
				reject(err);
				return;
			}
			try {
				resolve(JSON.parse(data.toString()) as ISnapshot);
			} catch (err) {
				reject(err);
			}
		});
	});
}

export async function getSnapshotFromHTTP(url: string): Promise<ISnapshot> {
	const res = await fetch(url);
	if (res.status !== 200) {
		throw new Error(`failed to fetch '${url}': status ${res.status}`);
	}
	return res.json();
}

export async function getSnapshot(url: string): Promise<ISnapshot> {
	if (url.startsWith('file://')) {
		const filename = url.replace('file://', '');
		return getSnapshotFromFile(filename);
	}
	if (url.startsWith('https://')) {
		return getSnapshotFromHTTP(url);
	}
	throw new Error(`Cannot fetch snapshot from '${url}' expected file:// or https:// url`);
}
