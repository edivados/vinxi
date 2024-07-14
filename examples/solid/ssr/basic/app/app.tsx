import { Counter } from "./Counter";
import Logo from "./logo.png";
import "./style.css";
import { getUserData, runMyTask } from "./actions";

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
					<button class="ml-4 bg-red-500" onclick={() => getUserData().then(data => console.log(data))}>Fetch cached data</button>
				</section>
				{scripts}
			</body>
		</html>
	);
}
