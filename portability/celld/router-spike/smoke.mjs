const baseUrl = process.env.CELLD_URL ?? "http://127.0.0.1:8790";

const apiResponse = await fetch(`${baseUrl}/api/probe`);
if (!apiResponse.ok) {
  throw new Error(`API probe failed: ${apiResponse.status} ${await apiResponse.text()}`);
}

const api = await apiResponse.json();
if (api.component !== "router-spike-backend" || api.path !== "/api/probe") {
  throw new Error(`Unexpected API response: ${JSON.stringify(api)}`);
}

const assetResponse = await fetch(`${baseUrl}/`);
const asset = await assetResponse.text();
if (!assetResponse.ok || !asset.includes("Cloudflare OS router assets work on celld.")) {
  throw new Error(`Asset probe failed: ${assetResponse.status} ${asset}`);
}

console.log("PASS router -> celld service binding -> backend");
console.log("PASS router -> celld static assets");
