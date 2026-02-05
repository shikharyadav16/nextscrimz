const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require("cookie-parser");
const cors = require('cors');
const path = require("path");
const app = express();

const authRoutes = require("./routes/authRoutes");
const staticRoutes = require("./routes/staticRoutes");
const cashfreeRoutes = require("./routes/cashfreeRoutes")
const regRoutes = require("./routes/regRoutes");
const supportRoutes = require("./routes/supportRoutes")
const quickRoutes = require("./routes/quickRoutes");

const { connectToDb } = require("./Connection");
const { restrictToLogin } = require("./middlewares/auth")
const limiter = require("./middlewares/limiter");

connectToDb();

app.use(cors({
  origin: [
    "https://nextscrimz.xyz", 
  ], 
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));

app.set("trust proxy", 1);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "landing.html"));
});

app.get("/sitemap.xml", (req, res) => {
  res.header("Content-Type", "application/xml");
  res.sendFile(__dirname + "/sitemap.xml", {
    headers: {
      "Last-Modified": new Date().toUTCString() // today’s date
    }
  });
});

app.use(limiter);
app.use("/", quickRoutes);
app.use("/", authRoutes);
app.use("/", restrictToLogin, regRoutes);
app.use("/", restrictToLogin, cashfreeRoutes);
app.use("/", restrictToLogin, staticRoutes);
app.use("/", supportRoutes, staticRoutes);

app.use((req, res)=> {
  res.status(404).render("404")
})


const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://localhost:${port}`);
});
