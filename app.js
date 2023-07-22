const express = require("express");
const clc = require("cli-color");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const validator = require("validator");
const session = require("express-session");
const mongoDbSession = require("connect-mongodb-session")(session);

//file-imports
const { cleanUpAndValidate } = require("./utils/AuthUtils");
const userSchema = require("./models/userSchema");
const { isAuth } = require("./middleware/AuthMiddleware");
const TodoModel = require("./models/TodoModel");
const { RateLimiter } = require("./middleware/RateLimiter");

//variables
const app = express();
const PORT = process.env.PORT || 8000;
const MONGO_URI =
  "mongodb+srv://divyakonala:NWjYX9Tfc3H8hnA4@cluster0.8g2bbaq.mongodb.net/todo-app";
const saltRound = 11;

app.set("view engine", "ejs");

const store = new mongoDbSession({
  uri: MONGO_URI,
  collection: "sessions",
});

//db connection
mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(clc.green.bold("MongoDb Connected"));
  })
  .catch((err) => {
    console.log(clc.red.bold(err));
  });

//middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: "This is Todo app, we love coding",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);

app.use(express.static("public"));

//routes
app.get("/", (req, res) => {
  return res.send("This is your To-Do-App");
});

app.get("/register", (req, res) => {
  return res.render("register");
});

app.post("/register", async (req, res) => {
  const { name, email, password, username } = req.body;
  try {
    await cleanUpAndValidate({ name, email, password, username });

    //check if user exists
    const userExistEmail = await userSchema.findOne({ email });

    if (userExistEmail) {
      return res.send({
        status: 400,
        message: "user email already exists",
      });
    }

    const userExistsUsername = await userSchema.findOne({ username });

    if (userExistsUsername) {
      return res.send({
        status: 400,
        message: "username already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, saltRound);

    const user = new userSchema({
      name: name,
      email: email,
      password: hashPassword,
      username: username,
    });
    try {
      const userDb = await user.save();
      return res.redirect("/login");
    } catch (error) {
      return res.send({
        status: 500,
        message: "Database error",
        error: error,
      });
    }
  } catch (error) {
    return res.send({
      status: 400,
      message: "data invalid",
      error: error,
    });
  }
});

app.get("/login", (req, res) => {
  return res.render("login");
});

app.post("/login", async (req, res) => {
  //validate the data
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.send({
      status: 400,
      message: "missing credentials",
    });
  }

  if (typeof loginId !== "string" || typeof password !== "string") {
    return res.send({
      status: 400,
      message: "Invalid data format",
    });
  }

  //identify loginId and search in database
  try {
    let userDb;
    if (validator.isEmail(loginId)) {
      userDb = await userSchema.findOne({ email: loginId });
    } else {
      userDb = await userSchema.findOne({ username: loginId });
    }
    if (!userDb) {
      return res.send({
        status: 400,
        message: "user not found, please register first",
      });
    }
    //password compare
    const isMatch = await bcrypt.compare(password, userDb.password);
    if (!isMatch) {
      return res.send({
        status: 400,
        message: "password does not match",
      });
    }
    req.session.isAuth = true;
    req.session.user = {
      username: userDb.username,
      email: userDb.email,
      userId: userDb._id,
    };

    return res.redirect("/dashboard");
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.get("/dashboard", isAuth, async (req, res) => {
  return res.render("dashboard");
});

app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    return res.redirect("/login");
  });
});

app.post("/logout_from_all_devices", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const Schema = mongoose.Schema;
  const session_Schema = new Schema(
    {
      _id: String,
    },
    { strict: false }
  );
  const sessionModel = mongoose.model("session", session_Schema);
  try {
    const delete_count = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    return res.send({
      status: 200,
      message: "Logged out from all devices successfuly",
    });
  } catch (err) {
    return res.send({
      status: 500,
      message: "Logout Failed",
      error: err,
    });
  }
});

//todo's api
app.post("/create-item", isAuth,RateLimiter, async (req, res) => {
  const todoText = req.body.todo;

  //data validation
  if (!todoText) {
    return res.send({
      status: 400,
      message: "Todo empty!",
    });
  }
  if (typeof todoText !== "string") {
    return res.send({
      status: 400,
      message: "Invalid todo format!",
    });
  }

  if (todoText.length > 100) {
    return res.send({
      status: 400,
      message: "Todo too long. Should be less than 100 char",
    });
  }

  //initialize todo schema and save it Db
  const todo = new TodoModel({
    todo: todoText,
    username: req.session.user.username,
  });

  try {
    const todoDb = await todo.save();
    return res.send({
      status: 201,
      message: "todo created cuccessfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.post("/edit-item", isAuth, async (req, res) => {
  const { newData, id } = req.body;
  if (!newData || !id) {
    return res.send({
      status: 400,
      message: "missing data or id",
    });
  }

  if (typeof newData !== "string") {
    return res.send({
      status: 400,
      message: "Invalid todo format!",
    });
  }

  if (newData.length > 100) {
    return res.send({
      status: 400,
      message: "Todo too long. Should be less than 100 char",
    });
  }

  try {
    const todoDb = await TodoModel.findOneAndUpdate(
      { _id: id },
      { todo: newData }
    );
    return res.send({
      status: 200,
      message: "todo updated successfully!",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

app.post("/delete-item", isAuth, async (req, res) => {
  const id = req.body.id;
  if (!id) {
    return res.send({
      status: 400,
      message: "missing id",
    });
  }

  try {
    const todoDb = await TodoModel.findOneAndDelete({ _id: id });
    return res.send({
      status: 200,
      message: "todo deleted successfully!",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database error",
      error: error,
    });
  }
});

// app.get("/read-item", async (req, res) => {
//   const username = req.session.user.username;
//   try {
//     const todos = await TodoModel.find({ username: username });
//     return res.send({
//       status: 200,
//       message: "Read Success",
//       data: todos,
//     });
//   } catch (error) {
//     return res.send({
//       status: 500,
//       message: "Database Error",
//       error: error,
//     });
//   }
// });

//pagination
app.get("/dashboard_pagination", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const skip = req.query.skip || 0; //client
  const limit = 5; //backend
  try {
    const todos = await TodoModel.aggregate([
      //match
      { $match: { username: username } },
      //pagination
      {
        $facet: {
          data: [{ $skip: parseInt(skip) }, { $limit: limit }],
        },
      },
    ]);
    return res.send({
      status: 200,
      message: "Read Success",
      data: todos[0].data,
    });
  } catch (error) {
    return res.send({
      status: 500,
      message: "Database Error",
      error: error,
    });
  }
});

app.listen(PORT, () => {
  console.log(clc.yellow.bold.underline(`Your server is running`));
  console.log(clc.yellow.bold.underline(`http://localhost:${PORT}`));
});
