  let currentPostId = null;
  
  function likePost(postId, btn) {
    fetch(`/like/${postId}`, {
      method: "POST"
    })
    .then(res => res.json())
    .then(data => {
      btn.nextElementSibling.innerText = data.likes;
      if (data.liked) {
        btn.classList.add("liked");
      } else {
        btn.classList.remove("liked");
      }
    });
  }
  
  function openComments(postId) {
    document.body.classList.add("modal-open");
    currentPostId = postId;
    document.getElementById("commentModal").style.display = "flex";
    if (!history.state || !history.state.modal) {
      history.pushState({modal: true}, "");
    }
    fetch(`/comments/${postId}`)
    .then(res => res.json())
    .then(data => {
      let html = "";
      data.forEach(c => {
        html += `
        <div class="comment" data-id="${c[0]}">
        <div class="comment-top">
        <span class="username">@${c[2]}</span>
        </div>
        <div class="comment-body">
        <span class="text">${c[1]}</span>
        <div class="comment-actions">
        <!-- reply -->
        <button class="icon-btn">
        <svg viewBox="0 0 24 24" class="icon">
        <path d="M10 9V5l-7 7 7 7v-4c5 0 8 1 11 5-1-7-4-11-11-11z"/>
        </svg>
        </button>
        <!-- like -->
        <button class="icon-btn">
        <svg viewBox="0 0 24 24" class="icon">
        <path d="M12 21s-7-5.2-9.5-8.3C.5 9.5 2.5 5 6.5 5 
        9 5 10.5 6.5 12 8 
        13.5 6.5 15 5 17.5 5 
        21.5 5 23.5 9.5 21.5 12.7 
        19 15.8 12 21 12 21z"/>
        </svg>
        </button>
        <!-- delete -->
        ${parseInt(c[3]) === parseInt(currentUserId) ? `
        <button class="icon-btn delete" onclick="confirmDeleteComment(${c[0]})">
        <svg viewBox="0 0 24 24" class="icon delete-icon">
        <path d="M6 6l12 12M18 6l-12 12"/>
        </svg>
        </button>
        ` : ""}
        </div>
        </div>
        </div>`;
      });
      document.getElementById("commentsList").innerHTML = html;
    });
  }
  
  window.onpopstate = function(event) {
    if (document.getElementById("commentModal").style.display === "flex") {
      closeComments();
    }
  };

  function closeComments() {
    document.body.classList.remove("modal-open");
    document.getElementById("commentModal").style.display = "none";
    if (history.state && history.state.modal) {
      history.back();
    }
  }
  
  function sendComment() {
    let text = document.getElementById("commentText").value;
    fetch(`/add-comment/${currentPostId}`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({text: text})
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let newComment = `
        <div class="comment" data-id="${data.comment_id}">
        <div class="comment-top">
        <span class="username">@${data.username}</span>
        </div>
        <div class="comment-body">
        <span class="text">${data.text}</span>
        <div class="comment-actions">
        <!-- reply -->
        <button class="icon-btn">
        <svg viewBox="0 0 24 24" class="icon">
        <path d="M10 9V5l-7 7 7 7v-4c5 0 8 1 11 5-1-7-4-11-11-11z"/>
        </svg>
        </button>
        <!-- like -->
        <button class="icon-btn">
        <svg viewBox="0 0 24 24" class="icon">
        <path d="M12 21s-7-5.2-9.5-8.3C.5 9.5 2.5 5 6.5 5 
        9 5 10.5 6.5 12 8 
        13.5 6.5 15 5 17.5 5 
        21.5 5 23.5 9.5 21.5 12.7 
        19 15.8 12 21 12 21z"/>
        </svg>
        </button>
        <!-- delete -->
        ${parseInt(data.user_id) === parseInt(currentUserId) ? `
        <button class="icon-btn delete" onclick="confirmDeleteComment(${data.comment_id})">
        <svg viewBox="0 0 24 24" class="icon delete-icon">
        <path d="M6 6l12 12M18 6l-12 12"/>
        </svg>
        </button>
        ` : ""}
        </div>
        </div>
        </div>`;
        document.getElementById("commentsList").innerHTML = newComment + document.getElementById("commentsList").innerHTML;
        document.getElementById("commentText").value = "";
        let countElement = document.querySelector(
          `.comment-btn[onclick="openComments(${currentPostId})"]`
        ).nextElementSibling;
        countElement.innerText = parseInt(countElement.innerText) + 1;
      }
    });
  }
  
  function outsideClick(e) {
    if (e.target.id === "commentModal") {
      closeComments();
    }
  }
  
  function deleteComment(commentId) {
    fetch(`/delete-comment/${commentId}`, {
      method: "POST"
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        let el = document.querySelector(`.comment[data-id="${commentId}"]`);
        if (el) {
          el.style.opacity = "0";
          setTimeout(() => {
            el.remove();
            let countElement = document.querySelector(
              `.comment-btn[onclick="openComments(${currentPostId})"]`
            ).nextElementSibling;
            countElement.innerText = Math.max(
              0,
              parseInt(countElement.innerText) - 1
            );
          }, 200);
        }
      }
    });
  }
  
  function confirmDeleteComment(commentId) {
    if (confirm("Delete this comment?")) {
      deleteComment(commentId);
    }
  }
  
  function confirmDelete() {
    return confirm("Are you sure want to delete this post?");
  }
