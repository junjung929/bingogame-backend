const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const cors = require("cors"); // for access-control
const rooms = require("./routes/rooms");

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

// This is what the socket.io syntax is like, we will work this later
io.on("connection", socket => {
  socket.on("bingo join", (room_id, maxUser) => {
    const room = `room=${room_id}`;
    socket.join(room);
    const clients = io.sockets.adapter.rooms[room];
    console.log(clients);
    console.log(`The number of user in room=${room_id}: ${clients.length}`);
    if (clients.length > maxUser) {
      console.log("Full");
      return socket.emit("Room Full", true);
    }
    socket.on("selected", value => {
      // once we get a 'change color' event from one of our clients, we will send it to the rest of the clients
      // we make use of the socket.emit method again with the argument given to use from the callback function above
      console.log("seleceted number is", value);
      io.sockets.in(room).emit("selected", value);
    });
    socket.on("restart", size => {
      // once we get a 'change color' event from one of our clients, we will send it to the rest of the clients
      // we make use of the socket.emit method again with the argument given to use from the callback function above
      console.log("game reset");
      io.sockets.in(room).emit("restart", size);
    });
    socket.on("bingo end", message => {
      io.sockets.in(room).emit("bingo end", message);
    });
  });

  // just like on the client side, we have a socket.on method that takes a callback function

  // disconnect is fired when a client leaves the server
  socket.on("disconnect", () => {
    // console.log("user disconnected");
  });
});

server.listen(port, () => console.log(`Listening on port ${port}`));
