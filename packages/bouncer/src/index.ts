const http = require("http");
const https = require("https");

// Define the mapping of alias host to target host
const aliasToTarget = {
  "alias.example.com": "http://localhost:3000", // Example alias to target mapping
  "another-alias.example.com": "http://localhost:4000",
};

// Create the reverse proxy server
const server = http.createServer((req, res) => {
  const target = aliasToTarget[req.headers.host]; // Determine the target based on the host header

  if (!target) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found: No mapping for this host");
    return;
  }

  const targetUrl = new URL(target);
  const options = {
    hostname: targetUrl.hostname,
    port: targetUrl.port,
    path: req.url,
    method: req.method,
    headers: req.headers,
  };

  // Choose HTTP or HTTPS based on the target protocol
  const proxyRequest = (targetUrl.protocol === "https:" ? https : http).request(
    options,
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyRequest.on("error", (err) => {
    console.error(`Error proxying request to ${target}:`, err.message);
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end("Bad Gateway");
  });

  // Pipe the incoming request body to the target server
  req.pipe(proxyRequest, { end: true });
});
