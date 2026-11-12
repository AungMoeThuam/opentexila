<script setup>
// One announcement in the feed. All text is shown as plain text.
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
import {
  formatDate,
  formatTime,
} from '../../../shared/utils/format-datetime.js';
import {
  categoryInfo,
  classLabel,
  excerpt,
  isEdited,
  plural,
} from '../services/announcement-options.js';

const props = defineProps({
  announcement: { type: Object, required: true },
  detailTo: { type: Object, required: true },
  // Set only when the signed-in user may edit this post.
  editTo: { type: Object, default: null },
});

const category = computed(() => categoryInfo(props.announcement.category));
const posted = computed(
  () =>
    `${formatDate(props.announcement.created_at)}, ${formatTime(props.announcement.created_at)}`,
);
</script>

<template>
  <article class="ot-card">
    <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
      <span class="ot-status" :class="category.statusClass">{{
        category.label
      }}</span>
      <p class="ot-meta mb-0">
        {{ announcement.author?.name }} ·
        <time :datetime="announcement.created_at">{{ posted }}</time>
        <template v-if="isEdited(announcement)"> · Edited</template>
      </p>
    </div>
    <p class="ot-eyebrow mb-1">{{ classLabel(announcement.class) }}</p>
    <h2 class="ot-section-title mb-2">
      <RouterLink :to="detailTo">{{ announcement.title }}</RouterLink>
    </h2>
    <p class="ot-announcement-body mb-3">
      {{ excerpt(announcement.body) }}
    </p>
    <div
      class="d-flex flex-wrap align-items-center justify-content-between gap-2"
    >
      <p class="ot-meta mb-0">
        {{ plural(announcement.like_count, 'like', 'likes') }} ·
        {{ plural(announcement.comment_count, 'comment', 'comments') }}
      </p>
      <RouterLink
        v-if="editTo"
        class="btn btn-sm btn-outline-primary"
        :to="editTo"
        :aria-label="`Edit ${announcement.title}`"
        >Edit</RouterLink
      >
    </div>
  </article>
</template>

<style scoped>
/* Keep the author's line breaks and wrap long words. */
.ot-announcement-body {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
