let loadedMessageIds = [];
const socket = io();

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();

  if (text === "") return;

  input.value = "";

  socket.emit("send_message", {
    sender_id: currentUserId,
    receiver_id: receiverId,
    message: text
  });
}

socket.on("receive_message", (data) => {

  const isCurrentChat =
    (Number(data.sender_id) === Number(currentUserId) &&
     Number(data.receiver_id) === Number(receiverId))
    ||
    (Number(data.sender_id) === Number(receiverId) &&
     Number(data.receiver_id) === Number(currentUserId));

  if (!isCurrentChat) return;

  if (loadedMessageIds.includes(data.message_id)) {
    return;
  }

  const type =
    Number(data.sender_id) === Number(currentUserId)
    ? "sent"
    : "received";

  appendMessage(
    data.message,
    type,
    data.message_id
  );

  loadedMessageIds.push(data.message_id);
});
    
function appendMessage(text, type, messageId = null) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  
  div.classList.add("message", type);
  
  div.textContent = text;
  
  if (messageId !== null) {
    div.dataset.id = messageId;
  }
  
  messages.appendChild(div);
  
  //auto scroll bottom 
  messages.scrollTop = messages.scrollHeight;
}

async function loadMessages() {
  try {
    const response = await fetch(`/get-messages/${receiverId}`);
    const data = await response.json();
    data.forEach(msg => {
      const messageId = msg[2];
      
      // already exists
      if (loadedMessageIds.includes(messageId)) {
        return;
      }

      const senderId = msg[0];
      const text = msg[1];
      const type = senderId === currentUserId
      ? "sent"
      : "received";
      
      appendMessage(text, type, messageId);
      
      loadedMessageIds.push(messageId);
    });
    
  } catch(error) {
    alert("message failed!")
  }
}

window.sendMessage = sendMessage;