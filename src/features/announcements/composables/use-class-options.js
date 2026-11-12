import { ref } from 'vue';
import { listAll } from '../../courses/services/course-class-services.js';
import { classLabel } from '../services/announcement-options.js';

// Classes for the feed's class filter. `list(params, { signal })` is a class
// list service. A failure only leaves the filter with "All classes".
export function useClassOptions({ list }) {
  const options = ref([]);
  const loading = ref(false);
  const error = ref(null);

  async function load() {
    loading.value = true;
    error.value = null;
    try {
      const classes = await listAll((params, config) => list(params, config));
      options.value = classes
        .map((item) => ({ value: String(item.id), label: classLabel(item) }))
        .sort((a, b) => a.label.localeCompare(b.label));
    } catch (cause) {
      error.value = cause;
      options.value = [];
    } finally {
      loading.value = false;
    }
  }

  return { options, loading, error, load };
}
