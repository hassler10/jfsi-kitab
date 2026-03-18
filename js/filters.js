/* =============================================
   JFSI — Gestion des Filtres & Onglets
   js/filters.js
   ============================================= */

// ── FILTRES BIBLIOTHÈQUE ──
class BiblioFilter {
  constructor() {
    this.currentCategory = "all";
    this.currentType = "books";
    this.init();
  }

  init() {
    this.attachCategoryFilters();
    this.attachTypeFilters();
  }

  attachCategoryFilters() {
    document.querySelectorAll(".filter-tab").forEach((tab) => {
      tab.addEventListener("click", (e) => {
        document
          .querySelectorAll(".filter-tab")
          .forEach((t) => t.classList.remove("active"));
        e.target.classList.add("active");
        this.currentCategory = e.target.dataset.category || "all";
        this.filterBooks();
        notif(
          "📚 Catégorie: " +
            (this.currentCategory === "all" ? "Toutes" : this.currentCategory),
        );
      });
    });
  }

  attachTypeFilters() {
    document.querySelectorAll("[data-type-filter]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.currentType = e.target.dataset.typeFilter;
        document
          .querySelectorAll("[data-type-filter]")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.switchView();
      });
    });
  }

  filterBooks() {
    const books = document.querySelectorAll(".livre-card");
    let shown = 0;

    books.forEach((book) => {
      const category = book.dataset.category || "all";
      if (this.currentCategory === "all" || category === this.currentCategory) {
        book.style.display = "block";
        shown++;
      } else {
        book.style.display = "none";
      }
    });

    if (shown === 0 && this.currentCategory !== "all") {
      notif("❌ Aucun ouvrage dans cette catégorie", true);
    }
  }

  switchView() {
    const booksSection = document.querySelector(".livres-section");
    const audioSection = document.querySelector(".audio-section");

    if (booksSection && audioSection) {
      if (this.currentType === "books") {
        booksSection.style.display = "block";
        audioSection.style.display = "none";
      } else {
        booksSection.style.display = "none";
        audioSection.style.display = "block";
      }
    }
  }
}

// ── FILTRES FORMATIONS ──
class FormationFilter {
  constructor() {
    this.currentLevel = "all";
    this.currentCategory = "all";
    this.init();
  }

  init() {
    this.attachLevelFilters();
    this.attachCategoryFilters();
  }

  attachLevelFilters() {
    document.querySelectorAll("[data-level-filter]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.currentLevel = e.target.dataset.levelFilter;
        document
          .querySelectorAll("[data-level-filter]")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.filterFormations();
        notif("🎓 Niveau: " + this.currentLevel);
      });
    });
  }

  attachCategoryFilters() {
    document.querySelectorAll("[data-form-category]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        this.currentCategory = e.target.dataset.formCategory;
        document
          .querySelectorAll("[data-form-category]")
          .forEach((b) => b.classList.remove("active"));
        e.target.classList.add("active");
        this.filterFormations();
      });
    });
  }

  filterFormations() {
    const cards = document.querySelectorAll(".formation-card");
    let shown = 0;

    cards.forEach((card) => {
      const level = card.dataset.level || "all";
      const category = card.dataset.category || "all";

      const levelMatch =
        this.currentLevel === "all" || level === this.currentLevel;
      const categoryMatch =
        this.currentCategory === "all" || category === this.currentCategory;

      if (levelMatch && categoryMatch) {
        card.style.display = "block";
        shown++;
      } else {
        card.style.display = "none";
      }
    });

    if (shown === 0) {
      notif("❌ Aucune formation trouvée", true);
    }
  }
}

// ── RECHERCHE DYNAMIQUE ──
function setupSearch() {
  const searchInputs = document.querySelectorAll(
    ".search-input, [data-search-input]",
  );

  searchInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      const query = e.target.value.toLowerCase().trim();
      const cardsSelector =
        e.target.dataset.searchCards || ".livre-card, .formation-card";
      const cards = document.querySelectorAll(cardsSelector);
      let found = 0;

      cards.forEach((card) => {
        const titre =
          card
            .querySelector('[data-search-field="title"]')
            ?.textContent.toLowerCase() || "";
        const auteur =
          card
            .querySelector('[data-search-field="author"]')
            ?.textContent.toLowerCase() || "";

        if (titre.includes(query) || auteur.includes(query) || query === "") {
          card.style.display = "block";
          found++;
        } else {
          card.style.display = "none";
        }
      });

      if (found === 0 && query !== "") {
        notif("🔍 Aucun résultat trouvé", true);
      }
    });
  });
}

// ── INITIALISER ──
document.addEventListener("DOMContentLoaded", () => {
  // Initialiser les filtres si les éléments existent
  if (document.querySelector(".filter-tab")) {
    window.biblioFilter = new BiblioFilter();
  }
  if (document.querySelector("[data-level-filter]")) {
    window.formationFilter = new FormationFilter();
  }

  // Initialiser la recherche
  setupSearch();

  // Marquer le premier onglet comme actif par défaut
  const firstTab = document.querySelector(".filter-tab");
  if (firstTab && !firstTab.classList.contains("active")) {
    firstTab.classList.add("active");
  }

  // Marquer les onglets de type comme actifs
  const firstTypeBtn = document.querySelector("[data-type-filter]");
  if (firstTypeBtn) {
    firstTypeBtn.classList.add("active");
  }
});

// ── SCROLL REVEAL ANIMATIONS ──
const revealElements = () => {
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add("visible"), i * 50);
        }
      });
    },
    { threshold: 0.1 },
  );
  reveals.forEach((el) => observer.observe(el));
};

document.addEventListener("DOMContentLoaded", revealElements);
