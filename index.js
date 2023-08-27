const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const UserModel = require("./models/User");
const app = express();
const multer = require("multer");
const fs = require("fs");

app.use(bodyParser.urlencoded({ extended: true }));
app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["POST", "GET"],
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

const url =
  "mongodb+srv://Ebishu:Yoniab23@cluster0.vx1dviu.mongodb.net/employee?retryWrites=true&w=majority";

const connect = async () => {
  await mongoose
    .connect(url, { useNewUrlParser: true })
    .then(() => console.log("database is connected"));
};

connect();

const videoInfoSchema = new mongoose.Schema({
  userid: String,
  videoTitle: String,
  videoFileName: String,
  tambnailFileName: String,
});

const counterSchema = new mongoose.Schema({
  id: String,
  seq: Number,
});

const counter = mongoose.model("counter", counterSchema);
const videoInfo = mongoose.model("videoinfo", videoInfoSchema);

app.post("/register", (req, res) => {
  counter
    .findOneAndUpdate({ id: "autoval" }, { $inc: { seq: 1 } }, { new: true })
    .then((result) => {
      let seqId;

      if (result == null) {
        const newVal = new counter({ id: "autoval", seq: 1 });
        newVal.save();

        seqId = "1";
      } else {
        seqId = result.seq.toString();
      }

      const { name, username, email, password } = req.body;
      bcrypt
        .hash(password, 10)
        .then((hash) => {
          UserModel.create({
            userid: seqId,
            name,
            username,
            email,
            password: hash,
          })
            .then((user) => res.json({ status: "OK" }))
            .catch((err) => res.json(err));
        })
        .catch((err) => res.json(err));
    });
});

const verifyUser = (req, res, next) => {
  token = req.cookies.token;

  if (!token) {
    return res.json("token was not presnt");
  } else {
    jwt.verify(token, "jwt-secret-key", (err, decoded) => {
      if (err) {
        return res.json("error with token");
      } else {
        if (decoded.role === "user") {
          // console.log(decoded.data);
          return res.json({
            status: "OK",
            username: decoded.username,
            userid: decoded.userid,
          });
        } else {
          return res.json("you are not user");
        }
      }
    });
  }
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/upload/");
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage: storage });

const multiUpload = upload.fields([{ name: "thumbnail" }, { name: "video" }]);

app.post("/upload", multiUpload, (req, res) => {
  // console.log(req.body);

  videoInfo
    .create({
      userid: req.body.userid,
      videoTitle: req.body.videotitle,
      videoFileName: req.files.video[0].filename,
      tambnailFileName: req.files.thumbnail[0].filename,
    })
    .then((user) => res.json({ status: "OK" }))
    .catch((err) => res.json(err));
});

app.get("/dashboard", verifyUser, (req, res) => {
  res.json("success");
});

app.get("/api/videosinfo", (req, res) => {
  videoInfo
    .find()
    .then((videoInfos) => {
      res.json(videoInfos);
    })
    .catch((err) => res.send(err));
});

app.get("/api/userinfo", (req, res) => {
  // console.log(req.query);

  UserModel.findOne({ userid: req.query.userid }).then((result) => {
    res.json({
      username: result.username,
      name: result.name,
      email: result.email,
    });
  });
});

app.get("/api/gettambnail", (req, res) => {
  const tamb = req.query.tambnailName;
  res.download("./public/upload/" + tamb);
});

const CHUNK_SIZE_IN_BYTES = 1000000;

app.get("/api/play", (req, res) => {
  const videoId = req.query.videoId;
  const range = req.headers.range;

  if (!range) {
    return res.send({ 404: "range must be provided" });
  }

  const videoPath = `public/upload/${videoId}`;

  const videoSizeInBites = fs.statSync(videoPath).size;

  const chunkStart = Number(range.replace(/\D/g, ""));

  const chunkEnd = Math.min(
    chunkStart + CHUNK_SIZE_IN_BYTES,
    videoSizeInBites - 1
  );

  const contentLength = chunkEnd - chunkStart + 1;

  const headers = {
    "Content-Range": `bytes ${chunkStart}-${chunkEnd}/${videoSizeInBites}`,
    "Accept-Ranges": "bytes",
    "Content-Length": contentLength.toString(),
    "Content-Type": "video/mp4",
  };
  res.writeHead(206, headers);

  const videoStream = fs.createReadStream(videoPath, {
    start: chunkStart,
    end: chunkEnd,
  });

  videoStream.pipe(res);
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  UserModel.findOne({ email: email }).then((user) => {
    if (user) {
      bcrypt.compare(password, user.password, (err, response) => {
        if (response) {
          const token = jwt.sign(
            {
              email: user.email,
              role: user.role,
              username: user.username,
              userid: user.userid,
            },
            "jwt-secret-key",
            { expiresIn: "1d" }
          );

          res.cookie("token", token);

          return res.json({ status: "OK", role: user.role });
        } else {
          return res.json("password incorrect");
        }
      });
    } else {
      return res.json("no recoed existed");
    }
  });
});

app.listen(3001, () => {
  console.log("listening at port 3001");
});
