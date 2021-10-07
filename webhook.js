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

  if (!fs.existsSync(__dirname + "/scripts/" + req.params.site + ".sh")) {
    const err = new Error();
    err.status = 401;
    return next(err);
  }
  next();
};

// -----------------------------------------------------------------------------

const executeScript = (req, res, next) => {
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
  let shellCommand = `ts sh ${__dirname}/scripts/${req.params.site}.sh ${args}`;

  // Start deployment process
  console.log("Queuing script:", shellCommand);

  // Execute our shell script
  exec(shellCommand, function (error, stdout, stderr) {
    console.log(stdout); // feedback
    if (stderr) console.log("stderr: " + stderr); // oh noes
    if (error) {
      error.status = 500;
      return next(error);
    } else {
      req.webhookResponse = stdout;
    }
    console.log("script complete.");
    return next();
  });
};

// -----------------------------------------------------------------------------

const app = express();
app.disable("x-powered-by");

app.get(["/", "/favicon.ico"], (req, res, next) => {
  res.status = 200;
  res.send();
});

app.get("/:site", validateRequest, executeScript, (req, res, next) => {
  res.status = 200;
  res.send(req.webhookResponse);
});

app.post("/:site", validateRequest, executeScript, (req, res, next) => {
  res.status = 200;
  res.send(req.webhookResponse);
});

// error handler
app.use(function (err, req, res, next) {
  res.status(err.status ? err.status : 500);
  res.send(err.message);
});

const server = app.listen(process.env.PORT || 8080, function () {
  console.log("Listening on port %d", server.address().port);
});
