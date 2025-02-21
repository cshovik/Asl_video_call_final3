// controls.js

// Global variables for chat voice recognition.
var recognition;
var isRecognizing = false;

// Global variables for message box voice recognition.
var messageRecognition;
var isMessageRecognizing = false;

// We'll store the user's chosen sign language model here.
// The dropdown uses values "america" or "india". We'll convert "america" to "american" internally.
window.selectedSignLanguage = "america";

if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  // For chat voice recognition
  recognition = new SpeechRecognition();
  recognition.continuous = true;       // Keep listening continuously.
  recognition.interimResults = false;  // Use final results only.
  recognition.lang = 'en-US';          // Change language as needed.
  recognition.onresult = function (event) {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        transcript += event.results[i][0].transcript;
      }
    }
    let chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.value += transcript;
    }
  };
  recognition.onerror = function (event) {
    console.error("Chat speech recognition error:", event.error);
    isRecognizing = false;
    let voiceBtn = document.getElementById("voiceChatButton");
    if (voiceBtn) {
      voiceBtn.textContent = "🎤";
    }
  };

  // For message box voice recognition (speech-to-text for translation input)
  messageRecognition = new SpeechRecognition();
  messageRecognition.continuous = false; // single-shot mode
  messageRecognition.interimResults = false;
  messageRecognition.lang = 'en-US';
  messageRecognition.onresult = function(event) {
    let transcript = event.results[0][0].transcript;
    let messageBox = document.getElementById("messageBox");
    if (messageBox) {
      messageBox.value += transcript;
    }
  };
  messageRecognition.onerror = function(event) {
    console.error("Message voice recognition error:", event.error);
  };
}

function initializeControls() {
  const controlsDiv = document.getElementById("controls");
  // Updated controls HTML: added a new voice input button (for messageBox) after the message box.
  controlsDiv.innerHTML = `
    <button id="muteButton" class="btn-mute">Mute</button>
    <button id="cameraButton" class="btn-camera">Camera Off</button>

    <!-- Sign language model dropdown -->
    <select id="signLanguageSelect" class="language-select" style="margin-left:10px;">
      <option value="america">America</option>
      <option value="india">India</option>
    </select>

    <button id="signDetectButton" class="btn-sign">Sign Detect On</button>
    <button id="leaveCallButton" class="btn-leave">Leave Call</button>
    <button id="chatButton" class="btn-chat">Chat</button>

    <!-- Message box for gesture text or manual input -->
    <input type="text" id="messageBox" placeholder="Message / ASL Letters" style="width:200px; margin-left:10px;">
    <!-- New voice input button for messageBox -->
    <button id="voiceInputButton" class="btn-voice-input" style="margin-left:5px;">🎤</button>

    <!-- Translation language dropdown for video translation -->
    <select id="translationLanguage" class="language-select" style="margin-left:10px;">
      <option value="hi">Hindi</option>
      <option value="ta">Tamil</option>
      <option value="te">Telugu</option>
      <option value="bn">Bengali</option>
      <option value="en">English</option>
      <option value="fr">French</option>
      <option value="es">Spanish</option>
      <option value="de">German</option>
      <option value="zh-cn">Chinese</option>
      <option value="ko">Korean</option>
      <option value="ja">Japanese</option>
      <option value="kn">Kannada</option>
      <option value="mr">Marathi</option>
      <option value="pa">Punjabi</option>
    </select>

    <button id="speechButton" class="btn-speech">Speak</button>
    <button id="clearButton" class="btn-clear">Clear</button>
  `;

  // Attach event listeners
  document.getElementById("muteButton").addEventListener("click", toggleMute);
  document.getElementById("cameraButton").addEventListener("click", toggleCamera);
  document.getElementById("signDetectButton").addEventListener("click", toggleSignDetection);
  document.getElementById("leaveCallButton").addEventListener("click", leaveCall);
  document.getElementById("speechButton").addEventListener("click", sendSpeech);
  document.getElementById("clearButton").addEventListener("click", clearMessage);
  document.getElementById("chatButton").addEventListener("click", toggleChatBox);
  
  // New: attach event listener to voice input button for messageBox.
  document.getElementById("voiceInputButton").addEventListener("click", toggleVoiceInput);

  if (!document.getElementById("chatBox")) {
    createChatBox();
  }

  // Update selected sign language when user changes the dropdown.
  const signSelect = document.getElementById("signLanguageSelect");
  signSelect.addEventListener("change", () => {
    window.selectedSignLanguage = signSelect.value; // "america" or "india"
  });
}

function toggleMute() {
  const audioTracks = localStream.getAudioTracks();
  if (audioTracks.length > 0) {
    audioTracks[0].enabled = !audioTracks[0].enabled;
    document.getElementById("muteButton").textContent = audioTracks[0].enabled ? "Mute" : "Unmute";
  }
}

function toggleCamera() {
  const videoTracks = localStream.getVideoTracks();
  if (videoTracks.length > 0) {
    videoTracks[0].enabled = !videoTracks[0].enabled;
    document.getElementById("cameraButton").textContent = videoTracks[0].enabled ? "Camera Off" : "Camera On";
  }
}

/**
 * Toggles sign detection on/off.
 * When turning on, a pop-up message indicates which detection mode is starting.
 */
function toggleSignDetection() {
  detectASL = !detectASL;
  const signBtn = document.getElementById("signDetectButton");
  signBtn.textContent = detectASL ? "Sign Detect Off" : "Sign Detect On";
  
  if (detectASL) {
    // Read selected option from the dropdown.
    const signSelect = document.getElementById("signLanguageSelect");
    let chosen = signSelect.value; // "america" or "india"
    // Convert "america" to "american" for our backend.
    let modelType = chosen === "india" ? "indian" : "american";
    // Pop up message to notify the user.
    alert(`${modelType.charAt(0).toUpperCase() + modelType.slice(1)} sign language detection on`);
    // Start detection loop.
    processASL();
  } else {
    // Stop detection by removing the overlay canvas.
    const localWrapper = document.querySelector('.video-wrapper[data-id="local"]');
    if (localWrapper) {
      const canvas = localWrapper.querySelector("#aslCanvas");
      if (canvas) {
        canvas.remove();
      }
    }
  }
}

function leaveCall() {
  for (let id in peerConnections) {
    peerConnections[id].close();
  }
  window.location.reload();
}

/* --- Translation/TTS Functionality --- */
function sendSpeech() {
  const message = document.getElementById("messageBox").value;
  const language = document.getElementById("translationLanguage").value;
  if (message.trim().length > 0) {
    fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message, language: language })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.error) {
          alert("Error: " + data.error);
          return;
        }
        document.getElementById("messageBox").value = data.translated_text;
        socket.emit("chat", {
          message: data.translated_text,
          name: window.userName,
          isSpeech: true,
          audio_url: data.audio_url
        });
        let audio = new Audio(data.audio_url);
        audio.play().catch(err => console.error("Audio play error:", err));
      })
      .catch(error => {
        console.error("Error in translation:", error);
        alert("Something went wrong: " + error.message);
      });
  }
}

function clearMessage() {
  document.getElementById("messageBox").value = "";
}

function speakMessage(message) {
  const utterance = new SpeechSynthesisUtterance(message);
  window.speechSynthesis.speak(utterance);
}
window.speakMessage = speakMessage;

/* --- Chat Box Functions --- */
function toggleChatBox() {
  const chatBox = document.getElementById("chatBox");
  chatBox.style.display = (chatBox.style.display === "none" || chatBox.style.display === "") ? "flex" : "none";
}

function createChatBox() {
  const chatBox = document.createElement("div");
  chatBox.id = "chatBox";
  chatBox.className = "chat-box";
  chatBox.style.position = "fixed";
  chatBox.style.right = "20px";
  chatBox.style.bottom = "100px";
  chatBox.style.width = "300px";
  chatBox.style.height = "400px";
  chatBox.style.background = "#1e1e1e";
  chatBox.style.border = "1px solid #333";
  chatBox.style.borderRadius = "5px";
  chatBox.style.display = "none";
  chatBox.style.flexDirection = "column";
  chatBox.style.overflow = "hidden";
  chatBox.style.zIndex = "1000";
  chatBox.innerHTML = `
    <div class="chat-header" style="background: #333; padding: 10px; color: #fff; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #444;">
      <span>Chat</span>
      <button id="closeChat" style="background: transparent; border: none; color: #fff; cursor: pointer;">X</button>
    </div>
    <div class="chat-messages" style="flex: 1; padding: 10px; overflow-y: auto; color: #fff; font-size: 14px;"></div>
    <div class="chat-input" style="display: flex; border-top: 1px solid #444;">
      <input type="text" id="chatInput" placeholder="Type your message here..." style="flex: 1; padding: 10px; border: none; outline: none; background: #222; color: #fff;">
      <button id="voiceChatButton" style="padding: 10px; background: #555; border: none; color: #fff; cursor: pointer;">🎤</button>
      <!-- Chat language dropdown with smaller width -->
      <select id="chatLanguageSelect" class="language-select" style="margin-left: 5px; width: 80px;">
        <option value="">No Translation</option>
      <option value="hi">Hindi</option>
      <option value="ta">Tamil</option>
      <option value="te">Telugu</option>
      <option value="bn">Bengali</option>
      <option value="en">English</option>
      <option value="fr">French</option>
      <option value="es">Spanish</option>
      <option value="de">German</option>
      <option value="zh-cn">Chinese</option>
      <option value="ko">Korean</option>
      <option value="ja">Japanese</option>
      <option value="kn">Kannada</option>
      <option value="mr">Marathi</option>
      <option value="pa">Punjabi</option>
      </select>
      <button id="sendChat" style="padding: 10px; background: #2196F3; border: none; color: #fff; cursor: pointer;">Send</button>
    </div>
  `;
  document.body.appendChild(chatBox);
  document.getElementById("closeChat").addEventListener("click", function () {
    chatBox.style.display = "none";
  });
  document.getElementById("sendChat").addEventListener("click", sendChatMessage);
  document.getElementById("chatInput").addEventListener("keyup", function (e) {
    if (e.key === "Enter") {
      sendChatMessage();
    }
  });
  document.getElementById("voiceChatButton").addEventListener("click", toggleChatVoice);
}

function toggleChatVoice() {
  if (!recognition) {
    alert("Speech recognition is not supported in this browser.");
    return;
  }
  const voiceBtn = document.getElementById("voiceChatButton");
  if (!isRecognizing) {
    recognition.start();
    isRecognizing = true;
    voiceBtn.textContent = "🛑";
  } else {
    recognition.stop();
    isRecognizing = false;
    voiceBtn.textContent = "🎤";
  }
}

function sendChatMessage() {
  const chatInput = document.getElementById("chatInput");
  const message = chatInput.value.trim();
  if (message.length === 0) return;

  // Get target language for chat translation from the dropdown.
  const chatLangSelect = document.getElementById("chatLanguageSelect");
  const targetLang = chatLangSelect.value; // If empty, no translation will occur.

  if (targetLang) {
    // Translate message before sending.
    fetch("http://localhost:5000/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: message, language: targetLang })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.error) {
          alert("Error: " + data.error);
          return;
        }
        const translatedMsg = data.translated_text;
        const dataToSend = { message: translatedMsg, name: window.userName };
        if (window.socket) {
          window.socket.emit("chat", dataToSend);
        }
        appendChatMessage(dataToSend);
        chatInput.value = "";
      })
      .catch(error => {
        console.error("Error in chat translation:", error);
        alert("Something went wrong: " + error.message);
      });
  } else {
    // No translation selected; send original message.
    const dataToSend = { message: message, name: window.userName };
    if (window.socket) {
      window.socket.emit("chat", dataToSend);
    }
    appendChatMessage(dataToSend);
    chatInput.value = "";
  }
}

function appendChatMessage(data) {
  const chatBox = document.getElementById("chatBox");
  if (!chatBox) return;
  const messagesContainer = chatBox.querySelector(".chat-messages");
  const messageElem = document.createElement("div");
  messageElem.className = "chat-message";
  messageElem.textContent = data.name + ": " + data.message;
  messagesContainer.appendChild(messageElem);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Toggles voice input for the message box.
 * When activated, speech is converted to text and appended to the message box.
 */
function toggleVoiceInput() {
  const voiceBtn = document.getElementById("voiceInputButton");
  if (!isMessageRecognizing) {
    messageRecognition.start();
    isMessageRecognizing = true;
    voiceBtn.textContent = "🛑"; // indicate stop
  } else {
    messageRecognition.stop();
    isMessageRecognizing = false;
    voiceBtn.textContent = "🎤";
  }
}
