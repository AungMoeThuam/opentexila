<script setup>
import { ref } from 'vue';
import AppIcon from '../components/AppIcon.vue';

const loading = ref(false);
const colors = [
  ['Brand (INTI red)', '--ot-brand', '#d7141a'],
  ['Brand tint', '--ot-brand-tint', '#fdecec'],
  ['Navy (sidebar)', '--ot-navy', '#0b1f3a'],
  ['Link', '--ot-link', '#1d5fd1'],
  ['Text', '--ot-ink', '#1e293b'],
  ['Muted text', '--ot-muted', '#5c6b7d'],
  ['Canvas', '--ot-canvas', '#f5f7fa'],
  ['Surface', '--ot-surface', '#ffffff'],
  ['Border', '--ot-border', '#d8e0e7'],
  ['Info tint', '--ot-tint', '#eaf1fb'],
  ['Success', '--ot-success', '#176541'],
  ['Warning', '--ot-warning', '#805400'],
  ['Error', '--ot-danger', '#a32936'],
  ['Focus', '--ot-focus', '#0d6efd'],
];
const statuses = [
  ['live', 'Class in progress'],
  ['present', 'Present'],
  ['late', 'Late'],
  ['pending', 'Pending'],
  ['absent', 'Absent'],
  ['upcoming', 'Upcoming'],
  ['closed', 'Closed'],
];
</script>

<template>
  <a class="visually-hidden-focusable skip-link" href="#guide-content"
    >Skip to content</a
  >
  <header class="bg-white border-bottom">
    <div
      class="ot-page py-3 d-flex flex-wrap align-items-center justify-content-between gap-3"
    >
      <RouterLink class="ot-brand text-decoration-none" to="/"
        >OpenTexila</RouterLink
      >
      <span class="ot-meta">Team style guide · v1 · Development only</span>
    </div>
  </header>
  <main id="guide-content" class="ot-page" tabindex="-1">
    <div class="mb-5">
      <p class="ot-eyebrow">One shared theme</p>
      <h1 class="ot-page-title">Build together. Look consistent.</h1>
      <p class="ot-subtitle">
        These examples use the app’s actual CSS. Copy the patterns, keep feature
        styles scoped, and review shared changes together.
      </p>
      <nav
        class="d-flex flex-wrap gap-4 mt-4"
        aria-label="Style guide sections"
      >
        <a href="#colors">Colors</a><a href="#type">Typography</a
        ><a href="#controls">Controls</a><a href="#states">States</a
        ><a href="#layout">Layout</a><a href="#tables">Tables</a>
        <a href="#patterns">Dashboard patterns</a><a href="#shell">App shell</a>
      </nav>
    </div>

    <section id="colors" class="mb-5" aria-labelledby="colors-title">
      <h2 id="colors-title" class="ot-section-title mb-4">
        01 · Shared colors
      </h2>
      <div class="row g-3">
        <div
          v-for="[label, token, hex] in colors"
          :key="token"
          class="col-6 col-md-3"
        >
          <div class="ot-card p-3 h-100">
            <div
              class="guide-swatch mb-3"
              :style="{ backgroundColor: `var(${token})` }"
            ></div>
            <h3 class="h6 mb-1">{{ label }}</h3>
            <code>{{ token }}</code>
            <div class="ot-meta">{{ hex }}</div>
          </div>
        </div>
      </div>
      <p class="ot-meta mt-3">
        Use semantic tokens from tokens.css. Avoid copying raw hex values into
        feature styles.
      </p>
    </section>

    <section id="type" class="mb-5" aria-labelledby="type-title">
      <h2 id="type-title" class="ot-section-title mb-4">02 · Typography</h2>
      <div class="ot-card">
        <p class="ot-eyebrow">Eyebrow · 12px · Bold</p>
        <p class="ot-page-title">Your classroom, connected.</p>
        <p class="ot-section-title">Section title · 24px</p>
        <p>
          Body · 16px / 1.5 line height. Keep instructions short and useful.
        </p>
        <p class="ot-meta mb-0">
          Supporting text · 14px. System font stack; no additional font
          download.
        </p>
      </div>
    </section>

    <section id="controls" class="mb-5" aria-labelledby="controls-title">
      <h2 id="controls-title" class="ot-section-title mb-4">
        03 · Buttons and forms
      </h2>
      <div class="row g-4">
        <div class="col-12 col-lg-6">
          <div class="ot-card h-100">
            <h3 class="h5 mb-3">48px controls · 8px corners</h3>
            <div class="d-flex flex-wrap gap-3 mb-4">
              <button type="button" class="btn btn-primary">
                Primary action
              </button>
              <button type="button" class="btn btn-outline-primary">
                Secondary action
              </button>
              <button type="button" class="btn btn-primary" disabled>
                Unavailable
              </button>
            </div>
            <div class="form-check mb-3">
              <input
                id="loading-demo"
                v-model="loading"
                class="form-check-input"
                type="checkbox"
              />
              <label class="form-check-label" for="loading-demo"
                >Show loading state</label
              >
            </div>
            <button
              type="button"
              class="btn btn-primary w-100"
              :disabled="loading"
              :aria-busy="loading"
            >
              <span
                v-if="loading"
                class="spinner-border spinner-border-sm me-2"
                aria-hidden="true"
              ></span
              >{{ loading ? 'Checking location…' : 'Check in' }}
            </button>
            <p class="ot-meta mt-3 mb-0" role="status">
              {{
                loading
                  ? 'Example loading state. No location is collected.'
                  : 'Use Tab to inspect the visible blue focus ring.'
              }}
            </p>
          </div>
        </div>
        <div class="col-12 col-lg-6">
          <div class="ot-card h-100">
            <div class="mb-3">
              <label class="form-label" for="guide-email"
                >Institutional email</label
              ><input
                id="guide-email"
                type="email"
                class="form-control"
                placeholder="name@example.edu"
                aria-describedby="guide-email-help"
              />
              <div id="guide-email-help" class="form-text">
                Use a visible label, not only a placeholder.
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="guide-class">Class</label
              ><select id="guide-class" class="form-select">
                <option>Interface Design and Development</option>
                <option>Creating Secure Software</option>
              </select>
            </div>
            <div>
              <label class="form-label" for="guide-invalid"
                >Institutional ID · error example</label
              ><input
                id="guide-invalid"
                class="form-control is-invalid"
                value=""
                aria-invalid="true"
                aria-describedby="guide-id-error"
              />
              <div id="guide-id-error" class="invalid-feedback">
                Enter your institutional ID.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section id="states" class="mb-5" aria-labelledby="states-title">
      <h2 id="states-title" class="ot-section-title mb-4">
        04 · Status and feedback
      </h2>
      <div class="d-flex flex-wrap gap-3 mb-4">
        <span
          v-for="[kind, label] in statuses"
          :key="kind"
          class="ot-status"
          :class="`ot-status--${kind}`"
          >{{ label }}</span
        >
      </div>
      <div class="row g-3">
        <div class="col-12 col-md-4">
          <div class="ot-notice ot-notice--success h-100">
            <strong>You’re checked in.</strong>
            <p>Your attendance was recorded at 09:08.</p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="ot-notice ot-notice--warning h-100">
            <strong>Location access is required</strong>
            <p>Enable location in your browser, then try again.</p>
          </div>
        </div>
        <div class="col-12 col-md-4">
          <div class="ot-notice ot-notice--error h-100">
            <strong>Couldn’t load your classes</strong>
            <p>Check your connection and retry.</p>
          </div>
        </div>
      </div>
      <div class="ot-card ot-empty mt-4">
        <h3 class="h5">No classes scheduled today</h3>
        <p class="ot-meta mb-0">
          Your next class will appear here when it is scheduled.
        </p>
      </div>
    </section>

    <section id="layout" class="mb-5" aria-labelledby="layout-title">
      <h2 id="layout-title" class="ot-section-title mb-4">
        05 · Responsive page pattern
      </h2>
      <p class="ot-meta">
        Bootstrap: row g-4 → col-12 col-lg-7 + col-12 col-lg-5. Stacks below
        992px.
      </p>
      <div class="row g-4">
        <div class="col-12 col-lg-7">
          <div class="ot-card ot-card--live h-100">
            <div
              class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4"
            >
              <p class="ot-eyebrow mb-0">COS30043 · Group G1</p>
              <span class="ot-status ot-status--live">Class in progress</span>
            </div>
            <h3 class="ot-section-title">Interface Design and Development</h3>
            <p class="ot-meta">09:00–11:00 · Room B-204</p>
            <div class="ot-notice mt-4">
              <strong>Check-in available until 11:00</strong>
              <p>Successful check-ins after 09:15 are marked Late.</p>
            </div>
          </div>
        </div>
        <div class="col-12 col-lg-5">
          <div class="ot-card h-100">
            <h3 class="ot-section-title">Check in to your class</h3>
            <p class="ot-subtitle mb-4">
              Allow location access to confirm you’re at your classroom.
            </p>
            <button type="button" class="btn btn-primary w-100">
              Check in · visual example
            </button>
            <p class="ot-meta mt-3 mb-0">
              Location is checked only when you check in.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section id="tables" class="mb-5" aria-labelledby="tables-title">
      <h2 id="tables-title" class="ot-section-title mb-4">06 · Tables</h2>
      <div class="ot-card">
        <div
          class="table-responsive"
          tabindex="0"
          role="region"
          aria-label="Example class roster, horizontally scrollable on small screens"
        >
          <table class="table ot-table align-middle mb-0">
            <caption>
              Example class roster — fictional data.
            </caption>
            <thead>
              <tr>
                <th scope="col">Student</th>
                <th scope="col">Institutional ID</th>
                <th scope="col">Checked in</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Amelia Lee</th>
                <td>10456821</td>
                <td>09:04</td>
                <td>
                  <span class="ot-status ot-status--present">Present</span>
                </td>
              </tr>
              <tr>
                <th scope="row">Sara Lim</th>
                <td>10456823</td>
                <td>09:18</td>
                <td><span class="ot-status ot-status--late">Late</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
    <section id="patterns" class="mb-5" aria-labelledby="patterns-title">
      <h2 id="patterns-title" class="ot-section-title mb-4">
        07 · Dashboard patterns
      </h2>
      <div class="ot-page-header">
        <div>
          <h3 class="ot-page-title mb-1">Page header</h3>
          <p class="ot-subtitle">
            <code>.ot-page-header</code> holds the title and right-aligned
            actions.
          </p>
        </div>
        <div class="ot-page-header__actions">
          <button type="button" class="btn btn-outline-primary">Export</button>
          <button type="button" class="btn btn-primary">Add new</button>
        </div>
      </div>

      <div class="ot-hero mb-3">
        <p class="ot-hero__greeting">Good morning,</p>
        <p class="ot-hero__name">Student name</p>
        <p class="ot-hero__meta">Programme · Faculty · Intake</p>
      </div>

      <div class="d-grid gap-2 mb-4">
        <details class="ot-disclosure ot-disclosure--error">
          <summary class="ot-disclosure__summary">
            Semester 3 course enrolment is now open
          </summary>
          <div class="ot-disclosure__body">
            Registration is available during the stated period.
          </div>
        </details>
        <details class="ot-disclosure ot-disclosure--warning">
          <summary class="ot-disclosure__summary">
            Tuition fee payment due
          </summary>
          <div class="ot-disclosure__body">
            Please review your outstanding fees before the deadline.
          </div>
        </details>
        <details class="ot-disclosure">
          <summary class="ot-disclosure__summary">Information notice</summary>
          <div class="ot-disclosure__body">Neutral information goes here.</div>
        </details>
      </div>

      <div class="row g-4">
        <div class="col-12 col-lg-7">
          <div class="ot-card h-100">
            <div class="ot-card__header">
              <h3 class="ot-card__title">
                <AppIcon name="bell" /> Announcements
              </h3>
              <a class="ot-card__link" href="#patterns">View all</a>
            </div>
            <p class="ot-meta mb-0">
              Put a table, list or empty state here. Use
              <code>.ot-card__header</code> for the title row.
            </p>
          </div>
        </div>
        <div class="col-12 col-lg-5">
          <div class="ot-card h-100">
            <div class="ot-card__header">
              <h3 class="ot-card__title">
                <AppIcon name="check" /> Current check-in session
              </h3>
            </div>
            <dl class="ot-dl mb-0">
              <div>
                <dt>Course</dt>
                <dd>COS30043 Interface Design</dd>
              </div>
              <div>
                <dt>Time</dt>
                <dd>09:00 – 11:00</dd>
              </div>
              <div>
                <dt>Room</dt>
                <dd>B-204</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  <span class="ot-status ot-status--present">Checked in</span>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div class="ot-card mt-4">
        <h3 class="h5 mb-3">Top bar extras</h3>
        <div class="d-flex flex-wrap align-items-center gap-3">
          <div class="ot-search">
            <span class="ot-search__icon"><AppIcon name="search" /></span>
            <label class="visually-hidden" for="guide-search"
              >Search pages</label
            >
            <input
              id="guide-search"
              type="search"
              class="form-control"
              placeholder="Go to a page, e.g. attendance"
            />
          </div>
          <button type="button" class="ot-icon-btn">
            <AppIcon name="bell" />
            <span class="ot-icon-btn__dot"></span>
            <span class="visually-hidden">Notifications, unread</span>
          </button>
        </div>
        <p class="ot-meta mt-3 mb-0">
          Shell only: <code>AppLayout</code> places these. Feature pages do not
          need them.
        </p>
      </div>
    </section>

    <section id="shell" class="mb-5" aria-labelledby="shell-title">
      <h2 id="shell-title" class="ot-section-title mb-4">08 · App shell</h2>
      <div class="ot-card">
        <p>
          Signed-in pages render inside <code>AppLayout</code>: a collapsible
          navy sidebar and a top bar. Do not build your own header or sidebar.
          Your page only fills the content area.
        </p>
        <ul class="mb-3">
          <li>Nav items live in <code>src/layouts/navigation.js</code>.</li>
          <li>
            Register routes as children of the AppLayout route in
            <code>src/router/index.js</code>.
          </li>
          <li>
            Use <code>AppIcon</code> for icons; the active item is brand red.
          </li>
          <li>
            From 992px the menu button collapses the sidebar to icons. Below
            that it opens a drawer.
          </li>
        </ul>
        <RouterLink class="btn btn-outline-primary" to="/dashboard"
          >Open sample dashboard</RouterLink
        >
      </div>
    </section>
    <div class="ot-notice">
      <strong>Before opening a PR</strong>
      <p>
        Reuse these classes, use scoped feature CSS, and check your page at
        390px, 768px and 1280px. Record shared styling changes in
        docs/DESIGN_SYSTEM.md.
      </p>
    </div>
  </main>
</template>

<style scoped>
.guide-swatch {
  height: 4rem;
  border: 1px solid var(--ot-border);
  border-radius: var(--ot-radius-control);
}
code {
  font-size: var(--ot-text-xs);
  overflow-wrap: anywhere;
}
section {
  scroll-margin-top: var(--ot-space-6);
}
</style>
