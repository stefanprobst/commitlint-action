import { debug, getInput, setFailed } from "@actions/core";
import { context, getOctokit } from "@actions/github";
import lint from "@commitlint/lint";
import load from "@commitlint/load";
import type { PullRequestEvent, PushEvent } from "@octokit/webhooks-types";

const client = getOctokit(getInput("token", { required: true }));

run()
	.then(() => {
		// eslint-disable-next-line no-console
		console.info("✅ ", "All good.");
	})
	.catch((error: Error) => {
		setFailed(error.message);
	});

async function run() {
	const commits = await getCommits();

	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	const cwd = process.env["GITHUB_WORKSPACE"]!;
	const config = await load({}, { cwd });

	if (Object.keys(config.rules).length === 0) {
		throw new Error("No commitlint config found.");
	}

	debug(`Linting ${commits.length} commits.`);

	const report = {
		isValid: true,
		messages: [] as Array<string>,
	};

	for (const commit of commits) {
		debug(`Linting commit ${commit.sha} with message "${commit.message}".`);

		const result = await lint(
			commit.message,
			config.rules,
			// @ts-expect-error This is copied from the docs.
			config.parserPreset ? { parserOpts: config.parserPreset.parserOpts } : {},
		);

		report.isValid &&= result.valid;

		if (result.errors.length === 0 && result.warnings.length === 0) continue;

		report.messages.push(
			[
				`input: "${result.input}"`,
				...result.errors.map((error) => {
					return `✖ ${error.message} [${error.name}]`;
				}),
				...result.warnings.map((warning) => {
					return `⚠ ${warning.message} [${warning.name}]`;
				}),
			].join("\n"),
		);
	}

	// eslint-disable-next-line no-console
	console.log(report.messages.join("\n\n"));

	if (!report.isValid) {
		throw new Error("Encountered invalid commit messages.");
	}
}

async function getCommits() {
	switch (context.eventName) {
		case "pull_request": {
			const payload = context.payload as PullRequestEvent;
			const { data: commits } = await client.rest.pulls.listCommits({
				...context.repo,
				pull_number: payload.pull_request.number,
			});
			return commits.map((commit) => {
				return { message: commit.commit.message, sha: commit.sha };
			});
		}

		case "push": {
			const payload = context.payload as PushEvent;
			const commits = payload.commits;
			return commits.map((commit) => {
				return { message: commit.message, sha: commit.id };
			});
		}

		default: {
			throw new Error(`Unsupported event type: ${context.eventName}.`);
		}
	}
}
