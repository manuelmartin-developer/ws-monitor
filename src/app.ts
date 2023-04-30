require("dotenv").config();
import express, { Application, Request, Response, NextFunction } from "express";
import { WebSocketServer } from "ws";
import morgan from "morgan";
import { log, black, cyan } from "console-log-colors";
import cors from "cors";
import si from "systeminformation";

// Express app
const app: Application = express();
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true
  })
);
const corsOpts = {
  origin: [
    "https://www.manuelmartin.dev",
    "https://manuelmartin.dev",
    "http://localhost:3000"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Middlewares
app.use(cors(corsOpts));
app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms", {
    stream: {
      write: (message) => {
        log(message, "cyan");
      }
    }
  })
);
app.use(express.static("public"));

//error handling
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.log(cyan.bgRed("Error: " + error.message));
  const status = error.statusCode || 500;
  const message = error.message;
  res.status(status).json({ message: message });
});

// Websocket server
const wsServer = new WebSocketServer({
  port: Number(process.env.WS_PORT) || 8081
});
wsServer.on("connection", (socket) => {
  let CPUInterval: NodeJS.Timeout | null = null;
  let RAMInterval: NodeJS.Timeout | null = null;
  let DISKInterval: NodeJS.Timeout | null = null;

  console.log(black.bgMagentaBright("WS Client Connected"));

  socket.on("message", (message) => {
    console.log(black.bgYellow("WS Message Received: " + message));

    if (message.toString() === "STOP") {
      CPUInterval && clearInterval(CPUInterval);
      RAMInterval && clearInterval(RAMInterval);
      DISKInterval && clearInterval(DISKInterval);

      console.log(black.bgRed("WS Client Disconnected"));
    }
    if (message.toString() === "CPU") {
      RAMInterval && clearInterval(RAMInterval);
      DISKInterval && clearInterval(DISKInterval);

      si.currentLoad().then((cpu) => {
        const cpuData = {
          avgLoad: cpu.avgLoad,
          currentLoad: cpu.currentLoad,
          currentLoadIdle: cpu.currentLoadIdle
        };
        socket.send(`CPU: ${JSON.stringify(cpuData)}`);
      });

      CPUInterval = setInterval(async () => {
        const cpu = await si.currentLoad();
        const cpuData = {
          avgLoad: cpu.avgLoad,
          currentLoad: cpu.currentLoad,
          currentLoadIdle: cpu.currentLoadIdle
        };
        socket.send(`CPU: ${JSON.stringify(cpuData)}`);
      }, 60000); // 1 minute
    }
    if (message.toString() === "RAM") {
      CPUInterval && clearInterval(CPUInterval);
      DISKInterval && clearInterval(DISKInterval);

      RAMInterval = setInterval(async () => {
        const mem = await si.mem();
        const memData = {
          total: mem.total / 1024 / 1024 / 1024,
          active: mem.active / 1024 / 1024 / 1024,
          available: mem.available / 1024 / 1024 / 1024
        };
        socket.send(`RAM: ${JSON.stringify(memData)}`);
      }, 1000); // 1 second
    }

    if (message.toString() === "DISK") {
      CPUInterval && clearInterval(CPUInterval);
      RAMInterval && clearInterval(RAMInterval);

      si.fsSize().then((fsSize) => {
        const fsSizeData = {
          size: fsSize[0].size / 1024 / 1024 / 1024,
          available: fsSize[0].available / 1024 / 1024 / 1024
        };
        socket.send(`DISK: ${JSON.stringify(fsSizeData)}`);
      });

      DISKInterval = setInterval(async () => {
        const fsSize = await si.fsSize();
        const fsSizeData = {
          size: fsSize[0].size / 1024 / 1024 / 1024,
          available: fsSize[0].available / 1024 / 1024 / 1024
        };
        socket.send(`DISK: ${JSON.stringify(fsSizeData)}`);
      }, 300000); // 5 minutes
    }
  });
  socket.send("Connected to WS server");
});
