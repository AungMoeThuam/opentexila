<script setup>
// Announcements from all of the user's classes, in one feed. One page serves
// the student, lecturer and admin routes; the role comes from the route.
import { computed, onBeforeUnmount, onMounted, watch } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';
import { auth } from '../../../app-context';
import RequestState from '../../../shared/components/RequestState.vue';
import ClassPagination from '../../enrolments/components/ClassPagination.vue';
import {
  adminClassesService,
  myClassesService,
} from '../../enrolments/services/index.js';
import AnnouncementCard from '../components/AnnouncementCard.vue';
import AnnouncementFilters from '../components/AnnouncementFilters.vue';
import { useAnnouncementFeed } from '../composables/use-announcement-feed.js';
import { useClassOptions } from '../composables/use-class-options.js';
import {
  FEED_SUBTITLE,
  ROLE_ROUTES,
} from '../services/announcement-options.js';
import {
  buildFeedQuery,
  parseFeedQuery,
  sameFeedQuery,
} from '../services/feed-query.js';
import { announcementsService } from '../services/index.js';

const route = useRoute();
const router = useRouter();
const role = computed(() => route.meta.roles?.[0]);
const names = computed(() => ROLE_ROUTES[role.value]);
const userId = computed(() => auth.state.user?.id);

// The address follows the filters. replace() keeps one history entry for the
// feed, so Back from a post returns here with the same filters.
const feed = useAnnouncementFeed({
  service: announcementsService,
  onChange: (state) => router.replace({ query: buildFeedQuery(state) }),
});
const { rows: posts, meta, loading, error } = feed;

const classes = useClassOptions({
  list: (params, config) =>
    (role.value === 'admin' ? adminClassesService : myClassesService).list(
      params,
      config,
    ),
});

const notFound = computed(() => error.value?.status === 404);

const detailTo = (post) => ({
  name: names.value.detail,
  params: { announcementId: post.id },
});
// Only the lecturer who wrote a post can edit it.
const editTo = (post) =>
  role.value === 'lecturer' && post.author?.id === userId.value
    ? { name: names.value.edit, params: { announcementId: post.id } }
    : null;
// A new post starts in the class the feed is filtered to, if any.
const newTo = computed(() => ({
  name: names.value.create,
  ...(feed.classId.value ? { query: { classId: feed.classId.value } } : {}),
}));

function showAllClasses() {
  feed.classId.value = '';
  feed.applyChoice();
}

function loadFromAddress() {
  feed.restore(parseFeedQuery(route.query));
  return feed.load();
}

watch(error, (cause) => {
  if (cause?.status === 403) router.replace({ name: 'forbidden' });
});
// Clicking "Announcements" in the sidebar again, or Back and Forward, changes
// the address without remounting the page: follow it.
watch(
  () => route.query,
  (query) => {
    if (!sameFeedQuery(query, buildFeedQuery(feed.state()))) loadFromAddress();
  },
);
onMounted(() => {
  classes.load();
  loadFromAddress();
});
onBeforeUnmount(() => feed.cancel());
</script>

<template>
  <div class="ot-page-content">
    <header class="ot-page-header">
      <div>
        <p class="ot-eyebrow">Classes</p>
        <h1 class="ot-page-title">Announcements</h1>
        <p class="ot-subtitle">{{ FEED_SUBTITLE[role] }}</p>
      </div>
      <RouterLink v-if="role === 'lecturer'" class="btn btn-primary" :to="newTo"
        >New announcement</RouterLink
      >
    </header>

    <AnnouncementFilters
      v-model:search="feed.search.value"
      v-model:class-id="feed.classId.value"
      v-model:category="feed.category.value"
      v-model:sort="feed.sort.value"
      :disabled="loading"
      :search-error="feed.searchError.value"
      :class-options="classes.options.value"
      @search="feed.applySearch"
      @change="feed.applyChoice"
      @clear="feed.clearFilters"
    />

    <div v-if="notFound" class="ot-card ot-empty">
      <h2 class="ot-section-title">Class not found</h2>
      <p class="ot-meta">
        This class does not exist, or you cannot see its announcements.
      </p>
      <button
        type="button"
        class="btn btn-outline-primary"
        @click="showAllClasses"
      >
        Show all classes
      </button>
    </div>
    <RequestState
      v-else-if="loading && !posts.length"
      state="loading"
      title="Loading announcements…"
    />
    <RequestState
      v-else-if="error"
      state="error"
      title="Could not load announcements"
      :message="error.message"
      retry
      @retry="feed.load"
    />
    <RequestState
      v-else-if="!posts.length"
      state="empty"
      :title="
        feed.filtered.value
          ? 'No matching announcements'
          : 'No announcements yet'
      "
      :message="
        feed.filtered.value
          ? 'Try a different search, class or category.'
          : role === 'lecturer'
            ? 'Post the first announcement for one of your classes.'
            : 'Nothing has been posted in your classes yet.'
      "
    />
    <section v-else :aria-busy="loading" aria-label="Announcements">
      <ul class="list-unstyled d-grid gap-3 mb-0">
        <li v-for="post in posts" :key="post.id">
          <AnnouncementCard
            :announcement="post"
            :detail-to="detailTo(post)"
            :edit-to="editTo(post)"
          />
        </li>
      </ul>
      <ClassPagination
        :meta="meta"
        :disabled="loading"
        noun="announcement"
        plural-noun="announcements"
        label="Announcement pages"
        @change="feed.setPage"
      />
    </section>
  </div>
</template>
