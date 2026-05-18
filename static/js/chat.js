let loadedMessageCount = 0;

async function sendMessage() {
  const input = document.getElementById("messageInput");
  const text = input.value.trim();
      
  //prevent empty message 
  if (text === "") return;
  
  //show instantly
  appendMessage(text, "sent");
  loadedMessageCount++;
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
    
    //failed saved    
    if (!data.success) {
      alert("message falied!");
    }
    
  } catch(error) {
    alert("Network error!");
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
    
    //only load new messages
    if (data.length === loadedMessageCount) return;
    
    const messages = document.getElementById("messages");
    
    //first laod only 
    if (loadedMessageCount === 0) {
      messages.innerHTML = "";
    }
    
    //append only new messages 
    for (
      let i = loadedMessageCount;
      i < data.length;
      i++
    ) {
      const msg = data[i];
      const senderId = msg[0];
      const text = msg[1];
      const type =
      senderId === currentUserId
      ? "sent"
      : "received";
      
      appendMessage(text, type);
    }
    loadedMessageCount = data.length;
  
  } catch(error) {
    alert("failed to load messages!")
  }
}

window.sendMessage = sendMessage;
window.loadMessages = loadMessages;