require("dotenv").config();
const exec = require("child_process").exec;
const express = require("express");
const fs = require("fs");

// -----------------------------------------------------------------------------

const validateRequest = (req, res, next) => {
  if (!req.query.token) {
    const err = new Error();
    err.status = 401;
    return next(err);
  }

  if (!process.env["TOKEN"]) {
    const err = new Error();
    err.status = 401;
    return next(err);
  }

  if (req.query.token !== process.env["TOKEN"]) {
    const err = new Error("Invalid token");
    err.status = 401;
    return next(err);
  }
  next();
};

// -----------------------------------------------------------------------------

const executeCommand = (command, req, next, info) => {
  exec(command, function (error, stdout, stderr) {
    if (info) {
      console.log(info);
    }

    if (stderr) {
      console.log("stderr: " + stderr);
    }

    if (error) {
      error.status = 500;
      return next(error);
    } else {
      req.webhookResponse = stdout;
    }
    return next();
  });
};

// -----------------------------------------------------------------------------

const executeScript = (req, res, next) => {
  if (!fs.existsSync(__dirname + "/scripts/" + req.params.script + ".sh")) {
    const err = new Error();
    err.status = 401;
    return next(err);
  }

  const args = Object.keys(req.query)
    .filter((key) => key !== "token")
    .map((key) => {
      const value = req.query[key];
      switch (value) {
        case "true":
          return `--${key}`;
        case "false":
          return;
        default:
          return `--${key}=${req.query[key]}`;
      }
    })
    .join(" ");
  let shellCommand = `ts sh ${__dirname}/scripts/${req.params.script}.sh ${args}`;

  // Execute our shell script
  executeCommand(
    shellCommand,
    req,
    next,
    `${new Date().toISOString()} - Running: ${shellCommand}`,
  );
};

// -----------------------------------------------------------------------------

const sendCommandOutputAsResponse = (req, res, next) => {
  res.status = 200;
  res.send(req.webhookResponse);
};

// -----------------------------------------------------------------------------

const app = express();
app.disable("x-powered-by");

// -----------------------------------------------------------------------------

app.get(["/", "/favicon.ico"], (req, res, next) => {
  res.status = 200;
  res.send();
});

// -----------------------------------------------------------------------------
// Logging from ts
// -----------------------------------------------------------------------------

app.get(
  "/logs",
  validateRequest,
  (req, res, next) => executeCommand("ts -l", req, next),
  sendCommandOutputAsResponse,
);

// -----------------------------------------------------------------------------

app.get(
  "/logs/:id",
  validateRequest,
  (req, res, next) => executeCommand(`ts -c ${req.params.id}`, req, next),
  sendCommandOutputAsResponse,
);

// -----------------------------------------------------------------------------

app.delete(
  "/logs",
  validateRequest,
  (req, res, next) =>
    executeCommand(
      `ts | grep finished | /usr/bin/awk '{ print $3 }' | xargs rm -f && ts -C`,
      req,
      next,
    ),
  sendCommandOutputAsResponse,
);

// -----------------------------------------------------------------------------
// Script routes
// -----------------------------------------------------------------------------

app.get("/:script", validateRequest, executeScript, sendCommandOutputAsResponse);

// -----------------------------------------------------------------------------

app.post("/:script", validateRequest, executeScript, sendCommandOutputAsResponse);

// -----------------------------------------------------------------------------
// error handler
// -----------------------------------------------------------------------------
app.use(function (err, req, res, next) {
  res.status(err.status ? err.status : 500);
  res.send(err.message);
});

const server = app.listen(process.env.PORT || 8080, function () {
  console.log("Listening on port %d", server.address().port);
});
