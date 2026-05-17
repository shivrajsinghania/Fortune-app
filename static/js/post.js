let currentPostId = null;
const deleteLoader = document.getElementById("deleteLoader");
function showDeleteLoader(){
  deleteLoader.classList.add("show");
}
function hideDeleteLoader(){
  deleteLoader.classList.remove("show");
}
  
  async function likePost(postId, button){
    
    // prevent spam clicking
    if(button.dataset.loading === "true"){
      return;
    }
    
    button.dataset.loading = "true";
    let countElement = button.parentElement.querySelector(".like-count");
    let currentCount = parseInt(countElement.innerText);
    let isLiked = button.classList.contains("liked");
    
    // ===== INSTANT UI UPDATE =====
    if(isLiked){
      button.classList.remove("liked");
      countElement.innerText = currentCount - 1;
    }else{
      button.classList.add("liked");
      countElement.innerText = currentCount + 1;
    }
    
    // ===== RESTART ANIMATION =====
    button.classList.remove("pop");
    void button.offsetWidth;
    button.classList.add("pop");
    
    try{
      let response = await fetch(`/like/${postId}`, {
        method: "POST"
      });
      
      let data = await response.json();
      
      // sync with backend
      countElement.innerText = data.likes;
      
    }catch(err){
      console.log(err);
      
      // rollback if failed
      if(isLiked){
        button.classList.add("liked");
        countElement.innerText = currentCount;
      }else{
        button.classList.remove("liked");
        countElement.innerText = currentCount;
      }
      
    }finally{
      setTimeout(() => {
        button.dataset.loading = "false";
      }, 250);
    }
  }
  
  function openComments(postId) {
    document.body.classList.add("modal-open");
    currentPostId = postId;
    let commentsList = document.getElementById("commentsList");
    commentsList.innerHTML = `
    <div style="padding:20px; text-align:center; color:#ccc;">
    Loading comments...
    </div>
    `;
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
      commentsList.innerHTML = html;
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
    let input = document.getElementById("commentText");
    
    let text = input.value.trim();
    
    if (!text) return;
    
    // clear immediately
    input.value = "";
    
    // temporary id
    const tempId = "temp-" + Date.now();
    
    // ===== CREATE COMMENT INSTANTLY =====
    let newComment = `
    <div class="comment new-comment" data-id="${tempId}">
    <div class="comment-top">
    <span class="username">
    @You
    </span>
    </div>
    <div class="comment-body">
    <span class="text">
    ${text}
    </span>
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
    <button
    class="icon-btn delete"
    onclick="confirmDeleteComment('${tempId}')"
    >
    <svg viewBox="0 0 24 24" class="icon delete-icon">
    <path d="M6 6l12 12M18 6l-12 12"/>
    </svg>
    </button>
    </div>
    </div>
    </div>
    `;
    
    // insert instantly
    document.getElementById("commentsList").innerHTML = newComment + document.getElementById("commentsList").innerHTML;
    
    // ===== UPDATE COUNT INSTANTLY =====
    let countElement = document.querySelector(
      `.comment-btn[onclick="openComments(${currentPostId})"]`
    ).nextElementSibling;
    
    countElement.innerText = parseInt(countElement.innerText) + 1;
    
    // ===== BACKEND REQUEST =====
    fetch(`/add-comment/${currentPostId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text
      })
    })
    
    .then(res => res.json())
    .then(data => {
      // replace temp id
      let tempComment = document.querySelector(
        `[data-id="${tempId}"]`
      );
      
      if (tempComment) {
        tempComment.setAttribute(
          "data-id",
          data.comment_id
        );
      }
    })
    
    .catch(() => {
      // remove failed comment
      let tempComment = document.querySelector(
        `[data-id="${tempId}"]`
      );
      
      if (tempComment) {
        tempComment.remove();
      }
      
      // revert count
      countElement.innerText = parseInt(countElement.innerText) - 1;
      alert("Comment failed!");
    });
  }
  
  function outsideClick(e) {
    if (e.target.id === "commentModal") {
      closeComments();
    }
  }
  
  function deleteComment(commentId) {
    let el = document.querySelector(
      `.comment[data-id="${commentId}"]`
    );
    
    if (!el) return;
    // animate instantly
    el.classList.add("removing");
    // update count instantly
    let countElement = document.querySelector(
      `.comment-btn[onclick="openComments(${currentPostId})"]`
    ).nextElementSibling;
    
    countElement.innerText = Math.max(
      0,
      parseInt(countElement.innerText) - 1
    );
    
    // remove visually
    setTimeout(() => {
      el.remove();
    }, 250);
    
    // backend request
    fetch(`/delete-comment/${commentId}`, {
      method: "POST"
    })
    
    .then(res => res.json())
    .then(data => {
      if (!data.success) {
        alert("Delete failed!");
      }
    })
    
    .catch(() => {
      alert("Delete failed!");
    });
  }
  
  function confirmDeleteComment(commentId) {
    const result = confirm("Delete this comment?");
    if (!result) return;
    deleteComment(commentId);
  }
  
  function imageLoaded(img) {
    img.parentElement.classList.add("loaded");
  }
  
  async function confirmDeletePost(postId){
    const result = confirm(" Are you sure want to delete this post?");
    if(!result) return;
    let postElement = document.getElementById(`post-${postId}`);
    // show loader
    showDeleteLoader();
    try{
      let response = await fetch(
        `/delete-post/${postId}`,
        {
          method: "POST"
        }
      );
      
      let data = await response.json();
      if(data.success){
        // success state
        document.getElementById("deleteTitle").innerText = "Post Deleted";
        document.getElementById("deleteText").innerText = "Removing from feed...";
        
        // animate post
        postElement.classList.add("removing");
        setTimeout(() => {
          postElement.remove();
          hideDeleteLoader();
        }, 500);
      }else{
        hideDeleteLoader();
        alert("Delete failed");
      }
    }catch(err){
      console.log(err);
      hideDeleteLoader();
      alert("Delete failed");
    }
  }
  
  window.addEventListener("load", () => {
    document.querySelectorAll(".image-wrapper img").forEach((img) => {
      if (img.complete) {
        imageLoaded(img);
      }
    });
  });