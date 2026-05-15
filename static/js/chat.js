
async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
      
  //prevent empty message 
  if (text === "") return;
      
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
      //append message instantly
      appendMessage(text, "sent");
      
      //clear input 
      input.value = "";
    }
    
  } catch(error) {
    alert("Message failed!");
  }
}
    
function appendMessage(text, type) {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  
  div.classList.add("message", type);
  
  div.textContent = text;
  
  messages.appendChild(div);
  
  //auto scroll bottom 
  messages.scrollTop = messages.scrollHeight;
}

async function loadMessages() {
  try {
    const response = await fetch(`/get-messages/${receiverId}`);
    const data = await response.json();
    const messages = document.getElementById("messages");
    
    //clear old ui 
    messages.innerHTML = "";
    
    data.forEach(msg => {
      const senderId = msg[0];
      const text = msg[1];
      
      //determine message type
      const type =
      senderId === currentUserId
      ? "sent"
      : "received";
      
      appendMessage(text, type);
    });
    
  } catch(error) {
    alert("failed to load messages!")
  }
}

window.sendMessage = sendMessage;
window.loadMessages = loadMessages;
