/* =============================================
   JFSI — Script Global
   js/global.js
   ============================================= */

// ── SCROLL REVEAL ──
document.addEventListener("DOMContentLoaded", () => {
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("visible"), i * 80);
        }
      });
    },
    { threshold: 0.1 },
  );
  reveals.forEach((el) => observer.observe(el));

  // Navbar scroll
  window.addEventListener("scroll", () => {
    const nav = document.querySelector("nav");
    if (!nav) return;
    nav.style.padding = window.scrollY > 50 ? "10px 60px" : "14px 60px";
  });

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const t = document.querySelector(a.getAttribute("href"));
      if (t) {
        e.preventDefault();
        t.scrollIntoView({ behavior: "smooth" });
      }
    });
  });

  // Marquer lien actif dans la nav
  const page = window.location.pathname.split("/").pop();
  document.querySelectorAll(".nav-links a").forEach((a) => {
    if (a.getAttribute("href") && a.getAttribute("href").includes(page)) {
      a.classList.add("active");
    }
  });

  // ── Afficher lien Admin si admin ──
  checkAdminAccess();
});

// ── BURGER MENU ──
function toggleMenu() {
  document.querySelector(".nav-links")?.classList.toggle("open");
}

// ── NOTIFICATION ──
function notif(msg, isError = false) {
  const el = document.createElement("div");
  el.className = "notif";
  el.style.borderColor = isError
    ? "rgba(231,76,60,0.5)"
    : "rgba(201,168,76,0.5)";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

// ── AFFICHER LIEN ADMIN ──
async function checkAdminAccess() {
  try {
    const response = await fetch("/api/auth/session", {
      credentials: "include",
    });

    if (!response.ok) return;

    const data = await response.json();

    // Afficher lien admin si utilisateur est connecté ET admin
    if (data.authenticated && data.user && data.user.role === "admin") {
      const adminLink = document.getElementById("adminLink");
      if (adminLink) {
        adminLink.style.display = "block";
      }
    }
  } catch (error) {
    console.log("Admin check:", error.message);
  }
}
