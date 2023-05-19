// Core
import { Buffer } from 'node:buffer';

// Packages
import dotenv from "dotenv-safe";

// Types
import { VercelRequest, VercelResponse } from "@vercel/node";
import { Verify } from "crypto";
import { fileURLToPath } from 'node:url';

type Entry = {
	".tag": "file" | "folder";
	name: string;
	path_lower: string;
	path_display: string;
	id: string;
	client_modified: string;
	server_modified: string;
	rev: string;
	size: number;
	is_downloadable: boolean;
	content_hash: string;
}

type FileList = {
	entries: Entry[];
	cursor: string;
	has_more: boolean;
}

type File = {
	name: string;
	path: string;
}

// Set up env
dotenv.config();

export default function (req: VercelRequest, res: VercelResponse) {
	if (req.method == "GET") return get(req, res);
	if (req.method == "POST") return post(req, res);
	res.setHeader("Allow", "GET, POST");
	res.status(405).end();
}

async function get(req:VercelRequest, res:VercelResponse) {
	const requestedFile = req.query.file;
	const fileListResponse = await fetchFileList();
	if (fileListResponse.ok) {
		const fileList:FileList = await fileListResponse.json();
		const files:File[] = [];
		let content = "";
		let html = "";
		for (const entry of fileList.entries) {
			if (entry[".tag"] == "folder") continue;
			files.push({
				name: entry.name,
				path: entry.path_lower,
			})
		}
		if (typeof requestedFile == 'string') {
			const fileResponse = await fetchFile(requestedFile);
			if (fileResponse.ok) {
				content = await fileResponse.text();
			}
			html = getHtml(files, content, requestedFile);
		} else {
			html = getHtml(files);
		}
		return res.status(200).send(html);
	} else {
		return res.status(fileListResponse.status).end('Could not get file list');
	}
}

async function post(req:VercelRequest, res:VercelResponse) {
	if (typeof req.body.content == 'string' && typeof req.query.file == 'string') {
		const content = req.body.content;
		const requestedFile = req.query.file;
		const uploadResponse = await uploadFile(requestedFile, content);
		if (uploadResponse.ok) {
			return res.status(204).setHeader("Location", "/?file=" + requestedFile).end();
		} else {
			console.error(await uploadResponse.text());
			return res.status(uploadResponse.status).end('Something went wrong. Data may be lost');
		}
	} else {
		return res.status(400).end('File name and/or content missing')
	}
}

function fetchFileList() {
	return fetch("https://api.dropboxapi.com/2/files/list_folder", {
		method: "post",
		headers: {
			"Authorization": "Bearer " + process.env.DROPBOX_ACCESS_TOKEN,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			"path": "",
			"include_non_downloadable_files": false,
		})
	})
}

function fetchFile(path:string) {
	return fetch("https://content.dropboxapi.com/2/files/download", {
		method: "post",
		headers: {
			"Authorization": "Bearer " + process.env.DROPBOX_ACCESS_TOKEN,
			"Dropbox-API-Arg": JSON.stringify({ path })
		}
	})
}

function uploadFile(path:string, content:string) {
	const data = Buffer.from(content);
	return fetch('https://content.dropboxapi.com/2/files/upload', {
		method: 'post',
		body: data,
		headers: {
			"Authorization": "Bearer " + process.env.DROPBOX_ACCESS_TOKEN,
			'Dropbox-API-Arg': JSON.stringify({
				path,
				mode: "overwrite",
				autorename: true,
			}),
			"Content-Type": "application/octet-stream",
		}
	})
}

function getHtml(files:File[], content?:string, fileName?:string) {
	return `<!doctype html>
	<html>
		<head>
			<title>${ fileName ? fileName + " – " : "" }dropbox-md-cms</title>
			<meta name=charset content="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
			<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2016%2016'%3E%3Ctext%20x='0'%20y='14'%3E✏️%3C/text%3E%3C/svg%3E" type="image/svg+xml" />
			<style>
				:root { --grey: #999; --lightgrey: #ddd; }
				* { box-sizing: border-box }
				body { margin: 0; overflow: hidden; font: 1em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; line-height: 1.3; }
				button { font: 1.25em -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: white; border-radius: 0.25em; border: 0; background: #07f; }
				.button--save { position: fixed; right: 2rem; bottom: 2rem; padding: .5rem 1rem; }
				textarea { font: 1em "JetBrains Mono", monospace; width: 100vw; height: 100vh; padding: 2rem; resize: none; outline: none; border: none; }
				nav { position: fixed; right: 1rem; top: 1rem; display: flex; flex-direction: column; justify-content: space-between; width: 15rem; height: 50vh; box-shadow: 0 0.0625em 0.25em rgba(0, 0, 0, 0.3); padding: 1rem; background: white; overflow-y: auto; border-radius: 0.25rem; }
				nav ul { margin: 0; padding: 0; list-style: none; }
				nav li { display: flex; justify-content: space-between; }
				a { color: #07f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
				a[href^=http]:before { content: '↗ '; }
				p { margin: 0 0 0.5rem; padding: 0 0 0.25rem; }
				textarea[disabled] { color: var(--grey); }
				button[disabled] { color: var(--grey); background: var(--lightgrey); }
			</style>
		</head>
		<body>
			<form method="post" ${ fileName && "action=\"/?file=" + fileName + "\"" }>
				<textarea ${ !fileName && "disabled=disabled" } data-content-editor spellcheck="false" name="content" autofocus placeholder="${ fileName ? "TYPE STUFF" : "CHOOSE A FILE -> OR CREATE ONE BY ADDING /?file=/myfile.md IN THE URL ↑" }">${content || ''}</textarea>
				<button ${ !fileName && "disabled=disabled" } class="button--save">${fileName ? "Save to " + fileName : "Can’t save dude"}</button>
			</form>
			<nav>
				<ul>
					<li>${ files.map((file) => "<a data-file-link href=\"/?file=" + file.path + "\">" + file.name + "</a>").join("</li><li>") }</li>
				</ul>
			</nav>
		</body>
		<script>
			window.addEventListener('DOMContentLoaded', () => {
				const fileLinks = document.querySelectorAll('[data-file-link]');
				const contentEditor = document.querySelector('[data-content-editor]');
				fileLinks.forEach((link) => {
					link.addEventListener('click', () => {
						contentEditor.setAttribute('disabled', 'disabled');
						contentEditor.innerText = 'Loading...';
					});
				});
			});
		</script>
	</html>`;
}
