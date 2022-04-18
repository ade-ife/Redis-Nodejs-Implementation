const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Redis = require("redis");

const redisClient = Redis.createClient({
  legacyMode: true,
});

// const redisClient = Redis.createClient();
redisClient.connect();

const app = express();
app.use(express.urlencoded({ extended: true }));
const port = 3000;
app.use(cors());

const DEFAULT_EXPIRATION = 3600;

app.get("/photos", async (req, res) => {
  const albumId = req.query.albumId;
  const photos = await setOrGetCache(`photos?albumId=${albumId}`, async () => {
    const { data } = await axios.get(
      "https://jsonplaceholder.typicode.com/photos",
      { params: { albumId } }
    );
    return data;
  });
  res.json(photos);
});

app.get("/photos/:id", async (req, res) => {
  const photos = await setOrGetCache(`photos:${req.params.id}`, async () => {
    const { data } = await axios.get(
      `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
    );
    return data;
  });

  // const { data } = await axios.get(
  //   `https://jsonplaceholder.typicode.com/photos/${req.params.id}`
  // );
  res.json(photos);
});

function setOrGetCache(key, cb) {
  return new Promise((resolve, reject) => {
    redisClient.get(key, async (error, data) => {
      if (error) return reject(error);
      if (data != null) return resolve(JSON.parse(data));
      const freshData = await cb();
      redisClient.setEx(key, DEFAULT_EXPIRATION, JSON.stringify(freshData));
      resolve(freshData);
    });
  });
}

app.listen(port, () => console.log(`Server started on port ${port}`));
