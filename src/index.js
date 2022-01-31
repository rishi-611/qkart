const mongoose = require("mongoose");
const app = require("./app");
const config = require("./config/config");
const logger = require("./config/logger");
const colors = require("colors/safe");

let server;

// TODO: CRIO_TASK_MODULE_UNDERSTANDING_BASICS - Create Mongo connection and get the express app to listen on config.port
mongoose
  .connect(config.mongoose.url, config.mongoose.options)
  .then(() => console.log(colors.blue.bold(`database running at  ${config.mongoose.url}`)))
  .catch(() => console.log(colors.red.bold("could not connect to database")));

app.listen(config.port, (err)=>{
  if(err){
    console.log(err);
    return console.log(colors.red.bold("could not start server"));
  } 

  console.log(colors.yellow.bold(`server listening on port  ${config.port}`));
})

// ------------- Don't Modify  -------------
const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info("Server closed");
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};

const unexpectedErrorHandler = (error) => {
  logger.error(error);
  exitHandler();
};

process.on("uncaughtException", unexpectedErrorHandler);
process.on("unhandledRejection", unexpectedErrorHandler);

process.on("SIGTERM", () => {
  logger.info("SIGTERM received");
  if (server) {
    server.close();
  }
});
// ------------- Don't Modify  -------------
