  function openComments(postId) {
    document.body.classList.add("modal-open");
    currentPostId = postId;
    let commentsList = document.getElementById("commentsList");
    commentsList.innerHTML = `
    <div style="padding:20px; text-align:center; color:#ccc;">
    Loading comments...
    </div>
    `;
    const _modal = document.getElementById("commentModal");
    _modal.style.display = "flex";
    // trigger open animation next frame
    requestAnimationFrame(() => requestAnimationFrame(() => _modal.classList.add("modal-visible")));
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
        <img src="${c[4] || '/static/default.png'}" loading="lazy" class="comment-avatar">
        <a
        href="/user/${c[2]}"
        class="username-link"
        onclick="sessionStorage.setItem('openCommentPost', ${postId})"
        >
        @${c[2]}
        </a>
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
        <button class="icon-btn comment-like-btn ${c[6] ? "liked" : ""}" onclick="likeComment(${c[0]}, this)">
        <svg viewBox="0 0 24 24" class="icon">
        <path d="M12 21s-7-5.2-9.5-8.3C.5 9.5 2.5 5 6.5 5 
        9 5 10.5 6.5 12 8 
        13.5 6.5 15 5 17.5 5 
        21.5 5 23.5 9.5 21.5 12.7 
        19 15.8 12 21 12 21z"/>
        </svg>
        </button>
        <span class="comment-like-count">${c[5]}</span>
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
    const _modal = document.getElementById("commentModal");
    _modal.classList.remove("modal-visible");
    setTimeout(() => {
      _modal.style.display = "none";
    }, 380);
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
    <img src="${currentProfilePic}" loading="lazy" class="comment-avatar">
    <a href="/profile" class="username-link">
    @You
    </a>
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
    <button class="icon-btn comment-like-btn" onclick="likeComment('${tempId}', this)">
    <svg viewBox="0 0 24 24" class="icon">
    <path d="M12 21s-7-5.2-9.5-8.3C.5 9.5 2.5 5 6.5 5 
    9 5 10.5 6.5 12 8 
    13.5 6.5 15 5 17.5 5 
    21.5 5 23.5 9.5 21.5 12.7 
    19 15.8 12 21 12 21z"/>
    </svg>
    </button>
    <span class="comment-like-count">0</span>
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
        
        //rpdate onclick
        const likeBtn = tempComment.querySelector(".comment-like-btn");
        likeBtn.setAttribute("onclick", `likeComment(${data.comment_id}, this)`);
        
        const deleteBtn = tempComment.querySelector(".delete");
        deleteBtn.setAttribute("onclick", `confirmDeleteComment(${data.comment_id})`);
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
  
  async function likeComment(commentId, button) {
    if(button.dataset.loading === "true") return;
    button.dataset.loading = "true";
    
    const countElement = button.nextElementSibling;
    let currentCount = parseInt(countElement.innerText);
    let isLiked = button.classList.contains("liked");
    
    //instant like/dislke
    if(isLiked) {
      button.classList.remove("liked");
      countElement.innerText = currentCount - 1;
    } else {
      button.classList.add("liked");
      countElement.innerText = currentCount + 1;
    }
    // ===== animation =====
    button.classList.remove("pop");
    void button.offsetWidth;
    button.classList.add("pop");
    
    try{
      const response = await fetch(
        `/like-comment/${commentId}`,
        {
          method: "POST"
        }
      );
      
      const data = await response.json();
      countElement.innerText = data.comment_likes;
    
    } catch(error) {
      console.log(error);
      // rollback
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
  // ===== SWIPE TO CLOSE =====
  (function() {
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    let velocityY = 0;
    let lastY = 0;
    let lastTime = 0;
    let swipeSource = null; // 'header' | 'list'

    const CLOSE_THRESHOLD = 0.35;
    const VELOCITY_THRESHOLD = 0.5;

    function getModalEls() {
      return {
        modal: document.getElementById("commentModal"),
        content: document.querySelector("#commentModal .modal-content"),
        header: document.querySelector("#commentModal .modal-header"),
        list: document.getElementById("commentsList")
      };
    }

    function isModalOpen() {
      const m = document.getElementById("commentModal");
      return m && m.style.display === "flex";
    }

    function onDragStart(y, source) {
      const { content } = getModalEls();
      if (!content) return;
      isDragging = true;
      swipeSource = source;
      startY = y;
      currentY = 0;
      lastY = y;
      lastTime = Date.now();
      velocityY = 0;
      content.style.transition = "none";
    }

    function onDragMove(y) {
      if (!isDragging) return;
      const { content, modal, list } = getModalEls();
      if (!content) return;

      // If swiping from list, abort if user scrolled down
      if (swipeSource === 'list' && list && list.scrollTop > 2) {
        onDragCancel();
        return;
      }

      const delta = y - startY;
      if (delta < 0) {
        content.style.transform = "translateY(0)";
        return;
      }

      currentY = delta;
      const now = Date.now();
      const dt = now - lastTime;
      if (dt > 0) velocityY = (y - lastY) / dt;
      lastY = y;
      lastTime = now;

      content.style.transform = `translateY(${currentY}px)`;
      const progress = Math.min(currentY / (content.offsetHeight * CLOSE_THRESHOLD), 1);
      modal.style.background = `rgba(0,0,0,${0.6 * (1 - progress * 0.7)})`;
    }

    function onDragEnd() {
      if (!isDragging) return;
      isDragging = false;
      swipeSource = null;
      const { content, modal } = getModalEls();
      if (!content) return;

      const modalH = content.offsetHeight;
      const shouldClose = currentY > modalH * CLOSE_THRESHOLD || velocityY > VELOCITY_THRESHOLD;

      if (shouldClose) {
        content.style.transition = "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
        modal.style.transition = "background 0.3s ease";
        content.style.transform = `translateY(${modalH}px)`;
        modal.style.background = "rgba(0,0,0,0)";
        setTimeout(() => {
          content.style.transform = "";
          content.style.transition = "";
          modal.style.background = "";
          modal.style.transition = "";
          closeComments();
        }, 300);
      } else {
        content.style.transition = "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
        modal.style.transition = "background 0.3s ease";
        content.style.transform = "translateY(0)";
        modal.style.background = "rgba(0,0,0,0.6)";
        setTimeout(() => {
          content.style.transition = "";
          modal.style.transition = "";
          modal.style.background = "";
        }, 300);
      }
    }

    function onDragCancel() {
      if (!isDragging) return;
      isDragging = false;
      swipeSource = null;
      const { content, modal } = getModalEls();
      if (!content) return;
      content.style.transition = "transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)";
      content.style.transform = "translateY(0)";
      modal.style.background = "rgba(0,0,0,0.6)";
      setTimeout(() => { content.style.transition = ""; }, 300);
    }

    // Touch — header
    document.addEventListener("touchstart", function(e) {
      const { header } = getModalEls();
      if (!header || !header.contains(e.target) || !isModalOpen()) return;
      onDragStart(e.touches[0].clientY, 'header');
    }, { passive: true });

    // Touch — comments list (only when scrolled to top)
    document.addEventListener("touchstart", function(e) {
      const { list } = getModalEls();
      if (!list || !list.contains(e.target) || !isModalOpen()) return;
      if (list.scrollTop <= 2) {
        onDragStart(e.touches[0].clientY, 'list');
      }
    }, { passive: true });

    document.addEventListener("touchmove", function(e) {
      if (!isDragging) return;
      onDragMove(e.touches[0].clientY);
    }, { passive: true });

    document.addEventListener("touchend", function() {
      if (isDragging) onDragEnd();
    });

    // Mouse (desktop testing) — header only
    document.addEventListener("mousedown", function(e) {
      const { header } = getModalEls();
      if (!header || !header.contains(e.target) || !isModalOpen()) return;
      onDragStart(e.clientY, 'header');
    });

    document.addEventListener("mousemove", function(e) {
      if (!isDragging) return;
      onDragMove(e.clientY);
    });

    document.addEventListener("mouseup", function() {
      if (isDragging) onDragEnd();
    });
  })();
