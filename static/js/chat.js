let loadedMessageIds = [];

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
      
  //prevent empty message 
  if (text === "") return;
  
  //show instantly
  appendMessage(text, "sent");
  
  input.value = ""; //clear input
  
  try {
    const response = await fetch("/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        receiver_id: receiverId,
        message: text
      })
    });
        
    const data = await response.json();
    
    if (data.success) {
      loadedMessageIds.push(data.message_id);
    }
    
  } catch(error) {
    alert("Network error!");
  }
}
    
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
window.loadMessages = loadMessages;