const express = require("express");
const router = express.Router();
const shortid = require("shortid");
const rooms = [];

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
module.exports = router;
