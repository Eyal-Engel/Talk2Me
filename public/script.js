const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "3030",
});
let myVideoStream;
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};

const closeCall = () => {
  window.location = "page_main.html";
};

// Get access to camera and microphone.
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);
    console.log("ur video has been added successfully");

    // Get in a call room and add the stream to the grid
    myPeer.on("call", (call) => {
      call.answer(stream);
      console.log("SUCCESS");
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        console.log("try to put on video");
        addVideoStream(video, userVideoStream);
      });
    });

    // Client joined to a call room
    socket.on("user-connected", (userId) => {
      setTimeout(connectToNewUser, 3000, userId, stream);
    });

    // Input value (chat)
    let text = $("input");

    // When press enter send message
    $("html").keydown(function (e) {
      if (e.which == 13 && text.val().length !== 0) {
        socket.emit("message", text.val(), sessionStorage.getItem("username"));
        text.val("");
      }
    });

    // Add the message to the chat grid
    socket.on("createMessage", (message, username) => {
      const li = document.createElement("li");
      li.classList = "message";
      const senderUsername = document.createElement("b");
      const messageDiv = document.createElement("div");
      senderUsername.innerText = username;
      messageDiv.innerText = message;

      li.appendChild(senderUsername);
      li.appendChild(messageDiv);

      $("ul").append(li);
      scrollToBottom();
    });
  });

// Client diconnected from the call
socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
  window.location = "page_main.html";
});

// Join the room
myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
  console.log("Joined Room");

  setTimeout(shareRoomToUser, 1000);
  const contactUsername = document.getElementById("ContactUsernameCall");
  contactUsername.innerText =
    "Call with: " + sessionStorage.getItem("contactNameCall");
});

/* The person who created the room is the initiator of the conversation,
   then after creating the room, he shares the ID of the room to the user he called. */
const shareRoomToUser = () => {
  if (sessionStorage.getItem("isCalling")) {
    console.log("creating Room...");
    socket.emit(
      "shareRoom",
      sessionStorage.getItem("contactCallingSocketId"),
      ROOM_ID
    );
  }
};

// Join the call
function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  console.log(stream);
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

// Add the video stream to the video grid
function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

// Scroll the messages to the buttom. (The newest message will appear at the bottom)
const scrollToBottom = () => {
  var d = $(".main__chat_window");
  d.scrollTop(d.prop("scrollHeight"));
};

// Mute or unmute the voice input from client's device.
const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

// Play or stop the video input from client's device.
const playStop = () => {
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

// Create the mute button (change the button while the client clicking on unmute button)
const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

// Create the unmute button (change the button while the client clicking on mute button)
const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

// Create the stop video button (change the button while the client clicking on play video button)
const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};

// Create the play video button (change the button while the client clicking on stop video button)
const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};
