async function toggleFollow(userId, btn) {
  const response = await fetch(`/follow/${userId}`, { method: "POST" });
  const data = await response.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  // Update follower count — only exists on profile pages, not always in modal
  const count = document.getElementById("followers-count");
  if (count) count.innerText = data.followers;

  // Support both .follow-text (profile page span) and direct button content (modal)
  const textEl = btn.querySelector(".follow-text") || btn;

  if (data.following) {
    btn.classList.add("following");
    btn.classList.remove("follow-back");
    textEl.innerHTML = '<span class="bolt">⚡</span> Following';
    btn.classList.add("burst");
    setTimeout(() => btn.classList.remove("burst"), 2000);
  } else {
    btn.classList.remove("following");
    btn.classList.remove("burst");
    const followsMe = btn.dataset.followsMe === "1";
    if (followsMe) {
      btn.classList.add("follow-back");
      textEl.innerText = "Follow Back";
    } else {
      btn.classList.remove("follow-back");
      textEl.innerText = "Follow";
    }
  }
}