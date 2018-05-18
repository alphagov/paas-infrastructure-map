// AppState is loaded globally because lazy
console.log(app.state);
const {azs, lbs, ...rest} = app.state.infrastructure;

const VM_GROUP = 'vm';
const EXTERNAL_ELB_GROUP = 'extelb';
const INTERNAL_ELB_GROUP = 'intelb';
const PROCESS_GROUP = 'proc';
const PUBLIC_GROUP = 'public';
const AZ_GROUP = 'az';

// colors
const colors = {
	green: '#2ECC71',
	red: '#E74C3C',
};

// Node/edges data
const nodes = new vis.DataSet({});
const edges = new vis.DataSet({});

// Add a node for "the internet"
nodes.add({
	id: 'public',
	level: 0,
	label: 'internets',
	group: PUBLIC_GROUP,
});

function getVMLevel(vm) {
	if (vm.job_name === 'diego-api') {
		return 20;
	}
	return 10;
}

// Add elbs
for (let lb of lbs) {
	const lbID = lb.LoadBalancerName;
	nodes.add([{
		data: lb,
		id: lbID,
		label: lb.LoadBalancerName,
		group: lb.Scheme === 'internal' ? INTERNAL_ELB_GROUP : EXTERNAL_ELB_GROUP,
		level: lb.Scheme === 'internal' ? 5 : 1,
	}]);
	for (let node of lb.Instances) {
		edges.add([{
			from: lbID,
			to: node.InstanceId,
		}]);
		// connect all public elbs to "the internet"
		if (lb.Scheme !== 'internal') {
			edges.add([{
				from: 'public',
				to: lbID,
			}]);
		}
	}
}

// Add the vm instances
for (let az of azs) {
	for (let vm of az.instances) {
		const vmID = vm.vm_cid;
		const vmLevel = getVMLevel(vm);
		nodes.add([{
			data: vm,
			az,
			id: vmID,
			label: vm.job_name,
			group: VM_GROUP,
			color: {
				background: vm.state === 'started' ? colors.green : colors.red,
			},
			font: {
				size: 30,
			},
			level: vmLevel,
		}]);
		for (let process of vm.processes) {
			const procID = `${vm.vm_cid}/${process.name}`;
			nodes.add([{
				data: process,
				vm,
				az,
				id: procID,
				label: process.name,
				group: PROCESS_GROUP,
				level: vmLevel + 5,
				color: {
					background: process.state === 'running' ? colors.green : colors.red,
				},
			}]);
			edges.add([{
				from: vmID,
				to: procID,
			}]);
		}
	}
}

function connect(fromMatcher, toMatcher, edgeOptions) {
	nodes.forEach(fromNode => {
		if (!fromMatcher(fromNode)) {
			return;
		}
		nodes.forEach(toNode => {
			if (!toMatcher(toNode, fromNode)) {
				return;
			}
			if (fromNode.id === toNode.id) {
				return;
			}
			edges.add([{
				...(edgeOptions || {}),
				from: fromNode.id,
				to: toNode.id,
			}]);
		});
	});
}

// connect gorouter to cells
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'gorouter',
	node => node.group === PROCESS_GROUP && node.data.name === 'garden',
);

// connect gorouters together
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'gorouter',
	node => node.group === PROCESS_GROUP && node.data.name === 'gorouter',
);

// connect route-emitter to gorouter
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'route_emitter',
	node => node.group === PROCESS_GROUP && node.data.name === 'gorouter',
);

// connect route-emitter to bbs
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'route_emitter',
	node => node.group === PROCESS_GROUP && node.data.name === 'bbs',
);

// connect bbs to tps_watcher
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'bbs',
	node => node.group === PROCESS_GROUP && node.data.name === 'tps_watcher',
);

// connect bbs to auctioneer
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'bbs',
	node => node.group === PROCESS_GROUP && node.data.name === 'auctioneer',
);

// connect auctioneer to rep
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'auctioneer',
	node => node.group === PROCESS_GROUP && node.data.name === 'rep',
);

// connect rep to garden (on same vm)
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'rep',
	(node, fromNode) => node.group === PROCESS_GROUP && node.data.name === 'garden' && fromNode.vm == node.vm,
);

// connect rep to metron (on same vm)
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'rep',
	(node, fromNode) => node.group === PROCESS_GROUP && node.data.name === 'metron_agent' && fromNode.vm == node.vm,
);

// connect consul nodes together
connect(
	node => node.group === VM_GROUP && node.data.job_name === 'consul',
	node => node.group === VM_GROUP && node.data.job_name === 'consul',
);

// connect consul_agent to consul vms
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'consul_agent',
	node => node.group === VM_GROUP && node.data.job_name === 'consul',
	{physics: false, color: {opacity: 0.2}},
);

// connect logstash queues to parsers
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'queue_redis',
	node => node.group === PROCESS_GROUP && node.data.name === 'parser',
);

// connect metrons to dopplers (in same az)
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'metron_agent',
	(node, fromNode) => node.group === PROCESS_GROUP && node.data.name === 'doppler' && node.az == fromNode.az,
	{physics: false, color: {opacity: 0.2}},
);

// connect dopplers to traffic controller
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'doppler',
	node => node.group === PROCESS_GROUP && node.data.name === 'loggregator_trafficcontroller',
	{physics: false, color: {opacity: 0.2}},
);

// connect dopplers to reverse_log_proxy
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'doppler',
	node => node.group === PROCESS_GROUP && node.data.name === 'reverse_log_proxy',
);

// connect reverse_log_proxys to syslog adapters
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'reverse_log_proxy',
	node => node.group === PROCESS_GROUP && node.data.name === 'adapter',
);

// connect kibana to elastic search
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'kibana',
	node => node.group === INTERNAL_ELB_GROUP && /logsearch-es-master$/.test(node.data.LoadBalancerName),
);

// connect curator to elastic search instances
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'curator',
	node => node.group === PROCESS_GROUP && node.data.name === 'elasticsearch',
);

// connect ingestors to queue (in same az)
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'ingestor_syslog',
	(node, fromNode) => node.group === PROCESS_GROUP && node.data.name === 'queue_redis' && node.az == fromNode.az,
);

// connect parsers to elastic
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'parser',
	(node, fromNode) => node.group === PROCESS_GROUP && node.data.name === 'elasticsearch' && node.az == fromNode.az,
);

// connect all vms to ingestor lb
connect(
	node => node.group === VM_GROUP,
	node => node.group === INTERNAL_ELB_GROUP && /logsearch-ingestor$/.test(node.data.LoadBalancerName),
	{physics: false, color: {opacity: 0.2}},
);

// connect cc to uaa
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'cloud_controller_ng',
	node => node.group === PROCESS_GROUP && node.data.name === 'uaa',
);

// connect cc to cdn-broker
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'cloud_controller_ng',
	node => node.group === INTERNAL_ELB_GROUP && /cdn-broker$/.test(node.data.LoadBalancerName),
);

// connect cc to rds-broker
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'cloud_controller_ng',
	node => node.group === INTERNAL_ELB_GROUP && /rds-broker$/.test(node.data.LoadBalancerName),
);

// connect cc to elasticache-broker
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'cloud_controller_ng',
	node => node.group === INTERNAL_ELB_GROUP && /elasticache-broker$/.test(node.data.LoadBalancerName),
);

// connect cc to cc-workers
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'cloud_controller_ng',
	node => node.group === PROCESS_GROUP && /^cloud_controller_worker_/.test(node.data.name),
);

// connect nats together
connect(
	node => node.group === PROCESS_GROUP && node.data.name === 'nats',
	node => node.group === PROCESS_GROUP && node.data.name === 'nats',
);

// connect all vms to nats (bosh uses it for healthcheck)
connect(
	node => node.group === VM_GROUP,
	(node, fromNode) => node.group === PROCESS_GROUP && node.data.name === 'nats' && node.az == fromNode.az,
	{physics: false, color: {opacity: 0.2}},
);

// Draw it
const options = {
	groups: {
		[EXTERNAL_ELB_GROUP]: {
			shape: 'diamond',
			color: {background: '#2B7CE9'},
			borderWidth: 3,
			font: {
				color: '#E6E7E8',
				face: 'monospace',
			},
		},
		[INTERNAL_ELB_GROUP]: {
			shape: 'diamond',
			color: {background: colors.green},
			borderWidth: 1,
			font: {
				color: '#E6E7E8',
				face: 'monospace',
			},
		},
		[VM_GROUP]: {
			shape: 'box',
			borderWidth: 0,
			font: {
				color: '#E6E7E8',
				face: 'monospace',
			},
			shadow: true,
		},
		[PROCESS_GROUP]: {
			shape: 'hexagon',
			borderWidth: 1,
			font: {
				color: '#E6E7E8',
				face: 'monospace',
			},
		},
		[PUBLIC_GROUP]: {
			shape: 'star',
			color: {background: 'white'},
			borderWidth: 3,
			font: {
				color: '#E6E7E8',
				face: 'monospace',
			},
		},
	},
	layout: {
		improvedLayout: false,
		hierarchical: {
			enabled: false,
			levelSeparation: 50,
			nodeSpacing: 10,
			treeSpacing: 10,
			blockShifting: false,
			edgeMinimization: false,
			parentCentralization: true,
			direction: 'UD', // UD, DU, LR, RL
			sortMethod: 'directed', // hubsize, directed
		},
	},
	physics: {
		enabled: true,
		solver: 'forceAtlas2Based',
		stabilization: {
			enabled: true,
			iterations: 1000,
			updateInterval: 100,
		},
	},
};
const container = document.getElementById('main');
const network = new vis.Network(container, {
	nodes: nodes,
	edges: edges,
}, options);
