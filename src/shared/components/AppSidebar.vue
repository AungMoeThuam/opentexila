<script setup>
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { RouterLink, useRoute } from 'vue-router';
import AppIcon from './AppIcon.vue';
import { navigationForRole } from '../../layouts/navigation';

const props = defineProps({
  collapsed: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
  mobile: { type: Boolean, default: false },
  role: { type: String, default: '' },
});
const emit = defineEmits(['close', 'expand']);

const navigation = computed(() => navigationForRole(props.role));
const sidebar = ref();
const closeButton = ref();
let previousOverflow;
function unlockScroll() {
  if (previousOverflow !== undefined) {
    document.body.style.overflow = previousOverflow;
    previousOverflow = undefined;
  }
}
watch(
  () => [props.mobile, props.open],
  async () => {
    await nextTick();
    if (!sidebar.value) return;
    if (props.mobile && props.open) {
      if (!sidebar.value.open) sidebar.value.showModal();
      closeButton.value?.focus();
      if (previousOverflow === undefined)
        previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    } else {
      if (props.mobile && sidebar.value.open) sidebar.value.close();
      unlockScroll();
    }
  },
  { immediate: true },
);
function backdropClick(event) {
  if (!props.mobile || event.target !== sidebar.value) return;
  const rect = sidebar.value.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    emit('close');
}
onBeforeUnmount(() => {
  if (props.mobile) sidebar.value?.close();
  unlockScroll();
});
const route = useRoute();
const expanded = reactive({});

function groupId(item) {
  return `nav-group-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function groupIsActive(item) {
  return item.children.some(
    (child) => route.path === child.to || route.path.startsWith(`${child.to}/`),
  );
}

// Keep the group that holds the current page open.
watch(
  () => [route.path, props.role],
  () => {
    for (const item of navigation.value) {
      if (item.children && groupIsActive(item)) expanded[item.label] = true;
    }
  },
  { immediate: true },
);

function toggleGroup(item) {
  // In the icon-only state, a group icon first widens the sidebar.
  if (props.collapsed) {
    expanded[item.label] = true;
    emit('expand');
    return;
  }
  expanded[item.label] = !expanded[item.label];
}
</script>

<template>
  <component
    :is="mobile ? 'dialog' : 'aside'"
    ref="sidebar"
    id="app-sidebar"
    class="ot-sidebar"
    aria-label="Main navigation"
    :class="{ 'is-open': open, 'is-collapsed': collapsed }"
    @cancel.prevent="emit('close')"
    @click="backdropClick"
  >
    <div class="ot-sidebar__head">
      <RouterLink
        class="ot-sidebar__brand text-decoration-none"
        to="/"
        @click="emit('close')"
      >
        <span class="ot-sidebar__brand-mark" aria-hidden="true">●</span>
        <span class="ot-sidebar__brand-text"> OpenTexila</span>
      </RouterLink>
      <button
        ref="closeButton"
        type="button"
        class="ot-icon-btn ot-sidebar__close d-lg-none"
        aria-label="Close navigation"
        @click="emit('close')"
      >
        <AppIcon name="x" />
      </button>
    </div>

    <nav aria-label="Main navigation">
      <ul class="ot-nav">
        <li v-for="item in navigation" :key="item.label">
          <template v-if="item.children">
            <button
              type="button"
              class="ot-nav__link"
              :class="{ 'has-active': groupIsActive(item) }"
              :aria-expanded="!collapsed && !!expanded[item.label]"
              :aria-controls="groupId(item)"
              :title="collapsed ? item.label : undefined"
              @click="toggleGroup(item)"
            >
              <AppIcon :name="item.icon" />
              <span class="ot-nav__label">{{ item.label }}</span>
              <AppIcon name="chevron-down" :size="16" class="ot-nav__chevron" />
            </button>
            <ul
              v-show="expanded[item.label]"
              :id="groupId(item)"
              class="ot-nav__sub"
            >
              <li v-for="child in item.children" :key="child.to">
                <RouterLink
                  class="ot-nav__link"
                  :to="child.to"
                  active-class=""
                  exact-active-class="is-active"
                  @click="emit('close')"
                >
                  <span class="ot-nav__label">{{ child.label }}</span>
                </RouterLink>
              </li>
            </ul>
          </template>
          <RouterLink
            v-else
            class="ot-nav__link"
            :to="item.to"
            active-class="is-active"
            :title="collapsed ? item.label : undefined"
            @click="emit('close')"
          >
            <AppIcon :name="item.icon" />
            <span class="ot-nav__label">{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>
  </component>
</template>
