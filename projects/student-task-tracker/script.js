/*
 * Student Task & Grade Tracker
 * ----------------------------
 * 1. State and localStorage: the single source of truth.
 * 2. Helpers: dates, averages, and safe DOM building.
 * 3. Rendering: turn our data into the visible dashboard.
 * 4. Forms: validate input before changing state.
 * 5. Events: connect buttons, filters, and dialogs.
 *
 * No build step or dependencies. Open index.html through a local web server.
 */
"use strict";

(() => {
    // 1. STATE AND STORAGE ----------------------------------------------------
    // A separate key keeps the portfolio's own settings untouched.
    const STORAGE_KEY = "jdc-student-task-tracker-v1";
    const COLORS = {
        blue: { name: "Blue", hex: "#70bbff" },
        pink: { name: "Pink", hex: "#f472b6" },
        green: { name: "Green", hex: "#6bd5b1" },
        purple: { name: "Purple", hex: "#b59afa" },
        amber: { name: "Amber", hex: "#f4c778" }
    };
    const PRIORITIES = { low: "Low", medium: "Medium", high: "High" };
    const STATUSES = { pending: "Pending", "in-progress": "In progress", completed: "Completed" };
    const $ = (id) => document.getElementById(id);
    let storageAvailable = true;
    let storageMessage = "";
    let state = loadState();
    let editor = { type: "subject", id: null };
    let deletion = null;
    let dialogOpener = null;
    let toastTimer;
    let lastDay = today();

    function emptyState() {
        return { version: 1, subjects: [], assignments: [], grades: [], theme: "dark" };
    }

    function loadState() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved === null) return emptyState();
            const parsed = JSON.parse(saved);
            if (!isValidState(parsed)) throw new Error("Invalid saved data");
            return parsed;
        } catch (error) {
            // Preserve unreadable data rather than overwriting it with an empty list.
            storageAvailable = false;
            storageMessage = "Your saved workspace could not be opened, or browser storage is blocked. Existing saved data has been kept. Changes will only last for this visit.";
            return emptyState();
        }
    }

    function isValidState(data) {
        // Validate stored data too: extensions or manual edits can change it.
        if (!data || data.version !== 1 || !["dark", "light"].includes(data.theme)) return false;
        if (![data.subjects, data.assignments, data.grades].every(Array.isArray)) return false;
        const uniqueIds = (items) => items.every((item) => item && typeof item.id === "string" && item.id.length > 0)
            && new Set(items.map((item) => item.id)).size === items.length;
        if (![data.subjects, data.assignments, data.grades].every(uniqueIds)) return false;
        const validText = (text, limit) => typeof text === "string" && text.trim().length > 0 && text.length <= limit;
        const subjectIds = new Set(data.subjects.map((subject) => subject.id));
        return data.subjects.every((subject) => validText(subject.name, 60) && Object.hasOwn(COLORS, subject.color))
            && data.assignments.every((task) => validText(task.title, 120) && subjectIds.has(task.subjectId)
                && isValidDate(task.deadline) && Object.hasOwn(PRIORITIES, task.priority) && Object.hasOwn(STATUSES, task.status))
            && data.grades.every((grade) => validText(grade.title, 120) && subjectIds.has(grade.subjectId)
                && Number.isFinite(grade.score) && grade.score >= 0 && grade.score <= 100);
    }

    function saveState() {
        if (storageAvailable) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
                $("save-status").textContent = "Saved on this browser";
                $("storage-warning").hidden = true;
                storageMessage = "";
                return true;
            } catch (error) {
                storageMessage = "Your browser could not save these changes. Storage may be full or blocked. Keep this tab open; your latest changes will be lost if you refresh.";
            }
        }
        showStorageWarning();
        return false;
    }

    function showStorageWarning() {
        $("storage-warning").textContent = storageMessage;
        $("storage-warning").hidden = false;
        $("save-status").textContent = "Changes are not saved";
    }

    // 2. SMALL, REUSABLE HELPERS ----------------------------------------------
    function createId() {
        return typeof crypto.randomUUID === "function"
            ? crypto.randomUUID()
            : Date.now().toString(36) + Math.random().toString(36).slice(2);
    }

    function today() {
        // Use the local calendar day, avoiding UTC date shifts around midnight.
        const date = new Date();
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    }

    function isValidDate(value) {
        if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < "1900-01-01") return false;
        const date = new Date(`${value}T12:00:00`);
        return Number.isFinite(date.getTime())
            && date.getFullYear() === Number(value.slice(0, 4))
            && date.getMonth() + 1 === Number(value.slice(5, 7))
            && date.getDate() === Number(value.slice(8, 10));
    }

    function isOverdue(task) {
        // A task due today becomes overdue tomorrow, unless already completed.
        return task.status !== "completed" && task.deadline < today();
    }

    function formatDate(value) {
        return new Date(`${value}T12:00:00`).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
    }

    function average(values) {
        return values.length ? values.reduce((sum, number) => sum + number, 0) / values.length : null;
    }

    function subjectAverage(id) {
        return average(state.grades.filter((grade) => grade.subjectId === id).map((grade) => grade.score));
    }

    function percentage(value) {
        return value === null ? "—" : `${value.toLocaleString("en", { maximumFractionDigits: 2 })}%`;
    }

    function subjectById(id) {
        return state.subjects.find((subject) => subject.id === id);
    }

    function collection(type) {
        return { subject: "subjects", assignment: "assignments", grade: "grades" }[type];
    }

    function element(tag, className = "", text = "") {
        const node = document.createElement(tag);
        node.className = className;
        // User input is always text, never HTML, so markup cannot run as code.
        if (text !== "") node.textContent = text;
        return node;
    }

    function icon(name) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", "icon");
        svg.setAttribute("aria-hidden", "true");
        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttribute("href", `#i-${name}`);
        svg.append(use);
        return svg;
    }

    function actionButton(action, label, iconName, id = "", className = "icon-button") {
        const button = element("button", className);
        button.type = "button";
        button.dataset.action = action;
        if (id) button.dataset.id = id;
        button.setAttribute("aria-label", label);
        button.title = label;
        if (iconName) button.append(icon(iconName));
        if (className !== "icon-button") button.append(document.createTextNode(label));
        return button;
    }

    function rowActions(type, item) {
        const actions = element("div", "row-actions");
        const name = item.name || item.title;
        actions.append(
            actionButton(`edit-${type}`, `Edit ${name}`, "edit", item.id),
            actionButton(`delete-${type}`, `Delete ${name}`, "trash", item.id)
        );
        return actions;
    }

    function subjectTag(subject) {
        const tag = element("span", "subject-tag");
        const dot = element("span", "subject-dot");
        dot.style.setProperty("--subject-color", COLORS[subject.color].hex);
        dot.setAttribute("aria-hidden", "true");
        tag.append(dot, document.createTextNode(subject.name));
        return tag;
    }

    function emptyMessage(iconName, title, message, action, label) {
        const wrapper = element("div", "empty-state");
        const art = element("div", "empty-art");
        art.setAttribute("aria-hidden", "true");
        art.append(icon(iconName));
        wrapper.append(art, element("h3", "", title), element("p", "", message));
        if (action) wrapper.append(actionButton(action, label, "plus", "", "button button-secondary"));
        return wrapper;
    }

    function notify(message) {
        clearTimeout(toastTimer);
        $("toast").textContent = message;
        $("toast").classList.add("visible");
        toastTimer = setTimeout(() => $("toast").classList.remove("visible"), 4500);
    }

    function persistAndRender(message) {
        const saved = saveState();
        renderAll();
        notify(saved ? message : `${message} Changes are only in this tab; see the storage notice.`);
    }

    // 3. RENDER THE DASHBOARD -------------------------------------------------
    function renderAll() {
        renderDashboard();
        fillSubjectOptions($("filter-subject"), "All subjects", "all");
        renderTasks();
        renderSubjects();
        renderGrades();
    }

    function renderDashboard() {
        const total = state.assignments.length;
        const completed = state.assignments.filter((task) => task.status === "completed").length;
        const percent = total ? Math.round(completed / total * 100) : 0;
        $("total-count").textContent = total;
        $("completed-count").textContent = completed;
        $("pending-count").textContent = total - completed;
        $("overdue-count").textContent = state.assignments.filter(isOverdue).length;
        $("nav-task-count").textContent = total - completed;
        $("assignment-count").textContent = total;
        $("overall-progress").value = percent;
        $("overall-progress").textContent = `${percent}%`;
        $("overall-percent").textContent = `${percent}%`;
        $("overall-caption").textContent = total
            ? `${completed} of ${total} assignments complete.${completed === total ? " All caught up. Take a breath!" : " Keep going, one step at a time."}`
            : "Your next small win starts with one task.";
        $("today-label").textContent = new Date().toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }

    function fillSubjectOptions(select, placeholder, placeholderValue = "") {
        const selected = select.value;
        select.replaceChildren(new Option(placeholder, placeholderValue));
        state.subjects.forEach((subject) => select.add(new Option(subject.name, subject.id)));
        select.value = state.subjects.some((subject) => subject.id === selected) ? selected : placeholderValue;
    }

    function renderTasks() {
        const search = $("task-search").value.trim().toLocaleLowerCase();
        const subject = $("filter-subject").value;
        const priority = $("filter-priority").value;
        const status = $("filter-status").value;
        const direction = $("sort-deadline").value === "desc" ? -1 : 1;
        const filtering = Boolean(search || subject !== "all" || priority !== "all" || status !== "all");
        const tasks = state.assignments.filter((task) => {
            const matchesStatus = status === "all" || (status === "overdue" ? isOverdue(task) : task.status === status);
            return task.title.toLocaleLowerCase().includes(search)
                && (subject === "all" || task.subjectId === subject)
                && (priority === "all" || task.priority === priority) && matchesStatus;
        }).sort((a, b) => direction * a.deadline.localeCompare(b.deadline) || a.title.localeCompare(b.title));
        $("clear-filters").hidden = !filtering;
        $("results-count").textContent = `Showing ${tasks.length} of ${state.assignments.length} assignments`;
        const list = $("task-list");
        list.replaceChildren();
        if (!tasks.length) {
            if (state.assignments.length) {
                list.append(emptyMessage("search", "No matches just yet", "Try another search or clear your filters to see all assignments.", "clear-filters", "Clear filters"));
            } else {
                const hasSubjects = state.subjects.length > 0;
                list.append(emptyMessage("list", "A fresh start, a clear mind.", hasSubjects
                    ? "Your subjects are ready. Add your first assignment and give your next goal a deadline."
                    : "Start with a subject, then add your assignments. A more organized semester starts here.",
                hasSubjects ? "add-assignment" : "add-subject", hasSubjects ? "Add your first assignment" : "Add your first subject"));
            }
            return;
        }
        tasks.forEach((task) => {
            const complete = task.status === "completed";
            const row = element("article", `task-row${complete ? " is-completed" : ""}`);
            const checkLabel = element("label", "task-check");
            const checkbox = element("input");
            checkbox.type = "checkbox";
            checkbox.checked = complete;
            checkbox.dataset.taskId = task.id;
            checkbox.setAttribute("aria-label", `${complete ? "Mark incomplete" : "Complete"}: ${task.title}`);
            checkLabel.append(checkbox, icon("check"));
            const details = element("div", "task-details");
            const meta = element("div", "task-meta");
            const deadline = element("time", `deadline${isOverdue(task) ? " overdue" : ""}`);
            deadline.dateTime = task.deadline;
            const dueLabel = task.deadline === today() ? "Due today" : formatDate(task.deadline);
            deadline.append(icon("calendar"), document.createTextNode(`${dueLabel}${isOverdue(task) ? " · Overdue" : ""}`));
            meta.append(subjectTag(subjectById(task.subjectId)), deadline,
                element("span", `badge priority-${task.priority}`, `${PRIORITIES[task.priority]} priority`),
                element("span", "badge status-badge", STATUSES[task.status]));
            details.append(element("h3", "task-title", task.title), meta);
            row.append(checkLabel, details, rowActions("assignment", task));
            list.append(row);
        });
    }

    function renderSubjects() {
        const list = $("subject-list");
        list.replaceChildren();
        $("subject-count").textContent = state.subjects.length;
        if (!state.subjects.length) {
            list.append(emptyMessage("book", "Meet your next semester.", "Keep your tasks and grades together. Add a subject to make yourself at home."));
        }
        state.subjects.forEach((subject) => {
            const tasks = state.assignments.filter((task) => task.subjectId === subject.id);
            const completed = tasks.filter((task) => task.status === "completed").length;
            const percent = tasks.length ? Math.round(completed / tasks.length * 100) : 0;
            const row = element("article", "subject-row");
            row.style.setProperty("--subject-color", COLORS[subject.color].hex);
            const top = element("div", "subject-row-top");
            const initials = subject.name.split(/\s+/).slice(0, 2).map((word) => Array.from(word)[0]).join("").toLocaleUpperCase();
            const info = element("div", "subject-info");
            const grade = subjectAverage(subject.id);
            info.append(element("h3", "", subject.name), element("p", "", grade === null ? "No grades yet" : `${percentage(grade)} average`));
            top.append(element("span", "subject-monogram", initials), info, rowActions("subject", subject));
            const label = element("div", "meter-label");
            label.append(element("span", "", `${completed} of ${tasks.length} complete`), element("strong", "", `${percent}%`));
            const progress = element("progress");
            progress.max = 100;
            progress.value = percent;
            progress.textContent = `${percent}%`;
            progress.setAttribute("aria-label", `${subject.name} assignment completion`);
            row.append(top, label, progress);
            list.append(row);
        });
    }

    function renderGrades() {
        // A zero grade counts. Only subjects with no grades (null) are excluded.
        const averages = state.subjects.map((subject) => subjectAverage(subject.id)).filter((value) => value !== null);
        $("overall-average").textContent = percentage(average(averages));
        $("graded-subject-count").textContent = averages.length ? `Across ${averages.length} graded subject${averages.length === 1 ? "" : "s"}` : "No graded subjects yet";
        $("grade-count").textContent = `${state.grades.length} ${state.grades.length === 1 ? "entry" : "entries"}`;
        const list = $("grade-list");
        list.replaceChildren();
        if (!state.grades.length) {
            list.append(emptyMessage("chart", "Your effort will show up here.", "Add a quiz, exam, or project grade to see your subject averages take shape."));
        }
        [...state.grades].reverse().forEach((grade) => {
            const row = element("article", "grade-row");
            const info = element("div", "grade-info");
            info.append(element("h4", "", grade.title), subjectTag(subjectById(grade.subjectId)));
            row.append(info, element("strong", "grade-score", percentage(grade.score)), rowActions("grade", grade));
            list.append(row);
        });
    }

    function applyTheme() {
        document.documentElement.dataset.theme = state.theme;
        const isDark = state.theme === "dark";
        $("theme-label").textContent = isDark ? "Light mode" : "Dark mode";
        $("theme-toggle").setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} theme`);
        $("theme-icon").setAttribute("href", isDark ? "#i-sun" : "#i-moon");
    }

    // 4. EDITORS AND VALIDATION -----------------------------------------------
    function openEditor(type, id = null) {
        if (type !== "subject" && !state.subjects.length) {
            notify("First, add a subject for your assignments and grades.");
            type = "subject";
            id = null;
        }
        editor = { type, id };
        dialogOpener = document.activeElement;
        document.querySelectorAll("#editor-dialog form").forEach((form) => {
            form.hidden = true;
            form.reset();
            clearErrors(form);
        });
        const form = $(`${type}-form`);
        form.hidden = false;
        $("editor-title").textContent = `${id ? "Edit" : "Add"} ${type}`;
        fillSubjectOptions($("assignment-subject"), "Choose a subject");
        fillSubjectOptions($("grade-subject"), "Choose a subject");
        if (state.subjects.length === 1) {
            $("assignment-subject").value = state.subjects[0].id;
            $("grade-subject").value = state.subjects[0].id;
        }
        if (id) {
            const item = state[collection(type)].find((entry) => entry.id === id);
            if (!item) return;
            // Form control names deliberately match their properties in state.
            Object.entries(item).forEach(([name, value]) => {
                if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value;
            });
        }
        $("editor-dialog").showModal();
        form.querySelector("input, select").focus();
    }

    function clearErrors(form) {
        form.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
        form.querySelectorAll("[aria-invalid]").forEach((field) => field.removeAttribute("aria-invalid"));
    }

    function fieldError(id, message) {
        $(id).setAttribute("aria-invalid", "true");
        $(`${id}-error`).textContent = message;
    }

    function saveForm(event) {
        event.preventDefault();
        const form = event.currentTarget;
        clearErrors(form);
        const data = new FormData(form);
        const type = editor.type;
        let item;
        if (type === "subject") {
            const name = data.get("name").trim();
            if (!name || name.length > 60) fieldError("subject-name", "Please enter a subject name between 1 and 60 characters.");
            else if (state.subjects.some((subject) => subject.id !== editor.id && subject.name.toLocaleLowerCase() === name.toLocaleLowerCase())) {
                fieldError("subject-name", "You already have a subject with this name. Try a different name.");
            }
            item = { name, color: Object.hasOwn(COLORS, data.get("color")) ? data.get("color") : "blue" };
        } else {
            const title = data.get("title").trim();
            const subjectId = data.get("subjectId");
            if (!title || title.length > 120) fieldError(`${type}-title`, "Please enter a name between 1 and 120 characters.");
            if (!subjectById(subjectId)) fieldError(`${type}-subject`, "Please choose a subject for this entry.");
            item = { title, subjectId };
            if (type === "assignment") {
                const deadline = data.get("deadline");
                if (!isValidDate(deadline)) fieldError("assignment-deadline", "Please choose a valid deadline (year 1900 or later).");
                const priority = data.get("priority");
                const status = data.get("status");
                if (!Object.hasOwn(PRIORITIES, priority)) fieldError("assignment-priority", "Please choose a priority.");
                if (!Object.hasOwn(STATUSES, status)) fieldError("assignment-status", "Please choose a status.");
                Object.assign(item, { deadline, priority, status });
            } else {
                const rawScore = data.get("score").trim();
                const score = Number(rawScore);
                if (!rawScore || !Number.isFinite(score) || score < 0 || score > 100) {
                    fieldError("grade-score", "Please enter a percentage from 0 to 100. A zero grade is allowed.");
                } else if (!$("grade-score").validity.valid) {
                    fieldError("grade-score", "Please use no more than two decimal places.");
                }
                item.score = score;
            }
        }
        const invalid = form.querySelector('[aria-invalid="true"]');
        if (invalid) {
            invalid.focus();
            return;
        }
        const items = state[collection(type)];
        item.id = editor.id || createId();
        if (editor.id) {
            const index = items.findIndex((entry) => entry.id === editor.id);
            if (index === -1) return;
            items[index] = item;
        } else {
            items.push(item);
        }
        $("editor-dialog").close();
        persistAndRender(`${type[0].toUpperCase() + type.slice(1)} ${editor.id ? "updated" : "added"}.`);
    }

    function confirmDeletion(type, id) {
        const item = state[collection(type)].find((entry) => entry.id === id);
        if (!item) return;
        deletion = { type, id };
        dialogOpener = document.activeElement;
        $("delete-title").textContent = `Delete ${type}?`;
        let message = `“${item.name || item.title}” will be permanently removed.`;
        if (type === "subject") {
            const tasks = state.assignments.filter((task) => task.subjectId === id).length;
            const grades = state.grades.filter((grade) => grade.subjectId === id).length;
            message += ` This also deletes its ${tasks} assignment${tasks === 1 ? "" : "s"} and ${grades} grade${grades === 1 ? "" : "s"}.`;
        }
        $("delete-description").textContent = message;
        $("confirm-delete").textContent = `Delete ${type}`;
        $("delete-dialog").showModal();
        $("cancel-delete").focus();
    }

    function deleteItem() {
        if (!deletion) return;
        const { type, id } = deletion;
        state[collection(type)] = state[collection(type)].filter((item) => item.id !== id);
        if (type === "subject") {
            // Remove related records too, so no task or grade loses its subject.
            state.assignments = state.assignments.filter((task) => task.subjectId !== id);
            state.grades = state.grades.filter((grade) => grade.subjectId !== id);
        }
        $("delete-dialog").close();
        persistAndRender(`${type[0].toUpperCase() + type.slice(1)} deleted.`);
    }

    function resetFilters() {
        $("task-search").value = "";
        ["filter-subject", "filter-priority", "filter-status"].forEach((id) => { $(id).value = "all"; });
        renderTasks();
        $("task-search").focus();
    }

    // 5. EVENTS AND INITIALIZATION --------------------------------------------
    // Event delegation also handles buttons created by the render functions.
    document.addEventListener("click", (event) => {
        const close = event.target.closest("[data-close]");
        if (close) $(close.dataset.close).close();
        const button = event.target.closest("[data-action]");
        if (!button) return;
        const action = button.dataset.action;
        if (action === "clear-filters") return resetFilters();
        const [verb, type] = action.split("-");
        if (verb === "add") openEditor(type);
        if (verb === "edit") openEditor(type, button.dataset.id);
        if (verb === "delete") confirmDeletion(type, button.dataset.id);
    });

    $("task-list").addEventListener("change", (event) => {
        const id = event.target.dataset.taskId;
        const task = state.assignments.find((item) => item.id === id);
        if (!task) return;
        task.status = event.target.checked ? "completed" : "pending";
        persistAndRender(task.status === "completed" ? "Assignment complete. Nice work!" : "Assignment marked pending.");
        // Rendering replaces the old checkbox. Keep keyboard focus useful.
        const nextCheckbox = [...document.querySelectorAll("[data-task-id]")].find((input) => input.dataset.taskId === id);
        (nextCheckbox || $("filter-status")).focus({ preventScroll: true });
    });

    ["subject-form", "assignment-form", "grade-form"].forEach((id) => $(id).addEventListener("submit", saveForm));
    $("task-search").addEventListener("input", renderTasks);
    ["filter-subject", "filter-priority", "filter-status", "sort-deadline"].forEach((id) => $(id).addEventListener("change", renderTasks));
    $("clear-filters").addEventListener("click", resetFilters);
    $("confirm-delete").addEventListener("click", deleteItem);
    $("theme-toggle").addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        applyTheme();
        saveState();
    });

    ["editor-dialog", "delete-dialog"].forEach((id) => {
        $(id).addEventListener("close", () => {
            const type = id === "editor-dialog" ? editor.type : deletion?.type || "subject";
            // Deleted rows no longer have a focus target: use their Add button.
            const target = dialogOpener?.isConnected ? dialogOpener : document.querySelector(`[data-action="add-${type}"]`);
            target?.focus({ preventScroll: true });
            if (id === "delete-dialog") deletion = null;
        });
    });

    function updateNavigation() {
        const current = location.hash || "#overview";
        document.querySelectorAll(".nav-link").forEach((link) => {
            const active = link.getAttribute("href") === current;
            link.classList.toggle("active", active);
            if (active) link.setAttribute("aria-current", "location");
            else link.removeAttribute("aria-current");
        });
    }
    window.addEventListener("hashchange", updateNavigation);

    // Refresh time-sensitive totals after midnight or returning to this tab.
    function refreshDay() {
        if (lastDay !== today()) {
            lastDay = today();
            renderDashboard();
            renderTasks();
        }
    }
    setInterval(refreshDay, 60000);
    document.addEventListener("visibilitychange", () => { if (!document.hidden) refreshDay(); });

    Object.entries(COLORS).forEach(([value, color], index) => {
        const label = element("label", "color-choice");
        label.style.setProperty("--subject-color", color.hex);
        label.title = color.name;
        const input = element("input");
        input.type = "radio";
        input.name = "color";
        input.value = value;
        input.defaultChecked = index === 0;
        input.setAttribute("aria-label", color.name);
        label.append(input);
        $("subject-colors").append(label);
    });

    applyTheme();
    renderAll();
    updateNavigation();
    if (storageMessage) showStorageWarning();
})();
