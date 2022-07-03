const express = require("express");
const app = express();
const cors = require("cors");
const sendEmail = require("./send_email");

const codesForEmails = {};

app.use(cors());
app.use(express.json());
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
const { v4: uuidV4 } = require("uuid");

const sequelize = require("./dbConfig");
const User = require("./User");
const Contact = require("./Contact");
const Recent = require("./Recent");
sequelize.sync().then(() => console.log("db is ready"));

/* Get HTTP request from client (page_login.html ln 340)
   Params: username and password.                                        */
app.post("/userLogin", async (req, res) => {
  try {
    const { username, pw } = req.body;
    var sha256 = require("js-sha256");
    const hashPw = sha256(pw);

    req.body.pw = hashPw;
    console.log("hash pw" + req.body.pw);
    const user = await User.findOne({ where: { username, pw: hashPw } });
    res.send(user);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

/* Get HTTP request from client (page_registation.html ln 395)
   Params: last name, first name, username, email and password.          */
app.post("/userSignup", async (req, res) => {
  const { pw } = req.body;
  var sha256 = require("js-sha256");
  const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}/;
  console.log("check pw" + regex.test(pw));
  let dataBaseError = true;

  try {
    if (!regex.test(pw)) {
      dataBaseError = false;
      throw new Error("Validation is on pw failed");
    }
    const hashPw = sha256(pw);
    req.body.pw = hashPw;
    console.log("hash pw" + req.body.pw);
    const user = await User.create(req.body);
    res.send(user);
  } catch (err) {
    console.log(err);
    res.send(dataBaseError ? err : { errors: [{ message: err.message }] });
  }
});

/* Get HTTP request from client (forgot_password_ver_code.html ln 327)
   Param: email.                                                         */
app.post("/userVerEmail", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if (!user) {
      throw new Error("Email not exists");
    } else {
      const code = await sendEmail(email);
      if (!code) {
        throw new Error("Can't send email");
      } else {
        codesForEmails[email] = code;

        console.log(codesForEmails);
      }
    }

    res.send("Email Sent");
  } catch (err) {
    console.log(err);
    res.send({ error: err.message });
  }
});

/* Get HTTP request from client (forgot_password_ver_code.html ln 351)
   Param: verification code.                                              */

app.post("/userVerCode", async (req, res) => {
  try {
    const { email, code } = req.body;
    if (codesForEmails[email] != code) {
      throw new Error("Validation failed.");
    }

    delete codesForEmails[email];
    res.send("Validation Completed Successfully.");
  } catch (err) {
    console.log(err);
    res.send({ error: err.message });
  }
});

/* Get HTTP request from client (page_reset_password.html ln 336)
   Params: username and password.                                        */
app.post("/userResetPassword", async (req, res) => {
  let dataBaseErrorReset = true;
  try {
    const { email, pw } = req.body;
    const user = await User.findOne();
    var sha256 = require("js-sha256");
    const regex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}/;
    console.log("check pw" + regex.test(pw));

    if (!regex.test(pw)) {
      dataBaseErrorReset = false;
      throw new Error("Validation is on pw failed");
    }
    const hashPw = sha256(pw);
    user = await User.update({ pw: hashPw }, { where: { email } });
    res.send(user);
    console.log(user);
  } catch (err) {
    console.log(err);
    res.send(dataBaseErrorReset ? err : { errors: [{ message: err.message }] });
  }
});

/* Get HTTP request from client (page_main.html ln 633)
   Params: id and username.                                              */
app.post("/addContact", async (req, res) => {
  try {
    const { id, contact_username } = req.body;
    const contactUser = await User.findOne({
      where: { username: contact_username },
    });

    if (!contactUser) {
      throw new Error("Username not exist");
    } else if (contactUser.id == id) {
      throw new Error("Stop trolling us ;)");
    }

    const contact = await Contact.create({
      user_id: id,
      contact_id: contactUser.id,
    });
    res.send(contact);
  } catch (err) {
    console.log(err);
    res.send({ error: err.message });
  }
});

app.post("/addRecent", async (req, res) => {
  try {
    const { userId, contactUsername } = req.body;
    const contactUser = await User.findOne({
      where: { username: contactUsername },
    });

    if (!contactUser) {
      throw new Error("Username not exist");
    } else if (contactUser.id == userId) {
      throw new Error("Stop trolling us ;)");
    }

    const call = await Recent.create({
      caller_id: userId,
      get_call_id: contactUser.id,
      is_answered: false,
    });
    res.send(call);
  } catch (err) {
    console.log(err);
    res.send({ error: err.message });
  }
});

/* Get HTTP request from client (page_main.html ln 589)
   Param: id.                                                           */
app.get("/contacts/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userContacts = await User.findOne({
      attributes: ["id", "username"],
      include: [
        {
          model: Contact,
          include: [
            {
              model: User,
              as: "contact_info",
              attributes: ["id", "username"],
            },
          ],
        },
      ],
      where: { id },
      order: sequelize.literal("lower(`contacts->contact_info`.username) ASC"),
    });

    res.send(userContacts);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

app.get("/recents/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const userRecents = await User.findOne({
      attributes: ["id", "username"],
      include: [
        {
          model: Recent,
          as: "outgoingCalls",
          include: [
            {
              model: User,
              as: "caller_info",
              attributes: ["id", "username"],
            },
            {
              model: User,
              as: "get_call_info",
              attributes: ["id", "username"],
            },
          ],
        },
        {
          model: Recent,
          as: "incomingCalls",
          include: [
            {
              model: User,
              as: "caller_info",
              attributes: ["id", "username"],
            },
            {
              model: User,
              as: "get_call_info",
              attributes: ["id", "username"],
            },
          ],
        },
      ],
      where: { id },
      order: [["incomingCalls", "createdAt", "desc"]],
    });

    res.send(userRecents);
  } catch (err) {
    console.log(err);
    res.send(err);
  }
});

// Setup peerJS server
app.use("/peerjs", peerServer);

// Allows us to use an ejs file
app.set("view engine", "ejs");
app.use(express.static("public"));

// Redirect the client to a call window (with his contact)
app.get("/room.ejs", (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

app.get("/", (_req, res) => {
  res.redirect(`/page_login.html`);
});

// Create a call room
app.get("/:room", (req, res) => {
  res.render("room", { roomId: req.params.room });
});

// Users connected to the application
let users = [];

// As long as the client is in the app (main window)
io.on("connection", (socket) => {
  socket.on("insert", (data) => {
    const user = users.find((element) => element.userId === data.id);
    if (!user) {
      users.push({ socketId: socket.id, userId: data.id });
    } else {
      user.socketId = socket.id;
    }
    console.log("-------Logged In Users--------");
    console.log(users);
  });

  // Join to a specific call room (params: roomId and userId.)
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.to(roomId).broadcast.emit("user-connected", userId);

    // Messages - chat
    socket.on("message", (message, username) => {
      // send message to the same room
      io.to(roomId).emit("createMessage", message, username);
    });

    // Disconnect from the call room (end of the call)
    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId);
      console.log("user-disconnected");
      users = users.filter((element) => element.socketId !== socket.id);
      console.log("-------Logged In Users--------");
      console.log(users);
    });
  });

  // Create a call with contact (params: username and contactId.)
  socket.on("callUser", (username, contactId) => {
    try {
      console.log("-------Logged In Users--------");
      console.log(users);
      console.log(username, contactId);
      const contactUser = users.find((element) => element.userId === contactId);
      const contactRoom = contactUser.socketId;
      console.log(contactRoom);

      // Send message to the client who get the call (params: username, socket)
      io.to(contactRoom).emit("incomingCall", username, socket.id);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("endCallWithUser", (username, contactId) => {
    try {
      console.log("-------Logged In Users--------");
      console.log(users);
      console.log(username, contactId);
      const contactUser = users.find((element) => element.userId === contactId);
      const contactRoom = contactUser.socketId;
      console.log(contactRoom);

      // Send message to the client who get the call (params: username, socket)
      io.to(contactRoom).emit("callerEndedCall", username, socket.id);
    } catch (err) {
      console.log(err);
    }
  });

  // Get a call (params: callerSocketId.)
  socket.on("answerCall", (callerSocketId) => {
    try {
      console.log("answerCall");
      console.log(callerSocketId);

      io.to(callerSocketId).emit("answerCall", socket.id);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("rejectCall", (callerSocketId) => {
    try {
      console.log("rejectCall");
      console.log(callerSocketId);
      io.to(callerSocketId).emit("rejectCall", socket.id);
    } catch (err) {
      console.log(err);
    }
  });

  socket.on("callAnswered", async (callId) => {
    try {
      console.log("callAnswered");
      console.log(callId);

      await Recent.update({ is_answered: true }, { where: { id: callId } });
    } catch (err) {
      console.log(err);
    }
  });

  // The client who get the call share his room with the client who called him.
  socket.on("shareRoom", (callingContactServerId, roomId) => {
    try {
      console.log("shareRoom");
      console.log(callingContactServerId);

      io.to(callingContactServerId).emit("shareRoom", roomId);
    } catch (err) {
      console.log(err);
    }
  });
});

server.listen(process.env.PORT || 3030);

console.log(`server started on port ${process.env.PORT || 3030}`);
