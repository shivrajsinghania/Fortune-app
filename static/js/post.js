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
  
  window.addEventListener("load", () => {
    const savedPost = sessionStorage.getItem("openCommentPost");
    if(savedPost){
      openComments(savedPost);
      
      sessionStorage.removeItem("openCommentPost");
    }
  });