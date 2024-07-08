import { Counter } from "./Counter";
import Logo from "./logo.png";
import "./style.css";
import { runTask, getCronTasks } from "#internal/nitro/task";

async function runMyTask() {
	"use server";
	console.log("every minute these tasks run: ", await getCronTasks('* * * * *'))
	await runTask("my-task")
}

export default function App({ assets, scripts }) {
	return (
		<html lang="en">
			<head>
				<link
					rel="icon"
					href={`${import.meta.env.SERVER_BASE_URL}/favicon.ico`}
				/>
				{assets}
			</head>
			<body>
				<section>
					<h1>Hello AgentConf with ya asdo!!!</h1>
					<img src={Logo} />
					<Counter />
					<button class="ml-4 bg-red-500" onclick={() => runMyTask()}>Run my task</button>
				</section>
				{scripts}
			</body>
		</html>
	);
}
