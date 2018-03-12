const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors"); // for access-control
const rooms = require("./routes/rooms");
const axios = require("axios");
const SessionSockets = require("session.socket.io");

const roomsArrays = require("./roomsArray");

// our localhost port
const port = 4001;

const app = express();

// our server instance
const server = http.createServer(app);

// This creates our socket using the instance of the server
const io = socketIO(server);

// for access-control, use it before all route definitions
app.use(cors({ origin: "*" }));
app.use("/rooms", rooms);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error("Not Found");
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

// This is what the socket.io syntax is like, we will work this later
io.sockets.on("connection", socket => {
  console.log("client connected ", socket.id);
  socket.emit("message", "You are connected!");

  socket.on("message", msg => {
    console.log(msg);
  });
  socket.on("bingo join", (room, maxUser) => {
    socket.room = room;
    socket.join(socket.room);
    const clients = io.sockets.adapter.rooms[socket.room];
    console.log(`\nclient join ${room}`);

    console.log(
      `The number of user in room=${socket.room}: ${
        clients.length
      } out of ${maxUser}`
    );
    if (clients.length > maxUser) {
      console.log("Full");
      return socket.emit("Room Full", true);
    }
    if (clients.length === 1) {
      socket.role = "host";
      socket.emit("your role", socket.role);
    } else {
      socket.role = "guest";
      socket.emit("your role");
    }
    socket.broadcast.to(socket.room).emit("new user", socket.id);
  });
  socket.on("username change", username => {
    console.log(`\nUsername is changed from ${socket.username}`);
    socket.username = username;
    console.log(`to ${socket.username}`);
    socket.broadcast
      .to(socket.room)
      .emit("username change", { id: socket.id, username });
  });
  socket.on("bingo start", (size, room_id) => {
    const room = `${room_id}`;
    console.log(`\nbingo start room: ${room}`);
    socket.broadcast.to(room).emit("bingo start", size);
    /* 
    const clients = io.sockets.adapter.rooms[room];
    const clientIds = Object.keys(clients.sockets);
    const nextTurn = clientIds[0];
    io.to(nextTurn).emit("your turn", true); */
  });
  socket.on("number select", (value, room_id) => {
    console.log("\nSeleceted number is", value);
    const room = `${room_id}`;
    const clients = io.sockets.adapter.rooms[room];
    const clientIds = Object.keys(clients.sockets);
    const whosTurnIndex = clientIds.findIndex(key => {
      return key === socket.id;
    });
    if (whosTurnIndex > -1) {
      let nextTurn = clientIds[0];
      if (whosTurnIndex + 1 < clients.length) {
        nextTurn = clientIds[whosTurnIndex + 1];
      }
      console.log("now turn ", clientIds[whosTurnIndex]);
      console.log("next turn", nextTurn);
      io.to(nextTurn).emit("your turn", true);
      socket.broadcast.to(room).emit("number selected", value);
    }
  });
  socket.on("bingo end", (message, room_id) => {
    console.log("bingo end");
    const room = `${room_id}`;
    socket.broadcast.to(room).emit("bingo end", message);
  });

  socket.on("bingo leave", room_id => {
    socket.leave(socket.room);
    const clients = io.sockets.adapter.rooms[socket.room];
    console.log(`\nClient left from ${socket.room}`);
    if (clients !== undefined) {
      console.log(`The number of user in ${socket.room}: ${clients.length}`);
    } else {
      if (roomsArrays.length > 0) {
        const index = roomsArrays.findIndex(room => {
          return room.id === socket.room;
        });
        if (index !== -1) {
          roomsArrays.splice(index, 1);
          console.log(`${socket.room} has been destroyed.`);
        }
      }
    }
  });

  // disconnect is fired when a client leaves the server
  socket.on("disconnect", () => {
    console.log("\nuser disconnected");
    socket.leave(socket.room);
    const clients = io.sockets.adapter.rooms[socket.room];
    console.log(`\nClient left from ${socket.room}`);
    if (clients !== undefined) {
      console.log(`The number of user in ${socket.room}: ${clients.length}`);
    } else {
      if (roomsArrays.length > 0) {
        const index = roomsArrays.findIndex(room => {
          return room.id === socket.room;
        });
        if (index !== -1) {
          roomsArrays.splice(index, 1);
          console.log(`Room: ${socket.room} has been destroyed.`);
        }
      }
    }
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
