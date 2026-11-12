<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { auth } from '../../../app-context';
import ConfirmDialog from '../../../shared/components/ConfirmDialog.vue';
import RequestState from '../../../shared/components/RequestState.vue';
import { notify } from '../../../shared/composables/notifications.js';
import {
  formatDate,
  formatTime,
} from '../../../shared/utils/format-datetime.js';
import CommentForm from '../components/CommentForm.vue';
import CommentList from '../components/CommentList.vue';
import LikeButton from '../components/LikeButton.vue';
import { useLike } from '../composables/use-like.js';
import {
  ROLE_ROUTES,
  categoryInfo,
  classLabel,
  isEdited,
  plural,
} from '../services/announcement-options.js';
import { validateComment } from '../services/announcement-validation.js';
import { announcementEngagementService as service } from '../services/engagement-index.js';

const COMMENTS_PER_PAGE = 20;

const route = useRoute();
const router = useRouter();
const role = computed(() => route.meta.roles?.[0] ?? 'student');
const names = computed(() => ROLE_ROUTES[role.value]);
const feedTo = computed(() => ({ name: names.value.feed }));
// An admin reads and removes content but does not like or comment.
const canEngage = computed(() => role.value !== 'admin');

const post = ref(null);
const loading = ref(false);
const loadError = ref(null);
const notFound = ref(false);
const like = useLike({ service });
const likeError = computed(() => like.state.error);

const comments = ref([]);
const commentMeta = ref(null);
const commentsLoading = ref(false);
const loadingMore = ref(false);
const commentsError = ref('');
const commentText = ref('');
const commentError = ref('');
const sending = ref(false);
const form = ref();

const confirming = ref(null); // { kind: 'comment' | 'post', comment? }
const deleting = ref(false);
const deleteError = ref('');

let controller;
let active = true;

const category = computed(() => categoryInfo(post.value?.category));
const posted = computed(() =>
  post.value
    ? `${formatDate(post.value.created_at)}, ${formatTime(post.value.created_at)}`
    : '',
);
const canEdit = computed(
  () =>
    role.value === 'lecturer' && post.value?.author?.id === auth.state.user?.id,
);
const editTo = computed(() => ({
  name: ROLE_ROUTES.lecturer.edit,
  params: { announcementId: route.params.announcementId },
}));
const hasMore = computed(
  () =>
    commentMeta.value !== null &&
    commentMeta.value.page < commentMeta.value.totalPages,
);

// A 403 shows the forbidden page and a 404 shows "not found" on every action.
function handleCommon(cause) {
  if (cause?.status === 403 && cause.code === 'FORBIDDEN') {
    router.replace({ name: 'forbidden' });
    return true;
  }
  if (cause?.status === 404) {
    notFound.value = true;
    return true;
  }
  return false;
}

async function loadComments(page = 1) {
  const first = page === 1;
  if (first) commentsLoading.value = true;
  else loadingMore.value = true;
  commentsError.value = '';
  try {
    const result = await service.listComments(
      route.params.announcementId,
      { page, limit: COMMENTS_PER_PAGE },
      { signal: controller?.signal },
    );
    if (!active || controller?.signal.aborted) return;
    const known = new Set(comments.value.map((item) => item.id));
    comments.value = first
      ? result.data
      : [...comments.value, ...result.data.filter((c) => !known.has(c.id))];
    commentMeta.value = result.meta;
  } catch (cause) {
    if (cause?.name === 'AbortError' || !active) return;
    if (handleCommon(cause)) return;
    commentsError.value = cause?.message || 'The comments could not be loaded.';
  } finally {
    commentsLoading.value = false;
    loadingMore.value = false;
  }
}

async function load() {
  controller?.abort();
  controller = new AbortController();
  const { signal } = controller;
  loading.value = true;
  loadError.value = null;
  notFound.value = false;
  post.value = null;
  comments.value = [];
  commentMeta.value = null;
  try {
    const loaded = await service.get(route.params.announcementId, { signal });
    if (signal.aborted) return;
    post.value = loaded;
    like.set(loaded);
  } catch (cause) {
    if (cause?.name === 'AbortError') return;
    if (!handleCommon(cause)) loadError.value = cause;
    return;
  } finally {
    if (!signal.aborted) loading.value = false;
  }
  await loadComments(1);
}

async function toggleLike() {
  if (!post.value || !canEngage.value) return;
  try {
    await like.toggle(post.value.id);
    post.value.like_count = like.state.like_count;
  } catch (cause) {
    // The button already put the old state back and set its message.
    handleCommon(cause);
  }
}

async function sendComment() {
  if (sending.value) return;
  const check = validateComment(commentText.value);
  commentError.value = check.error;
  if (!check.valid) return form.value?.focus();
  sending.value = true;
  try {
    const created = await service.addComment(post.value.id, check.body);
    if (!active) return;
    if (!comments.value.some((item) => item.id === created.id))
      comments.value = [...comments.value, created];
    post.value.comment_count += 1;
    commentText.value = '';
  } catch (cause) {
    if (!active) return;
    if (handleCommon(cause)) return;
    // The typed text stays, so the person can try again.
    commentError.value =
      cause?.fields?.body ||
      cause?.message ||
      'Your comment could not be saved.';
  } finally {
    sending.value = false;
  }
}

function askDeleteComment(comment) {
  deleteError.value = '';
  confirming.value = { kind: 'comment', comment };
}

function askDeletePost() {
  deleteError.value = '';
  confirming.value = { kind: 'post' };
}

async function confirmDelete() {
  if (deleting.value || !confirming.value) return;
  deleting.value = true;
  deleteError.value = '';
  const { kind, comment } = confirming.value;
  try {
    if (kind === 'post') {
      await service.deletePost(post.value.id);
      if (!active) return;
      confirming.value = null;
      notify('Announcement deleted.', 'success');
      router.push(feedTo.value);
    } else {
      await service.deleteComment(comment.id);
      if (!active) return;
      removeComment(comment.id);
      confirming.value = null;
      notify('Comment deleted.', 'success');
    }
  } catch (cause) {
    if (!active) return;
    // A comment that is already gone is removed from the list too.
    if (kind === 'comment' && cause?.status === 404) {
      removeComment(comment.id);
      confirming.value = null;
      return;
    }
    if (cause?.status === 403 || cause?.status === 404) {
      confirming.value = null;
      handleCommon(cause);
      return;
    }
    deleteError.value = cause?.message || 'The delete did not work. Try again.';
  } finally {
    deleting.value = false;
  }
}

function removeComment(id) {
  if (!comments.value.some((item) => item.id === id)) return;
  comments.value = comments.value.filter((item) => item.id !== id);
  post.value.comment_count = Math.max(0, post.value.comment_count - 1);
}

// From the feed, Back returns to it with the same filters. Otherwise the link
// goes to the feed of this role.
function backToFeed(event) {
  const previous = window.history.state?.back;
  if (
    typeof previous === 'string' &&
    previous.startsWith(router.resolve(feedTo.value).path)
  ) {
    event.preventDefault();
    router.back();
  }
}

watch(() => [route.name, route.params.announcementId], load, {
  immediate: true,
});
onBeforeUnmount(() => {
  active = false;
  controller?.abort();
});
</script>

<template>
  <div class="ot-page-content">
    <RouterLink class="d-inline-block mb-4" :to="feedTo" @click="backToFeed"
      >← Back to announcements</RouterLink
    >

    <div v-if="notFound" class="ot-card ot-empty">
      <h1 class="ot-section-title">Announcement not found</h1>
      <p class="ot-meta">This announcement was not found.</p>
      <RouterLink class="btn btn-outline-primary" :to="feedTo"
        >Back to announcements</RouterLink
      >
    </div>
    <RequestState
      v-else-if="loading"
      state="loading"
      title="Loading announcement…"
    />
    <RequestState
      v-else-if="loadError"
      state="error"
      title="Could not load announcement"
      message="The server is not available. Please retry."
      retry
      @retry="load"
    />
    <template v-else-if="post">
      <article class="ot-card mb-4">
        <div class="d-flex flex-wrap align-items-center gap-2 mb-2">
          <span class="ot-status" :class="category.statusClass">{{
            category.label
          }}</span>
          <p class="ot-meta mb-0">
            {{ post.author?.name }} ·
            <time :datetime="post.created_at">{{ posted }}</time>
            <template v-if="isEdited(post)"> · Edited</template>
          </p>
        </div>
        <p class="ot-eyebrow mb-1">{{ classLabel(post.class) }}</p>
        <h1 class="ot-page-title mb-3">{{ post.title }}</h1>
        <p class="ot-announcement-body mb-4">{{ post.body }}</p>
        <div
          class="d-flex flex-wrap align-items-center justify-content-between gap-2"
        >
          <div class="d-flex flex-wrap align-items-center gap-3">
            <LikeButton
              :liked="like.state.liked"
              :count="like.state.like_count"
              :busy="like.state.busy"
              :readonly="!canEngage"
              @toggle="toggleLike"
            />
            <p class="ot-meta mb-0">
              {{ plural(post.comment_count, 'comment', 'comments') }}
            </p>
          </div>
          <div class="d-flex flex-wrap gap-2">
            <RouterLink
              v-if="canEdit"
              class="btn btn-sm btn-outline-primary"
              :to="editTo"
              >Edit</RouterLink
            >
            <button
              v-if="role === 'admin'"
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="askDeletePost"
            >
              Delete announcement
            </button>
          </div>
        </div>
        <p
          v-if="likeError"
          class="ot-notice ot-notice--error mt-3 mb-0"
          role="alert"
        >
          {{ likeError }}
        </p>
      </article>

      <section class="ot-card" aria-labelledby="comments-title">
        <h2 id="comments-title" class="ot-section-title mb-3">Comments</h2>
        <CommentList
          :comments="comments"
          :loading="commentsLoading"
          :error="commentsError"
          :has-more="hasMore"
          :loading-more="loadingMore"
          @delete="askDeleteComment"
          @load-more="loadComments(commentMeta.page + 1)"
          @retry="loadComments(1)"
        />
        <div v-if="canEngage" class="mt-4">
          <CommentForm
            ref="form"
            v-model="commentText"
            :busy="sending"
            :error="commentError"
            @submit="sendComment"
          />
        </div>
      </section>
    </template>

    <ConfirmDialog
      :open="confirming !== null"
      :busy="deleting"
      :error="deleteError"
      :title="
        confirming?.kind === 'post'
          ? 'Delete this announcement?'
          : 'Delete this comment?'
      "
      :message="
        confirming?.kind === 'post'
          ? 'This also deletes its likes and comments. This cannot be undone.'
          : 'This cannot be undone.'
      "
      :confirm-label="
        confirming?.kind === 'post' ? 'Delete announcement' : 'Delete comment'
      "
      @confirm="confirmDelete"
      @cancel="confirming = null"
    />
  </div>
</template>

<style scoped>
/* Keep the author's line breaks and wrap long words. Text is never HTML. */
.ot-announcement-body {
  white-space: pre-line;
  overflow-wrap: anywhere;
}
</style>
