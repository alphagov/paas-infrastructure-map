import * as express from 'express';
import * as basicAuth from 'express-basic-auth';
import * as fs from 'fs';
import * as nunjucks from 'nunjucks';
import {getConfig} from './config';
import {getSnapshot} from './snapshot';
import {getInitialState, IAppState} from './state';

const cfg = getConfig();

type AsyncHandler = (req: express.Request, res: express.Response) => Promise<string>;

async function fetchSnapshot(state: IAppState, url: string): Promise<IAppState> {
	const snapshot = await getSnapshot(url);
	const {infrastructure, ...restState} = state;
	const {azs, lbs, ...restInfra} = infrastructure;
	return {
		infrastructure: {
			azs: [...azs, ...snapshot.bosh.azs.map(az => ({
				instances: snapshot.bosh.instances.filter(vm => vm.az === az.name).map(vm => ({
					ec2: snapshot.aws.ec2.find(ec2 => ec2.InstanceId === vm.vm_cid),
					vm_type_details: snapshot.bosh.vm_types.find(t => t.name === vm.vm_type),
					...vm,
				})),
				...az,
			}))],
			lbs: [...lbs, ...snapshot.aws.elbs.map(elb => ({
				boshName: '',
				...elb,
			}))],
		 ...restInfra,
		},
		...restState,
	};
}

async function handler(req: express.Request, _res: express.Response): Promise<string> {
	let state = getInitialState();
	state = await fetchSnapshot(state, cfg.snapshotURL);
	return req.query.graph ? render2(state) : render(state);
}

function sync(asyncHandler: AsyncHandler): express.Handler {
	return (req: express.Request, res: express.Response) => {
		asyncHandler(req, res)
			.then(output => res.send(output))
			.catch(err => {
				const trace = err.stack || err.toString();
				res.status(500).send(`<pre>${trace}</pre>`);
				console.error(err);
			});
	};
}

function render2(state: IAppState): string {
	return `<!doctype html>
		<html lang="en">
			<head>
				<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<title>Map</title>
				<script src="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.js"></script>
				<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/vis/4.21.0/vis.min.css"/>
			</head>
			<body style="margin:0; padding:0;">
			<div id="main" style="width:100vw; height:100vh; background-color: #273747;">
			</div>
			<script>
				window.app = {state: ${JSON.stringify(state)}};
			</script>
			<script src="/graph.js"></script>
			</body>
		</html>
	`;
}

function abbr(s: string): string {
	let out = s.replace(/[_\-.]/g, ' ');
	out = out.split(/\s/).map(word => word[0]).join('').toUpperCase();
	if (out.length < 2) {
		out = s.slice(0, 3).toUpperCase();
	}
	return out;
}

function render(state: IAppState): string {
	const env = new nunjucks.Environment();
	env.addFilter('abbr', abbr);
	return env.renderString(`<!doctype html>
		<html lang="en">
			<head>
				<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1">
				<title>DIM</title>
				<style>
					body, html {
						font-size: 10px;
						background-color: #273747;
						font-family: monospace;
						color: #E6E7E8;
					}
					body * {
						box-sizing: border-box;
					}
					.label {
					}
					main {
						position: absolute;
						top: 0;
						left: 0;
						bottom: 0;
						right: 0;
						height: 100%;
					}
					.lbs {
						display: flex;
						flex-direction: row;
						margin-bottom: 10px;
					}
					.lb {
						flex: 1;
						padding: 1px;
						border: 1px solid #555;
						margin: 2px;
						text-align: center;
					}
					.azs {
						display: flex;
						flex-direction: row;
						align-items: flex-start;
						height: 90%;
					}
					.az {
						flex: 1;
						border-right: 2px dashed rgba(255,255,255,0.5);
						padding: 5px;
						height: 100%;
					}
					.az:last-child {
						border-right: none;
					}
					.vms {
						display: flex;
						flex-direction: column;
						height: 100%;
						justify-content: flex-start;
					}
					.vm {
						flex: 0;
					}
					.vm-box {
						border: 1px solid #555;
						margin: 2px;
						padding: 2px;
					}
					.processes {
						display: flex;
						flex-direction: row;
						justify-content: flex-start;
					}
					.process {
						flex: 0 1 20px;
						height: 100%;
						padding: 3px;
						border: 1px solid #555;
						margin: 2px;
						text-align: center;
						font-size: 8px;
					}
					.ok {
						background: #2ECC71;
					}
					.notok {
						background: #E74C3C;
					}
					.vm-label {
						text-decoration: none;
						color: black;
						display: inline-block;
						flex: 0 0 200px;
						vertical-align: middle;
						font-size: 14px;
					}
					.process-label {
						color: #555;
					}
					.az-label {
						text-align: center;
						padding-bottom: 10px;
					}
				</style>
			</head>
			<body>
				<main>
					<div class="lbs">
						{% for lb in infrastructure.lbs %}
							<div class="lb">
								<div class="label">
									{{ lb.LoadBalancerName }}
								</div>
							</div>
						{% endfor %}
					</div>
					<div class="azs">
						{% for az in infrastructure.azs %}
							<div class="az">
								<div class="label az-label">
									{{ az.name }} / {{ az.cloud_properties.availability_zone }}
								</div>
								<div class="vms">
									{% for vm in az.instances %}
										<div class="vm">
											<div class="vm-box {{ "ok" if vm.state == "started" else "notok" }}">
												<div class="processes">
													<a class="label vm-label" href="https://eu-west-1.console.aws.amazon.com/ec2/v2/home?region=eu-west-1#Instances:search={{vm.vm_cid}};sort=desc:tag:Name">
														{{ vm.job_name }}
													</a>
													{% for process in vm.processes %}
														<div class="process {{ "ok" if process.state == "running" else "notok" }}">
															<div class="label process-label">
																<span title="{{ process.name }}">{{ process.name | abbr }}</span>
															</div>
														</div>
													{% endfor %}
												</div>
											</div>
										</div>
									{% endfor %}
								</div>
							</div>
						{% endfor %}
					</div>
					<div style="text-align:center">
						<a style="font-size:12px; color:rgba(255,255,255,0.1); text-decoration: none;" href="/?graph=true">view constellation</a>
					</div>
				</main>
			</body>
		</html>`, state);
}

function main() {
	const app = express();

	if (cfg.basicAuthPassword) {
		app.use(basicAuth({
			users: {
				[cfg.basicAuthUsername || 'admin']: cfg.basicAuthPassword,
			},
		}));
	}

	app.get('/', sync(handler));

	app.get('/snapshot', (_req: express.Request, res: express.Response) => {
		fetchSnapshot(getInitialState(), cfg.snapshotURL)
			.then(state => res.json(state))
			.catch(err => console.error(err));
	});

	app.get('/graph.js', (_req: express.Request, res: express.Response) => {
		res.send(fs.readFileSync('./src/graph.js'));
	});

	app.listen(5000);
}

main();
