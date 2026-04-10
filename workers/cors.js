export function getCorsHeaders(request, env) {
	const headers = new Headers();
	const origin = request.headers.get("Origin");
	if (!origin || origin === "null") return headers;
	const allowedList = env.ALLOWED_DOMAINS.split(",").map(d => d.trim());
	const isAllowed = allowedList.some(t => !!(origin === t||origin.endsWith("." + t)||origin.endsWith("://" + t)));
	isAllowed &&headers.set("Access-Control-Allow-Origin", origin);
	headers.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
	headers.set("Access-Control-Allow-Headers", "Content-Type, Range, Authorization");
	headers.set("Access-Control-Expose-Headers", "Content-Length, Content-Range, X-File-List");
	return headers;
}