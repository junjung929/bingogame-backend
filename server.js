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

const games = [];

// This is what the socket.io syntax is like, we will work this later
io.sockets.on("connection", socket => {
  console.log("client connected ", socket.id);

  socket.on("bingo join", (room, maxUser) => {
    socket.room = room;
    socket.join(socket.room);
    if (games[room]) {
      Object.assign(games[room], { [socket.id]: { id: socket.id } });
      games[room].length += 1;
    } else {
      Object.assign(games, {
        [room]: { [socket.id]: { id: socket.id }, length: 1 }
      });
    }
    const game = games[room];
    console.log(`\nclient join ${room}`);

    console.log(
      `The number of user in room=${socket.room}: ${
        game.length
      } out of ${maxUser}`
    );
    if (game.length > maxUser) {
      console.log("Full");
      return socket.emit("Room Full", true);
    }
    if (game.length === 1) {
      socket.role = "host";
      socket.isReady = true;
      game[socket.id].isReady = socket.isReady;
      game[socket.id].role = socket.role;
      socket.emit("your role", socket.role);
    } else {
      socket.role = "guest";
      game[socket.id].role = socket.role;
      socket.emit("your role", socket.role);
    }
    // socket.broadcast.to(socket.room).emit("new user", socket.id);
    socket.emit("bingo join", socket.id);
    socket.emit("message", {
      from: "system",
      message: `You joined the game.`,
      textAlign: "center"
    });
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `User(${socket.id}) entered your game.`
    });
    io.sockets.in(socket.room).emit("users update", game);
  });
  socket.on("username change", username => {
    console.log(`\nUsername is changed from ${socket.username}`);
    socket.username = username;
    console.log(`to ${socket.username}`);
    const game = games[socket.room];
    const user = game[socket.id];
    user.username = username;
    user.isReady = socket.isReady;
    io.sockets.in(socket.room).emit("users update", game);
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `User(${socket.id}) changed username to "${username}"`
    });
  });

  socket.on("bingo ready", isReady => {
    console.log(`\n${socket.username} is ${isReady ? "ready" : "not ready"}`);
    const game = games[socket.room];
    const user = game[socket.id];
    user.isReady = isReady;
    let readyCnt = 0;
    for (let i in game) {
      if (game[i].isReady === true) {
        readyCnt++;
      }
    }
    console.log(`${readyCnt} peope are ready in room ${socket.room}`);
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `User(${socket.username}) is ${isReady ? "ready" : "not ready"}.`
    });
    io.sockets.in(socket.room).emit("bingo ready", readyCnt);
    io.sockets.in(socket.room).emit("users update", game);
  });

  socket.on("bingo start", size => {
    const room = socket.room;
    console.log(`\nbingo start room: ${room}`);
    io.sockets.in(room).emit("bingo start", size);
    if (socket.role === "host") {
      socket.emit("whose turn", "you");
      socket.broadcast.to(room).emit("whose turn", "host");
    }
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `Game started.`
    });
    /* 
    const clients = io.sockets.adapter.rooms[room];
    const clientIds = Object.keys(clients.sockets);
    const nextTurn = clientIds[0];
    io.to(nextTurn).emit("your turn", true); */
  });
  socket.on("number select", value => {
    console.log("\nSeleceted number is", value);
    const room = socket.room;
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

      io.sockets.in(room).emit("number selected", value);
    }
  });
  socket.on("message", msg => {
    const from = socket.username ? socket.username : socket.id;
    io.sockets.in(socket.room).emit("message", { from: from, message: msg });
  });
  socket.on("bingo end", (message, room_id) => {
    console.log("bingo end");
    const room = `${room_id}`;
    socket.broadcast.to(room).emit("bingo end", message);
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `Game ended.`
    });
  });

  socket.on("bingo leave", room_id => {
    socket.leave(socket.room);
    const game = games[socket.room];
    if (game) {
      game.length -= 1;
      delete game[socket.id];
    }

    const clients = io.sockets.adapter.rooms[socket.room];
    console.log(`\nClient left from ${socket.room}`);
    socket.broadcast.to(socket.room).emit("bingo leave", socket.id);
    io.sockets.in(socket.room).emit("users update", game);
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `User "${socket.id}" left from game.`
    });
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

    const game = games[socket.room];
    if (game) {
      game.length -= 1;
      delete game[socket.id];
    }

    const clients = io.sockets.adapter.rooms[socket.room];
    console.log(`Client left from ${socket.room}`);
    socket.broadcast.to(socket.room).emit("bingo leave", socket.id);
    io.sockets.in(socket.room).emit("users update", game);
    socket.broadcast.to(socket.room).emit("message", {
      from: "system",
      message: `User "${socket.id}" left from game.`
    });

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
