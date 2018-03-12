const express = require("express");
const router = express.Router();
const shortid = require("shortid");
const rooms = require("../roomsArray");

router.post("/create", (req, res) => {
  const { maxUser } = req.query;
  const id = shortid.generate();
  const room = {
    id,
    maxUser
  };
  rooms.push(room);
  res.send(room);
});
router.get("/fetch", (req, res) => {
  const { id } = req.query;
  const isExist = rooms.find(room => {
    return room.id === id;
  });
  if (isExist !== undefined) {
    res.send(isExist);
  } else {
    res.sendStatus(404);
  }
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
