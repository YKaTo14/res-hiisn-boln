const express = require("express");
const client = require("prom-client");

const app = express();
const PORT = 3000;

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: "myapp_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

const activeUsers = new client.Gauge({
  name: "myapp_active_users",
  help: "Fake active users",
});

const requestDuration = new client.Histogram({
  name: "myapp_request_duration_seconds",
  help: "Request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.1, 0.3, 0.5, 1, 2, 5],
});

setInterval(() => {
  activeUsers.set(Math.floor(Math.random() * 100));
}, 3000);

app.use((req, res, next) => {
  const end = requestDuration.startTimer();

  res.on("finish", () => {
    httpRequestsTotal.inc({
      method: req.method,
      route: req.path,
      status_code: String(res.statusCode),
    });

    end({
      method: req.method,
      route: req.path,
      status_code: String(res.statusCode),
    });
  });

  next();
});

app.get("/", (req, res) => {
  res.send("Hello from test server");
});

app.get("/users", async (req, res) => {
  await new Promise((resolve) =>
    setTimeout(resolve, 200 + Math.random() * 800),
  );

  res.json([
    { id: 1, name: "user1" },
    { id: 2, name: "user2" },
    { id: 3, name: "user3" },
  ]);
});

app.get("/error", (req, res) => {
  res.status(500).json({ message: "test error" });
});

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
});

app.listen(PORT, () => {
  console.log(`app listening on http://localhost:${PORT}`);
  console.log(`metrics available at http://localhost:${PORT}/metrics`);
});
