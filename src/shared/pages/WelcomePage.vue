<script setup>
import { RouterLink } from 'vue-router';
import heroImage from '../../assets/images/hero-phone.svg';
import classroomImage from '../../assets/images/classroom.jpg';

// The router resets scrolling to the top on every navigation, so a plain
// #hash link would not move the page. Scroll to the section here instead.
function showHowItWorks() {
  const section = document.getElementById('how-it-works');
  if (!section) return;
  const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ behavior: calm ? 'auto' : 'smooth' });
  section.focus({ preventScroll: true });
}

// Each step of a check-in, in plain words. Icons are drawn in the template.
const steps = [
  {
    icon: 'clock',
    title: 'The session opens on time',
    text: 'Sessions open and close by themselves at the times your admin sets.',
  },
  {
    icon: 'pin',
    title: 'Check in from the classroom',
    text: 'Allow your location. OpenTexila checks that you are inside the class area.',
  },
  {
    icon: 'check',
    title: 'See your status at once',
    text: 'You are marked Present or Late. If you do not check in, you are Absent when class ends.',
  },
];

const roles = [
  {
    icon: 'student',
    name: 'Students',
    summary: 'Stay on top of your classes.',
    points: [
      'See your classes and today’s sessions.',
      'Check in to a class with your location.',
      'Read class announcements and review your attendance.',
    ],
  },
  {
    icon: 'lecturer',
    name: 'Lecturers',
    summary: 'Run your classes with less paperwork.',
    points: [
      'See who is enrolled in your classes.',
      'Watch live attendance and confirm the final record.',
      'Post announcements to your students.',
    ],
  },
  {
    icon: 'admin',
    name: 'Admins',
    summary: 'Set up the institution once.',
    points: [
      'Create accounts for lecturers and students.',
      'Manage courses, classes and enrolments.',
      'Schedule sessions and set the attendance area.',
    ],
  },
];

// Stroke paths for 24 x 24 icons (drawn with currentColor).
const icons = {
  clock: ['M12 7v5l3 2', 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z'],
  pin: [
    'M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z',
    'M12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  ],
  check: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'm8.5 12.2 2.4 2.4 4.6-5'],
  student: [
    'm2.5 9 9.5-5 9.5 5-9.5 5-9.5-5Z',
    'M6.5 11.5V16c0 1.4 2.5 3 5.5 3s5.5-1.6 5.5-3v-4.5',
  ],
  lecturer: [
    'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5V15H4V5.5Z',
    'M12 15v5M8 20h8M8 8.5h8M8 11.5h5',
  ],
  admin: [
    'M12 3 20 6v6c0 4.4-3.2 7.9-8 9-4.8-1.1-8-4.6-8-9V6l8-3Z',
    'm8.5 12 2.5 2.5 4.5-5',
  ],
};
</script>

<template>
  <!-- Hero -->
  <section class="welcome-hero" aria-labelledby="welcome-title">
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-12 col-lg-6">
          <p class="welcome-pill">Location-based attendance</p>
          <h1 id="welcome-title" class="welcome-title">
            Your classroom,
            <span class="welcome-title__accent">connected.</span>
          </h1>
          <p class="welcome-lead">
            OpenTexila brings students, lecturers and admins together. Manage
            classes, share announcements and record attendance in seconds, just
            by being in the room.
          </p>
          <div class="d-flex flex-wrap gap-3 mb-4">
            <RouterLink
              class="btn btn-primary btn-lg rounded-pill px-4"
              :to="{ name: 'login' }"
              >Log in</RouterLink
            >
            <a
              class="btn btn-outline-light btn-lg rounded-pill px-4"
              href="#how-it-works"
              @click.prevent="showHowItWorks"
              >See how it works</a
            >
          </div>
          <ul class="welcome-trust list-unstyled mb-0">
            <li>Checks your location only when you check in</li>
            <li>Your exact location is never stored</li>
          </ul>
        </div>
        <div class="col-12 col-lg-6">
          <img
            class="welcome-hero__image"
            :src="heroImage"
            alt="A phone showing the class check-in screen, with notes that the student is inside the class area and has been marked Present."
            width="560"
            height="460"
          />
        </div>
      </div>
    </div>
  </section>

  <!-- How check-in works -->
  <section
    id="how-it-works"
    class="welcome-section"
    aria-labelledby="how-title"
    tabindex="-1"
  >
    <div class="container">
      <p class="text-center"><span class="welcome-tag">How it works</span></p>
      <h2 id="how-title" class="welcome-heading">Check in in three steps</h2>
      <ol class="row g-4 list-unstyled mb-0">
        <li
          v-for="(step, index) in steps"
          :key="step.title"
          class="col-12 col-md-4"
        >
          <div class="welcome-step">
            <span class="welcome-icon" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path v-for="path in icons[step.icon]" :key="path" :d="path" />
              </svg>
            </span>
            <span class="welcome-step__number">Step {{ index + 1 }}</span>
            <h3 class="h5 mb-2">{{ step.title }}</h3>
            <p class="text-secondary mb-0">{{ step.text }}</p>
          </div>
        </li>
      </ol>
    </div>
  </section>

  <!-- Classroom photo -->
  <section
    class="welcome-section welcome-section--tint"
    aria-labelledby="classroom-title"
  >
    <div class="container">
      <div class="row align-items-center g-5">
        <div class="col-12 col-lg-6 order-lg-2">
          <p><span class="welcome-tag">Built for the classroom</span></p>
          <h2
            id="classroom-title"
            class="welcome-heading welcome-heading--left"
          >
            Less roll call. More learning.
          </h2>
          <p class="text-secondary fs-5">
            Taking attendance should not use up the first minutes of a class.
            With OpenTexila, students check in as they take their seats, and
            lecturers can see who is in the room right away.
          </p>
          <ul class="welcome-checklist list-unstyled mb-0">
            <li>Students check in by themselves, from their own seat.</li>
            <li>Lecturers see attendance as it happens.</li>
            <li>Every class keeps its record in one place.</li>
          </ul>
        </div>
        <div class="col-12 col-lg-6 order-lg-1">
          <figure class="welcome-photo m-0">
            <img
              :src="classroomImage"
              alt="Students sitting at wooden desks in a lecture hall, taking notes and listening to their lecturer."
              width="1400"
              height="787"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </div>
  </section>

  <!-- Roles -->
  <section class="welcome-section" aria-labelledby="roles-title">
    <div class="container">
      <p class="text-center">
        <span class="welcome-tag">One place for everyone</span>
      </p>
      <h2 id="roles-title" class="welcome-heading">What each role can do</h2>
      <div class="row g-4">
        <div v-for="role in roles" :key="role.name" class="col-12 col-md-4">
          <article class="ot-card welcome-role h-100">
            <span class="welcome-icon welcome-icon--navy" aria-hidden="true">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path v-for="path in icons[role.icon]" :key="path" :d="path" />
              </svg>
            </span>
            <h3 class="h4 mb-1">{{ role.name }}</h3>
            <p class="text-secondary">{{ role.summary }}</p>
            <ul class="welcome-checklist list-unstyled mb-0">
              <li v-for="point in role.points" :key="point">{{ point }}</li>
            </ul>
          </article>
        </div>
      </div>
    </div>
  </section>

  <!-- Closing call to action -->
  <section class="welcome-cta" aria-labelledby="access-title">
    <div class="container text-center">
      <h2 id="access-title" class="welcome-cta__title">Ready to start?</h2>
      <p class="welcome-cta__text">
        There is no public sign-up. An admin creates your account and gives you
        a temporary password. Log in, set your own password, and begin.
      </p>
      <RouterLink
        class="btn btn-light btn-lg rounded-pill px-5 fw-semibold"
        :to="{ name: 'login' }"
        >Log in</RouterLink
      >
    </div>
  </section>
</template>

<style scoped>
/* Warm paper tones for the light sections; the app's red and navy stay as the
   brand colours. */
.welcome-hero,
.welcome-section,
.welcome-cta {
  --welcome-cream: #fbf7f0;
  --welcome-sand: #f3ebdd;
  --welcome-line: #e7dcc8;
}
.welcome-hero {
  position: relative;
  background:
    radial-gradient(
      60rem 30rem at 85% -10%,
      rgba(var(--ot-brand-rgb), 0.35),
      transparent 60%
    ),
    linear-gradient(135deg, var(--ot-navy) 0%, #14335f 100%);
  color: #fff;
  padding: var(--ot-space-8) 0 calc(var(--ot-space-8) + 2rem);
  overflow: hidden;
}
/* A soft curve where the hero meets the next section. */
.welcome-hero::after {
  content: '';
  position: absolute;
  left: -5%;
  right: -5%;
  bottom: -1px;
  height: 3rem;
  background: var(--welcome-cream);
  border-radius: 50% 50% 0 0 / 100% 100% 0 0;
}
.welcome-pill {
  display: inline-block;
  margin-bottom: var(--ot-space-4);
  padding: 0.35rem 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: var(--ot-radius-pill);
  background: rgba(255, 255, 255, 0.08);
  font-size: var(--ot-text-sm);
  font-weight: var(--ot-weight-semibold);
}
.welcome-title {
  font-size: clamp(2.25rem, 1.6rem + 3vw, 3.75rem);
  font-weight: var(--ot-weight-bold);
  letter-spacing: -0.035em;
  line-height: 1.08;
  margin-bottom: var(--ot-space-4);
}
.welcome-title__accent {
  color: #ff9a9e;
}
.welcome-lead {
  max-width: 34rem;
  color: #d6e0ee;
  font-size: var(--ot-text-lg);
  margin-bottom: var(--ot-space-5);
}
.welcome-trust li {
  position: relative;
  padding-left: 1.6rem;
  margin-bottom: var(--ot-space-1);
  color: #d6e0ee;
  font-size: var(--ot-text-sm);
}
.welcome-trust li::before,
.welcome-checklist li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.3em;
  width: 1.05rem;
  height: 1.05rem;
  background: currentColor;
  mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23000' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 12.5 4.5 4.5L19 7.5'/%3E%3C/svg%3E")
    center / contain no-repeat;
}
.welcome-hero__image {
  display: block;
  width: 100%;
  height: auto;
  max-width: 36rem;
  margin-inline: auto;
}
@media (prefers-reduced-motion: no-preference) {
  .welcome-hero__image {
    animation: welcome-float 7s ease-in-out infinite;
  }
}
@keyframes welcome-float {
  50% {
    transform: translateY(-8px);
  }
}

.welcome-section {
  background: var(--welcome-cream);
  padding: var(--ot-space-8) 0;
}
.welcome-section:focus {
  outline: none;
}
.welcome-section--tint {
  background: var(--welcome-sand);
}
/* Small rounded label above a heading. */
.welcome-tag {
  display: inline-block;
  padding: 0.3rem 0.85rem;
  border: 1px solid var(--welcome-line);
  border-radius: var(--ot-radius-pill);
  background: #fff;
  color: var(--ot-brand);
  font-size: var(--ot-text-xs);
  font-weight: var(--ot-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.welcome-heading {
  text-align: center;
  font-size: var(--ot-text-title);
  font-weight: var(--ot-weight-bold);
  letter-spacing: -0.03em;
  margin-bottom: var(--ot-space-7);
}
.welcome-heading--left {
  text-align: left;
  margin-bottom: var(--ot-space-4);
}
.welcome-photo img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: var(--ot-radius-card);
  box-shadow: 0 1.25rem 2.5rem rgba(var(--ot-navy-rgb), 0.18);
}
.welcome-step {
  height: 100%;
  text-align: center;
}
.welcome-step__number {
  display: block;
  margin-bottom: var(--ot-space-1);
  color: var(--ot-brand);
  font-size: var(--ot-text-xs);
  font-weight: var(--ot-weight-bold);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.welcome-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3.5rem;
  height: 3.5rem;
  margin-bottom: var(--ot-space-3);
  border-radius: var(--ot-radius-card);
  background: var(--ot-brand-tint);
  color: var(--ot-brand);
}
.welcome-icon--navy {
  background: var(--ot-tint);
  color: var(--ot-navy);
}
.welcome-icon svg {
  width: 1.75rem;
  height: 1.75rem;
}
.welcome-role {
  padding: var(--ot-space-6) var(--ot-space-5);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}
@media (prefers-reduced-motion: no-preference) {
  .welcome-role:hover {
    transform: translateY(-4px);
    box-shadow: 0 0.75rem 1.5rem rgba(var(--ot-navy-rgb), 0.12);
  }
}
.welcome-checklist li {
  position: relative;
  padding-left: 1.6rem;
  margin-bottom: var(--ot-space-2);
}
.welcome-checklist li::before {
  color: var(--ot-success);
}

.welcome-cta {
  background: linear-gradient(135deg, var(--ot-brand) 0%, #a30f14 100%);
  color: #fff;
  padding: var(--ot-space-8) 0;
}
.welcome-cta__title {
  font-size: var(--ot-text-title);
  font-weight: var(--ot-weight-bold);
  letter-spacing: -0.03em;
}
.welcome-cta__text {
  max-width: 36rem;
  margin: 0 auto var(--ot-space-5);
  font-size: var(--ot-text-lg);
  color: #ffe9ea;
}
.welcome-cta .btn-light {
  color: var(--ot-brand);
}

@media (max-width: 575.98px) {
  .welcome-hero,
  .welcome-section,
  .welcome-cta {
    padding: var(--ot-space-7) 0;
  }
}
</style>
