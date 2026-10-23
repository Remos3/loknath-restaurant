/**
 * Oriel — forms.js
 * Reservation + contact forms (DEMO ONLY).
 *
 * Nothing is sent, stored or booked: no network requests, no localStorage.
 * Validation runs on blur, live once a field has an error, and on submit.
 * Every success message states that the form is a demo.
 *
 * Forms are marked up with [data-demo-form="reservation|contact"] and start
 * hidden; this script reveals them (the pages show a <noscript> notice).
 */

import {
  $,
  $$,
  createEl,
  pluralize,
  prefersReducedMotion,
  showToast,
} from "./utils.js";

const SIMULATED_DELAY_MS = 700;
const MAX_ADVANCE_DAYS = 30;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ---------- Date & time helpers (all local time, no UTC surprises) ---------- */

const pad = (n) => String(n).padStart(2, "0");

const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Parse "YYYY-MM-DD" into a local Date, or null if it isn't a real date. */
function parseISO(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  const real =
    date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  return real ? date : null;
}

const formatTime = (minutes) => {
  const h = Math.floor(minutes / 60);
  return `${h % 12 || 12}:${pad(minutes % 60)} ${h >= 12 ? "pm" : "am"}`;
};

const timeValue = (minutes) => `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;

/** Opening hours by weekday (0 = Sunday). `last` is the final seating hour. */
const SCHEDULE = {
  0: { open: 16, last: 20 }, // Sunday 4–9 pm
  1: null, //                   Monday closed
  2: { open: 17, last: 21 }, // Tue–Thu 5–10 pm
  3: { open: 17, last: 21 },
  4: { open: 17, last: 21 },
  5: { open: 17, last: 22 }, // Fri–Sat 5–11 pm
  6: { open: 17, last: 22 },
};

/** Half-hour slots for a date; same-day slots need an hour's notice. */
function slotsFor(date) {
  const rule = SCHEDULE[date.getDay()];
  if (!rule) return [];

  const now = new Date();
  const isToday = toISO(date) === toISO(now);
  const cutoff = isToday ? now.getHours() * 60 + now.getMinutes() + 60 : -1;

  const slots = [];
  for (let m = rule.open * 60; m <= rule.last * 60; m += 30) {
    if (m > cutoff) slots.push(m);
  }
  return slots;
}

/* ---------- Field rules (return an error message, or "" when valid) ---------- */

const rules = {
  name(value) {
    const s = value.trim();
    if (!s) return "Please enter your name.";
    if (s.length < 2 || !/\p{L}/u.test(s)) return "Please enter your full name.";
    if (s.length > 80) return "Please keep your name under 80 characters.";
    return "";
  },
  email(value) {
    const s = value.trim();
    if (!s) return "Please enter your email address.";
    if (s.length > 254 || !EMAIL_RE.test(s)) {
      return "Enter a valid email address, like name@example.com.";
    }
    return "";
  },
  phone(value) {
    const s = value.trim();
    if (!s) return ""; // optional
    const digits = s.replace(/\D/g, "");
    if (!/^[+()\d\s.-]+$/.test(s) || digits.length < 7 || digits.length > 15) {
      return "Enter a valid phone number, or leave this blank.";
    }
    return "";
  },
  consent(checked, demoText) {
    return checked ? "" : demoText;
  },
};

/* ---------- Generic validator ---------- */

function createValidator(form, fieldRules) {
  const control = (name) => form.elements.namedItem(name);
  const wrapperOf = (el) => el.closest("[data-field]");

  function show(el, message) {
    const wrapper = wrapperOf(el);
    wrapper?.classList.toggle("field--error", Boolean(message));
    const out = wrapper?.querySelector(".field__error");
    if (out) out.textContent = message;
    if (message) el.setAttribute("aria-invalid", "true");
    else el.removeAttribute("aria-invalid");
  }

  function check(name) {
    const el = control(name);
    if (!el) return "";
    const value = el.type === "checkbox" ? el.checked : el.value;
    const message = fieldRules[name](value);
    show(el, message);
    return message;
  }

  function checkAll() {
    const invalid = [];
    for (const name of Object.keys(fieldRules)) {
      if (check(name)) invalid.push(control(name));
    }
    return invalid.sort((a, b) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
    );
  }

  function clearAll() {
    for (const name of Object.keys(fieldRules)) {
      const el = control(name);
      if (el) show(el, "");
    }
  }

  const hasError = (el) => Boolean(wrapperOf(el)?.classList.contains("field--error"));

  return { check, checkAll, clearAll, hasError };
}

function setStatus(form, type, title, text) {
  const box = $("[data-form-status]", form);
  if (!box) return;
  box.replaceChildren();
  if (!type) return;

  const notice = createEl("div", { className: `notice notice--${type}` });
  notice.append(
    createEl("span", { className: "notice__title", text: title }),
    createEl("span", { text })
  );
  box.append(notice);
}

/* ---------- Shared demo-form behaviour ---------- */

function setupDemoForm(form, { rules: fieldRules, summarize, afterReset }) {
  const validator = createValidator(form, fieldRules);
  const submit = $('button[type="submit"]', form);
  const panel = $("[data-form-success]");
  const title = $("[data-form-success-title]", panel);
  const summary = $("[data-form-summary]", panel);
  let busy = false;

  const isRuleField = (el) =>
    el && typeof el.name === "string" && Object.hasOwn(fieldRules, el.name);

  form.addEventListener("focusout", (event) => {
    if (isRuleField(event.target)) validator.check(event.target.name);
  });

  // Once a field shows an error, re-check it live so the message clears as soon as it's fixed.
  const live = (event) => {
    const el = event.target;
    if (isRuleField(el) && validator.hasError(el)) validator.check(el.name);
  };
  form.addEventListener("input", live);
  form.addEventListener("change", live);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) return;

    const invalid = validator.checkAll();
    if (invalid.length) {
      setStatus(
        form,
        "error",
        "Please check the form.",
        invalid.length === 1
          ? "One field needs your attention."
          : `${invalid.length} fields need your attention.`
      );
      invalid[0].focus();
      return;
    }

    setStatus(form);
    busy = true;
    form.setAttribute("aria-busy", "true");
    submit.classList.add("is-loading");

    // Simulated processing only. No data leaves the page.
    setTimeout(
      () => {
        try {
          summary.replaceChildren(
            ...summarize(form).map(([label, value]) => {
              const row = createEl("div");
              row.append(
                createEl("dt", { text: label }),
                createEl("dd", { text: value })
              );
              return row;
            })
          );
          form.hidden = true;
          panel.hidden = false;
          title.focus({ preventScroll: true });
          panel.scrollIntoView({
            behavior: prefersReducedMotion() ? "auto" : "smooth",
            block: "start",
          });
          showToast("Demo only: nothing was submitted.", { type: "success" });
        } catch (error) {
          console.error("[oriel] Demo form failed", error);
          setStatus(
            form,
            "error",
            "Something went wrong.",
            "The demo couldn’t complete. Please try again."
          );
        } finally {
          busy = false;
          form.removeAttribute("aria-busy");
          submit.classList.remove("is-loading");
        }
      },
      prefersReducedMotion() ? 0 : SIMULATED_DELAY_MS
    );
  });

  $("[data-form-reset]", panel).addEventListener("click", () => {
    form.reset();
    validator.clearAll();
    setStatus(form);
    afterReset?.();
    summary.replaceChildren();
    panel.hidden = true;
    form.hidden = false;
    form.elements[0]?.focus();
  });

  form.hidden = false;
  return validator;
}

/* ---------- Reservation form ---------- */

function initReservation(form) {
  const dateEl = form.elements.namedItem("date");
  const timeEl = form.elements.namedItem("time");
  const timeHint = $("#res-time-hint");

  const refreshDateLimits = () => {
    const today = startOfToday();
    dateEl.min = toISO(today);
    dateEl.max = toISO(addDays(today, MAX_ADVANCE_DAYS));
  };

  const dateError = (value) => {
    if (!value) return "Please choose a date.";
    const date = parseISO(value);
    if (!date) return "Please enter a valid date.";
    const today = startOfToday();
    if (date < today) return "Please choose today or a future date.";
    if (date > addDays(today, MAX_ADVANCE_DAYS)) {
      return `Tables are released ${MAX_ADVANCE_DAYS} days ahead. Please choose an earlier date.`;
    }
    if (!SCHEDULE[date.getDay()]) return "We’re closed on Mondays. Please choose another day.";
    if (!slotsFor(date).length) return "No times are left today. Please choose another date.";
    return "";
  };

  function rebuildTimes() {
    const previous = timeEl.value;
    const date = parseISO(dateEl.value);
    const usable = Boolean(date) && dateError(dateEl.value) === "";

    const options = [
      createEl("option", {
        text: usable ? "Select a time" : "Choose a date first",
        attrs: { value: "" },
      }),
    ];

    if (usable) {
      slotsFor(date).forEach((m) =>
        options.push(createEl("option", { text: formatTime(m), attrs: { value: timeValue(m) } }))
      );
    }

    timeEl.replaceChildren(...options);
    timeEl.disabled = !usable;
    if (options.some((o) => o.value === previous)) timeEl.value = previous;

    timeHint.textContent = usable
      ? `Last seating ${formatTime(SCHEDULE[date.getDay()].last * 60)}.`
      : "Times appear once you pick an open date.";
  }

  const validator = setupDemoForm(form, {
    rules: {
      date: dateError,
      time(value) {
        if (timeEl.disabled) return ""; // the date field already explains why
        if (!value) return "Please choose a time.";
        const date = parseISO(dateEl.value);
        return date && slotsFor(date).some((m) => timeValue(m) === value)
          ? ""
          : "That time isn’t available. Please choose another.";
      },
      guests(value) {
        if (!value) return "Please select the number of guests.";
        if (value === "7plus") {
          return "For parties of seven or more, please contact us instead.";
        }
        const n = Number(value);
        return Number.isInteger(n) && n >= 1 && n <= 6 ? "" : "Please select a valid party size.";
      },
      name: rules.name,
      phone: rules.phone,
      email: rules.email,
      notes: (value) =>
        value.length > 300 ? "Please keep special requests under 300 characters." : "",
      consent: (checked) =>
        rules.consent(checked, "Please confirm that you understand this is a demo."),
    },
    summarize(f) {
      const get = (name) => f.elements.namedItem(name).value;
      const date = parseISO(get("date"));
      const guests = Number(get("guests"));
      const rows = [
        [
          "Date",
          date
            ? date.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : get("date"),
        ],
        ["Time", timeEl.selectedOptions[0]?.textContent ?? get("time")],
        ["Guests", `${guests} ${pluralize(guests, "guest")}`],
      ];
      if (get("occasion")) rows.push(["Occasion", get("occasion")]);
      rows.push(["Name", get("name").trim()], ["Email", get("email").trim()]);
      return rows;
    },
    afterReset() {
      refreshDateLimits();
      rebuildTimes();
    },
  });

  const onDateInput = () => {
    rebuildTimes();
    if (validator.hasError(timeEl)) validator.check("time");
  };
  dateEl.addEventListener("input", onDateInput);
  dateEl.addEventListener("change", onDateInput);

  refreshDateLimits();
  rebuildTimes();
}

/* ---------- Contact form ---------- */

function initContact(form) {
  const message = form.elements.namedItem("message");
  const topic = form.elements.namedItem("topic");
  const counter = $("[data-char-count]", form);

  const updateCount = () => {
    if (counter) counter.textContent = String(message.value.length);
  };
  message.addEventListener("input", updateCount);

  setupDemoForm(form, {
    rules: {
      name: rules.name,
      email: rules.email,
      topic: (value) => (value ? "" : "Please choose a topic."),
      message(value) {
        const s = value.trim();
        if (!s) return "Please write a message.";
        if (s.length < 10) return "Please write at least 10 characters.";
        if (s.length > 1000) return "Please keep your message under 1,000 characters.";
        return "";
      },
      consent: (checked) =>
        rules.consent(checked, "Please confirm that you understand this is a demo."),
    },
    summarize(f) {
      const get = (name) => f.elements.namedItem(name).value;
      return [
        ["Topic", topic.selectedOptions[0]?.textContent ?? get("topic")],
        ["Name", get("name").trim()],
        ["Email", get("email").trim()],
        ["Message length", `${get("message").trim().length} characters`],
      ];
    },
    afterReset: updateCount,
  });

  // Deep link from the reservation page: contact.html?topic=large-party
  const requested = new URLSearchParams(window.location.search).get("topic");
  if (requested && $$("option", topic).some((o) => o.value === requested)) {
    topic.value = requested;
  }
  updateCount();
}

/* ---------- Boot ---------- */

const reservation = $('[data-demo-form="reservation"]');
const contact = $('[data-demo-form="contact"]');

if (reservation) initReservation(reservation);
if (contact) initContact(contact);
