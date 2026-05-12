// MODAL ELEMENTS
const modal = document.getElementById("editModal");
const modalContent = modal.querySelector(".modal-content");
const modalBody = modal.querySelector(".modal-body");
const uploadLoader = document.getElementById("uploadLoader");

// APP STATE
let appState = {
  modalOpen: false,
  compressedProfileImage: null
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

function showLoader() {
  uploadLoader.classList.add("show");
}

function hideLoader() {
  uploadLoader.classList.remove("show");
}

function updatePreviewShape(shape) {
  const previewImg = document.getElementById("previewImg");
  previewImg.className = shape;
}

// OPEN MODAL
function openEditModal() {

  // prevent duplicate history stacking
  if (appState.modalOpen) return;

  appState.modalOpen = true;

  history.pushState(
    { modalOpen: true },
    ""
  );

  render();
}

// CLOSE MODAL
function closeEditModal() {

  // close through history
  if (appState.modalOpen) {
    appState.compressedProfileImage = null;
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
    
    showLoader();
    
    try {
      const formData = new FormData();
      
      formData.append(
        "name",
        this.name.value
      );
      
      formData.append(
        "bio",
        this.bio.value
      );
      
      formData.append(
        "links",
        this.links.value
      );
      
      formData.append(
        "shape",
        this.shape.value
      );
      
      formData.append(
        "fit_type",
        this.fit_type.value
      );
      
      //comopressed image 
      if (appState.compressedProfileImage) {
        formData.append(
          "profile_pic",
          appState.compressedProfileImage
        );
      }
      
      const response = await fetch("/profile/update", {
        method: "POST",
        body: formData
      });
      
      const data = await response.json();
      
      await preloadImage(data.profile_pic);
      updateProfileUI(data);
      hideLoader();
      closeEditModal();
      
    } catch (error) {
      hideLoader();
      alert("upload failed!")
    }
  });

async function compressImage(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      const canvas =
        document.createElement("canvas");
        
      const ctx =
        canvas.getContext("2d");
        
      const maxWidth = 600;
      let width = img.width;
      let height = img.height;

      // maintain ratio
      if (width > maxWidth) {

        height =
          (height * maxWidth) / width;

        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(
        img,
        0,
        0,
        width,
        height
      );

      canvas.toBlob(

        (blob) => {

          const compressedFile =
            new File(
              [blob],
              file.name,
              {
                type: "image/jpeg"
              }
            );

          resolve(compressedFile);
        },
        "image/jpeg",
        0.7
      );
    };
  });
}

function preloadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = src;
    
    img.onload = () => {
      resolve();
    };
    
    img.onerror = () => {
      reject();
    };
  });
}

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
  document.getElementById("previewImg").className = data.shape;
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
async function previewImage(event) {
  const file = event.target.files[0];
  
  //compress IMAGE
  appState.compressedProfileImage = await compressImage(file);
  
  //preview compressed image 
  const img = document.getElementById("previewImg");
  
  img.src = URL.createObjectURL(appState.compressedProfileImage);
  
  console.log(
    "Original:",
    (file.size / 1024/ 1024).toFixed(2),
    "MB"
  );
  
  console.log(
    "Compressed:",
    (appState.compressedProfileImage.size / 1024).toFixed(0),
    "KB"
  );
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
