// MODAL ELEMENTS
const modal = document.getElementById("editModal");
const modalContent = modal.querySelector(".modal-content");
const modalBody = modal.querySelector(".modal-body");

// APP STATE
let appState = {
  modalOpen: false
};

// RENDER FUNCTION
function render() {

  if (appState.modalOpen) {
    modal.style.display = "flex";
    document.body.classList.add("modal-open");

    // reset swipe position
    modalContent.style.transform = "translateY(0)";
  } else {
    modal.style.display = "none";
    document.body.classList.remove("modal-open");
  }
}

// OPEN MODAL
function openEditModal() {

  // prevent duplicate history stacking
  if (appState.modalOpen) return;

  appState.modalOpen = true;

  history.pushState(
    { modalOpen: true },
    "",
    "#edit"
  );

  render();
}

// CLOSE MODAL
function closeEditModal() {

  // close through history
  if (appState.modalOpen) {
    history.back();
  }
}

// HISTORY CONTROL
window.addEventListener("popstate", (event) => {

  appState.modalOpen =
    !!(event.state && event.state.modalOpen);

  render();
});

// PROFILE FORM SUBMIT
document
  .getElementById("editForm")
  .addEventListener("submit", async function (e) {

    e.preventDefault();

    const formData = new FormData(this);

    const response = await fetch("/profile/update", {
      method: "POST",
      body: formData
    });

    const data = await response.json();

    // live UI update
    updateProfileUI(data);

    // close modal
    closeEditModal();
});

// UPDATE PROFILE UI
function updateProfileUI(data) {

  // name
  document.querySelector(".name").textContent =
    data.name;

  // bio
  document.querySelector(".bio").textContent =
    data.bio;

  // image
  const img =
    document.querySelector(".profile-card img");

  img.src = data.profile_pic;
  img.className = data.shape;
  img.style.objectFit = data.fit_type;

  // LINKS
  let linkEl =
    document.querySelector(".website");

  if (data.links && data.links.trim() !== "") {

    // create if not exists
    if (!linkEl) {

      linkEl = document.createElement("a");

      linkEl.className = "website";

      document
        .querySelector(".profile-card")
        .appendChild(linkEl);
    }

    linkEl.href =
      "https://" + data.links;

    linkEl.textContent =
      data.links;

    linkEl.style.display = "block";

  } else {

    // remove if empty
    if (linkEl) {
      linkEl.remove();
    }
  }
}

// IMAGE PREVIEW
function previewImage(event) {

  const img =
    document.getElementById("previewImg");

  img.src =
    URL.createObjectURL(event.target.files[0]);
}

// SWIPE TO CLOSE
let startY = 0;
let currentY = 0;
let isDragging = false;


// TOUCH START
modalContent.addEventListener("touchstart", (e) => {

  // allow swipe only when scroll is top
  if (modalBody.scrollTop > 0) return;

  startY = e.touches[0].clientY;

  isDragging = true;
});


// TOUCH MOVE
modalContent.addEventListener("touchmove", (e) => {

  if (!isDragging) return;

  currentY = e.touches[0].clientY;

  let diff = currentY - startY;

  // only downward swipe
  if (diff > 0) {

    // resistance effect
    modalContent.style.transform =
      `translateY(${diff * 0.9}px)`;
  }
});


// TOUCH END
modalContent.addEventListener("touchend", () => {

  if (!isDragging) return;

  isDragging = false;

  let diff = currentY - startY;

  // close threshold
  if (diff > 120) {

    closeEditModal();

  } else {

    // snap back
    modalContent.style.transform =
      "translateY(0)";
  }
});
