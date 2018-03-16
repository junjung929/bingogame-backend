const express = require("express");
const router = express.Router();
const shortid = require("shortid");
const rooms = require("../roomsArray");

router.get("/", (req, res) => {
  const { perPage, page } = req.query;
  if (!perPage || !page) {
    return res.send(rooms);
  }
  const keys = Object.keys(rooms);
  const startElement = page * perPage;
  const limit = startElement + perPage;
  const filteredRooms = [];
  for (let index = startElement; index < limit; index++) {
    if (keys[index] != null) filteredRooms.push(rooms[keys[index]]);
  }
  console.log(rooms.length);
  res.send({
    rooms: filteredRooms,
    page: parseInt(page),
    pages: rooms.length / perPage
  });
});

router.get("/fetch", (req, res) => {
  const { id } = req.query;
  const keys = Object.keys(rooms);

  const isExist = keys.find(key => {
    return key === id;
  });
  if (isExist !== undefined) {
    res.send(rooms[isExist]);
  } else {
    res.sendStatus(404);
  }
});

router.post("/create", (req, res) => {
  const { maxUser, roomTitle, size } = req.query;
  const id = shortid.generate();
  const room = {
    id,
    maxUser: parseInt(maxUser),
    title: roomTitle,
    users: [],
    length: 0,
    size: size
  };
  Object.assign(rooms, { [id]: room });
  rooms.length++;
  res.send(room);
});

router.delete("/remove", (req, res) => {
  const { id } = req.query;
  let index = 0;
  const isExist = rooms.find(room => {
    index++;
    return room.id === id;
  });
  if (isExist !== undefined) {
    if (index !== -1) {
      rooms.splice(index, 1);
    }
    res.sendStatus(201);
  } else {
    res.sendStatus(404);
  }
});
module.exports = router;
