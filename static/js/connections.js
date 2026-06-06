let connState = {
  open: false,
  activeTab: "followers"
};

// ── RENDER ─────────────────────────────────────────────
function _connRender() {
  const modal = document.getElementById("connectionsModal");
  const sheet = document.getElementById("connSheet");

  if (connState.open) {
    sheet.style.transition = "none";
    sheet.style.transform = "translateY(100%)";
    modal.style.display = "flex";
    document.body.style.overflow = "hidden";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sheet.style.transition = "transform 0.36s cubic-bezier(0.32, 0.72, 0, 1)";
        sheet.style.transform = "translateY(0)";
      });
    });

  } else {
    sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";
    sheet.style.transform = "translateY(100%)";
    document.body.style.overflow = "";

    sheet.addEventListener("transitionend", () => {
      modal.style.display = "none";
      sheet.style.transition = "";
      sheet.style.transform = "";
    }, { once: true });
  }
}

// ── OPEN ───────────────────────────────────────────────
function openConnections(tab) {
  if (connState.open) return;

  connState.open = true;
  connState.activeTab = tab || "followers";

  history.pushState({ connModal: true }, "");

  _connSetTab(connState.activeTab);
  _connLoad(connState.activeTab);
  _connRender();
}

// ── CLOSE ──────────────────────────────────────────────
function closeConnections() {
  if (connState.open) {
    history.back();
  }
}

// ── HISTORY ────────────────────────────────────────────
window.addEventListener("popstate", (e) => {
  const wasOpen = connState.open;
  const stateIsOurs = !!(e.state && e.state.connModal);

  if (wasOpen && !stateIsOurs) {
    connState.open = false;
    _connRender();
  } else if (!wasOpen && stateIsOurs) {
    connState.open = true;
    _connRender();
  }
});

// ── TAB SWITCH ─────────────────────────────────────────
function switchTab(tab) {
  if (tab === connState.activeTab) return;
  connState.activeTab = tab;
  _connSetTab(tab);
  _connLoad(tab);
}

// ── INTERNAL ───────────────────────────────────────────
function _connSetTab(tab) {
  document.getElementById("connTabFollowers").classList.toggle("active", tab === "followers");
  document.getElementById("connTabFollowing").classList.toggle("active", tab === "following");
}

async function _connLoad(tab) {
  const list = document.getElementById("connList");
  list.innerHTML = '<p class="conn-loading">Loading…</p>';
  try {
    // Use profileUserId (page owner) for fetching connections, not the logged-in user
    const targetId = typeof profileUserId !== "undefined" ? profileUserId : currentUser;
    const res = await fetch(`/connections/${targetId}/${tab}`);
    const users = await res.json();
    _connRenderUsers(users, tab);
  } catch (e) {
    list.innerHTML = '<p class="conn-empty">Failed to load. Try again.</p>';
  }
}

function _connRenderUsers(users, tab) {
  const list = document.getElementById("connList");
  if (!users.length) {
    list.innerHTML = '<p class="conn-empty">Nothing here yet.</p>';
    return;
  }

  list.innerHTML = users.map(u => {
    const userId   = u[0];
    const username = u[1];
    const pic      = u[2] || "/static/default.png";
    const isFollowing = Boolean(u[3]);
    const followsMe = Boolean(u[4]);

    // Self — show a View link instead of a follow button
    if (userId === currentUser) {
      return `
        <div class="conn-user">
          <div class="conn-user-left">
            <img src="${pic}" alt="${username}">
            <a href="/user/${username}" class="conn-username">${username}</a>
          </div>
          <a href="/user/${username}" class="conn-follow-btn">View</a>
        </div>`;
    }

    // "Follow Back" label: on the followers tab, everyone in the list follows you.
    // If you don't follow them back, it's a follow-back opportunity.
    const isFollowBack = followsMe && !isFollowing;

    let btnClass = "conn-follow-btn";
    if (isFollowing) btnClass += " following";
    if (isFollowBack) btnClass += " follow-back";

    let btnLabel;
    if (isFollowing) {
      btnLabel = '<span class="bolt">⚡</span> Following';
    } else if (followsMe) {
      btnLabel = "Follow Back";
    } else {
      btnLabel = "Follow";
    }

    return `
      <div class="conn-user">
        <div class="conn-user-left">
          <img src="${pic}" alt="${username}">
          <a href="/user/${username}" class="conn-username">${username}</a>
        </div>
        <button
          class="${btnClass}"
          data-follows-me="${followsMe ? 1 : 0}"
          onclick="toggleFollow(${userId}, this)"
        >${btnLabel}</button>
      </div>`;
  }).join("");

  // Intercept profile link clicks so we pop the modal's history entry
  // before navigating — fixes the "back button needs 2 clicks" issue and
  // ensures the modal doesn't ghost when returning from a profile visit.
  list.querySelectorAll("a.conn-username, a.conn-follow-btn").forEach(link => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const href = this.href;
      connState.open = false;   // mark closed so popstate won't re-open it
      history.back();           // remove the modal's pushState entry
      setTimeout(() => { window.location.href = href; }, 50);
    });
  });
}

// ── SWIPE TO CLOSE ─────────────────────────────────────
(function () {
  const sheet = document.getElementById("connSheet");
  const list  = document.getElementById("connList");

  let startY   = 0;
  let startX   = 0;
  let lastY    = 0;
  let dragging = false;
  let lockAxis = null;

  sheet.addEventListener("touchstart", (e) => {
    startY   = e.touches[0].clientY;
    startX   = e.touches[0].clientX;
    lastY    = startY;
    dragging = false;
    lockAxis = null;
    sheet.style.transition = "none";
  }, { passive: true });

  sheet.addEventListener("touchmove", (e) => {
    const dy = e.touches[0].clientY - startY;
    const dx = e.touches[0].clientX - startX;
    lastY    = e.touches[0].clientY;

    if (!lockAxis) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      lockAxis = Math.abs(dy) > Math.abs(dx) ? "vertical" : "horizontal";
    }

    if (lockAxis !== "vertical") return;

    const atTop       = list.scrollTop <= 0;
    const swipingDown = dy > 0;

    if (swipingDown && atTop) {
      dragging = true;
      sheet.style.transform = `translateY(${Math.max(0, dy)}px)`;
    } else {
      dragging = false;
    }
  }, { passive: true });

  sheet.addEventListener("touchend", () => {
    sheet.style.transition = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";

    if (dragging && (lastY - startY) > 100) {
      closeConnections();
    } else {
      sheet.style.transform = "translateY(0)";
    }

    dragging = false;
  });
})();

// ── BACKDROP ───────────────────────────────────────────
document.getElementById("connectionsModal").addEventListener("click", function (e) {
  if (e.target === this) closeConnections();
});