<script setup>
// Search, class, category and sort for the feed. The parent owns the values.
import { CATEGORIES, SORTS } from '../services/announcement-options.js';

defineProps({
  disabled: { type: Boolean, default: false },
  searchError: { type: String, default: '' },
  // [{ value, label }] for the class filter; empty leaves only "All classes".
  classOptions: { type: Array, default: () => [] },
});
const search = defineModel('search', { type: String, default: '' });
const classId = defineModel('classId', { type: String, default: '' });
const category = defineModel('category', { type: String, default: '' });
const sort = defineModel('sort', { type: String, default: 'newest' });
defineEmits(['search', 'change', 'clear']);
</script>

<template>
  <form class="ot-card mb-4" role="search" @submit.prevent="$emit('search')">
    <div class="row g-3 align-items-end">
      <div class="col-12 col-md-8">
        <label class="form-label" for="announcement-search"
          >Search announcements</label
        >
        <input
          id="announcement-search"
          v-model="search"
          class="form-control"
          :class="{ 'is-invalid': searchError }"
          type="search"
          maxlength="100"
          placeholder="Title or text"
          :aria-invalid="Boolean(searchError)"
          aria-describedby="announcement-search-error"
        />
        <div id="announcement-search-error" class="invalid-feedback">
          {{ searchError }}
        </div>
      </div>
      <div class="col-12 col-md-4 d-flex flex-wrap gap-2">
        <button type="submit" class="btn btn-primary" :disabled="disabled">
          Search
        </button>
        <button
          type="button"
          class="btn btn-outline-primary"
          :disabled="disabled"
          @click="$emit('clear')"
        >
          Clear
        </button>
      </div>
      <div class="col-12 col-xl-6">
        <label class="form-label" for="announcement-class">Class</label>
        <select
          id="announcement-class"
          v-model="classId"
          class="form-select"
          @change="$emit('change')"
        >
          <option value="">All classes</option>
          <option
            v-for="item in classOptions"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <label class="form-label" for="announcement-category">Category</label>
        <select
          id="announcement-category"
          v-model="category"
          class="form-select"
          @change="$emit('change')"
        >
          <option value="">All categories</option>
          <option
            v-for="item in CATEGORIES"
            :key="item.value"
            :value="item.value"
          >
            {{ item.label }}
          </option>
        </select>
      </div>
      <div class="col-12 col-sm-6 col-xl-3">
        <label class="form-label" for="announcement-sort">Sort by</label>
        <select
          id="announcement-sort"
          v-model="sort"
          class="form-select"
          @change="$emit('change')"
        >
          <option v-for="item in SORTS" :key="item.value" :value="item.value">
            {{ item.label }}
          </option>
        </select>
      </div>
    </div>
  </form>
</template>
