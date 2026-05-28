/* calc-app v1.1.0 */
  (function () {
    let isRevealed = false;
    let inited = false;

    function revealCalculator() {
      if (isRevealed) return;
      const calculatorRoot = document.getElementById("calculatorRoot");
      const calcLoading = document.getElementById("calcLoading");
      if (!calculatorRoot) return;
      isRevealed = true;
      calculatorRoot.hidden = false;
      calculatorRoot.setAttribute("aria-hidden", "false");
      if (calcLoading) calcLoading.hidden = true;
    }

    function init() {
    const groups = (typeof CALC_CONFIG !== 'undefined') ? CALC_CONFIG.groups : [];
    const programmes = (typeof CALC_CONFIG !== 'undefined') ? CALC_CONFIG.programmes : {};
    const donationOptions = (typeof CALC_CONFIG !== 'undefined') ? CALC_CONFIG.donationOptions : [];
    if (!groups.length || inited) return;
    inited = true;

    const state = {
      activeGroup: "seniors",
      selectedDonation: 100000,
      isCustom: false,
      customValue: "",
      selections: {
        seniors: new Set(["home"]),
        children: new Set(["younghearts"]),
        pwd: new Set(["rchd"]),
        families: new Set(["meals"]),
        migrant: new Set(["chow"])
      }
    };

    const groupTabsEl = document.getElementById("groupTabs");
    const programmeListEl = document.getElementById("programmeList");
    const donationPillsEl = document.getElementById("donationPills");
    const impactListEl = document.getElementById("impactList");
    const customWrapEl = document.getElementById("customWrap");
    const customInputEl = document.getElementById("customInput");

    function formatCurrency(value) {
      return `$${Math.max(0, Math.floor(value)).toLocaleString("en-SG")}`;
    }

    function formatNumber(value) {
      return Math.max(0, Math.floor(value)).toLocaleString("en-SG");
    }
    window.formatNumber = formatNumber;

    function getActiveGroupConfig() {
      return groups.find((g) => g.id === state.activeGroup);
    }

    const CUSTOM_MIN = 500;

    function getDonationAmount() {
      if (!state.isCustom) return state.selectedDonation;
      const numeric = Number(String(state.customValue).replace(/[^0-9.]/g, ""));
      return Number.isFinite(numeric) ? Math.max(CUSTOM_MIN, numeric) : CUSTOM_MIN;
    }

    function isSingleProgrammeGroup(groupId) {
      const group = groups.find((g) => g.id === groupId);
      return group ? group.programmes.length === 1 : false;
    }

    function renderTabs() {
      groupTabsEl.innerHTML = groups
        .map((group) => {
          const active = group.id === state.activeGroup;
          return `
            <button class="tab-btn ${active ? "active" : ""}" data-group="${group.id}" type="button">
              <span class="material-symbols-outlined">${group.icon}</span>
              <span>${group.label}</span>
            </button>
          `;
        })
        .join("");
    }

    function renderProgrammes() {
      const group = getActiveGroupConfig();
      const selected = state.selections[state.activeGroup];
      const locked = isSingleProgrammeGroup(state.activeGroup);

      programmeListEl.innerHTML = group.programmes
        .map((id) => {
          const data = programmes[id];
          const checked = selected.has(id);
          return `
            <label class="programme-row ${checked ? "checked" : ""} ${locked ? "locked" : ""}">
              <input type="checkbox" data-programme="${id}" ${checked ? "checked" : ""} ${locked ? "disabled" : ""} />
              <div class="programme-copy">
                <div class="programme-main">
                  <span class="material-symbols-outlined">${data.icon}</span>
                  <span>${data.key}</span>
                </div>
                <div class="programme-sub">${data.subLabel}</div>
              </div>
            </label>
          `;
        })
        .join("");
    }

    function renderDonationPills() {
      donationPillsEl.innerHTML = donationOptions
        .map((option) => {
          const isCustom = option === "custom";
          const active = isCustom ? state.isCustom : !state.isCustom && state.selectedDonation === option;
          const label = isCustom ? "Custom" : formatCurrency(option);
          return `<button type="button" class="pill-btn ${active ? "active" : ""}" data-value="${option}">${label}</button>`;
        })
        .join("");

      customWrapEl.classList.toggle("active", state.isCustom);
    }

    function renderImpact() {
      const donation = getDonationAmount();
      const selectedIds = Array.from(state.selections[state.activeGroup]);

      if (selectedIds.length === 0) {
        impactListEl.innerHTML = '<div class="placeholder">Select at least one programme to see your impact breakdown.</div>';
        return;
      }

      const allocation = donation / selectedIds.length;
      impactListEl.innerHTML = selectedIds
        .map((id) => {
          const programme = programmes[id];
          const impactCount = Math.floor(allocation / programme.cost);
          const amountText = formatCurrency(allocation);
          const nText = formatNumber(impactCount);
          const statHtml = programme.statFn ? programme.statFn(allocation) : programme.stat(nText);
          const sentence = programme.copyFn
            ? programme.copyFn(allocation, amountText)
            : programme.copy.replace("[amount]", amountText).replace("[N]", nText);

          return `
            <article class="impact-card">
              <div class="impact-top">
                <h3 class="impact-name">${programme.key}</h3>
                <div class="impact-alloc">${amountText} allocated</div>
              </div>
              <p class="impact-stat">${statHtml}</p>
              <p class="impact-copy">${sentence}</p>
              ${programme.baseNote ? '<p class="impact-ref">' + programme.baseNote + '</p>' : ''}
              ${programme.extraFn ? programme.extraFn(allocation) : ''}
            </article>
          `;
        })
        .join("");
    }

    function refreshAll() {
      renderTabs();
      renderProgrammes();
      renderDonationPills();
      renderImpact();
    }

    function debounce(fn, delay) {
      let timer;
      return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
      };
    }

    groupTabsEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".tab-btn");
      if (!btn) return;
      state.activeGroup = btn.dataset.group;
      refreshAll();
    });

    programmeListEl.addEventListener("change", (event) => {
      const input = event.target;
      if (!input.matches('input[type="checkbox"]')) return;

      const group = state.activeGroup;
      if (isSingleProgrammeGroup(group)) {
        input.checked = true;
        return;
      }

      const programmeId = input.dataset.programme;
      const selected = state.selections[group];

      if (input.checked) {
        selected.add(programmeId);
      } else {
        selected.delete(programmeId);
      }

      renderProgrammes();
      renderImpact();
    });

    donationPillsEl.addEventListener("click", (event) => {
      const btn = event.target.closest(".pill-btn");
      if (!btn) return;

      const value = btn.dataset.value;
      if (value === "custom") {
        state.isCustom = true;
        if (!state.customValue) {
          state.customValue = String(state.selectedDonation);
          customInputEl.value = state.customValue;
        }
      } else {
        state.isCustom = false;
        state.selectedDonation = Number(value);
      }

      renderDonationPills();
      renderImpact();

      if (state.isCustom) {
        customInputEl.focus();
        customInputEl.select();
      }
    });

    const onCustomInput = debounce(() => {
      state.customValue = customInputEl.value;
      renderImpact();
    }, 300);

    customInputEl.addEventListener("input", onCustomInput);

    customInputEl.addEventListener("blur", () => {
      const numeric = Number(String(state.customValue).replace(/[^0-9.]/g, ""));
      if (!Number.isFinite(numeric) || numeric < CUSTOM_MIN) {
        state.customValue = String(CUSTOM_MIN);
        customInputEl.value = String(CUSTOM_MIN);
        renderImpact();
      }
    });

    customInputEl.value = String(state.selectedDonation);
    refreshAll();
    revealCalculator();
    } // end init

    function waitForElements(cb, attempts) {
      attempts = attempts || 0;
      if (document.getElementById('groupTabs')) {
        cb();
      } else if (attempts < 50) {
        setTimeout(function() { waitForElements(cb, attempts + 1); }, 100);
      }
    }

    function boot() {
      waitForElements(init);
    }

    window.addEventListener("load", boot, { once: true });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  })();
