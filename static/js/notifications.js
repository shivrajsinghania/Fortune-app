let notificationsOpen = false;

function openNotifications(skipHistory = false) {
  if (notificationsOpen) return;
  notificationsOpen = true;
  
  if(!skipHistory){
    history.pushState(
      { notifications:true },
      ""
    );
  }
  
  document.getElementById("notificationsOverlay").style.display = "flex";
  document.body.style.overflow = "hidden";
  loadNotifications();
}

function closeNotifications() {
  if (notificationsOpen) {
    history.back();
  }
}

window.addEventListener("popstate", (e) => {
  const isNotifications = e.state && e.state.notifications;
  if (notificationsOpen && !isNotifications) {
    notificationsOpen = false;
    document.getElementById("notificationsOverlay").style.display = "none";
    document.body.style.overflow = "";
  }
});

function formatTime(dateString) {
  const now = new Date();
  const then = new Date(dateString + " UTC");
  const diff = Math.floor(
    (now - then) / 1000
  );
  if (diff < 60) return "now";
  if (diff < 3600) return Math.floor(diff / 60) + "m";
  if (diff < 86400) return Math.floor(diff / 3600) + "h";
  if (diff < 604800) return Math.floor(diff / 86400) + "d";
  return Math.floor(diff / 604800) + "w";
}

async function loadNotifications() {
  const list = document.getElementById("notificationsList");
  list.innerHTML = "Loading...";
  const res = await fetch("/notifications-data");
  const data = await res.json();

  if (!data.length) {
    list.innerHTML = "<p>No notifications yet.</p>";
    return;
  }
  list.innerHTML = data.map(n => {
    const pic = n[4] || "/static/default.png";
    const commentText = n[7] || "";
    const thumbnail = n[8];
    const isFollowingSender = Boolean(n[10]);
    
    //comment preview 
    let commentPreview = "";
    if (n[2] === "comment" && commentText) {
      commentPreview = `
      <div class="notification-comment">
      ${commentText}
      </div>
      `;
    }
    
    // right side for thumbnail
    let rightSide = "";
    if((n[2] === "like" || n[2] === "comment" || n[2] === "comment_like") && thumbnail){
      rightSide = `
      <a
      href="/post/${n[6]}/${n[9]}"
      onclick="
      sessionStorage.setItem(
      'notificationScroll',
      document.getElementById('notificationsList').scrollTop);
      sessionStorage.setItem('reopenNotifications', '1')
      "
      >
      <img src="${thumbnail}" class="notification-thumb">
      </a>
      `;
    }
    if (n[2] === "follow") {
      rightSide = `
      <button
      class="follow-btn ${isFollowingSender ? "following" : ""}"
      data-user-id="${n[5]}"
      data-follows-me="1"
      onclick="event.stopPropagation(); notificationFollow(${n[5]}, this)"
      >
      ${
      isFollowingSender
      ? '<span class="bolt">⚡</span> Following'
      : 'Follow Back'
      }
      </button>
      `;
    }
    
    // Messages for different actions 
    let message = "";
    if (n[2] === "follow") {
      message = "followed you";
    }
    else if (n[2] === "like") {
      message = "liked your post";
    }
    else if (n[2] === "comment") {
      message = "commented:";
    }
    else if (n[2] === "comment_like") {
      message = "liked your comment";
    }
    
    return `
    <div class="notification-item">
    <img src="${pic}" class="notification-avatar">
    <div class="notification-content">
    <div>
    <a
    href="/user/${n[1]}"
    onclick="
    sessionStorage.setItem(
    'notificationScroll',
    document.getElementById('notificationsList').scrollTop);
    sessionStorage.setItem('reopenNotifications', '1')
    "
    class="notification-user">
    ${n[1]}
    </a>
    ${message}
    </div>
    ${commentPreview}
    <div class="notification-time">
    ${formatTime(n[3])}
    </div>
    </div>
    <div class="notification-right">
    ${rightSide}
    </div>
    </div>
    `;
  }).join("");
}

async function notificationFollow(userId, btn){
  await toggleFollow(userId, btn);
}

window.addEventListener("pageshow", ()=>{

  if(sessionStorage.getItem("reopenNotifications")){

    sessionStorage.removeItem(
      "reopenNotifications"
    );

    openNotifications(true);

    setTimeout(()=>{

      const pos =
        sessionStorage.getItem(
          "notificationScroll"
        );

      if(pos){

        document.getElementById(
          "notificationsList"
        ).scrollTop = parseInt(pos);

      }

    },300);

  }

});