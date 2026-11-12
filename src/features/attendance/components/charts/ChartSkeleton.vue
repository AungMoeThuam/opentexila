<template>
  <div
    class="ot-card"
    role="status"
    aria-busy="true"
    aria-label="Loading chart"
  >
    <div class="placeholder-glow">
      <span class="placeholder col-4 mb-3"></span>
      <span class="placeholder col-12 d-block chart-skeleton"></span>
    </div>
  </div>
</template>

<style scoped>
.chart-skeleton {
  height: 14rem;
}
</style>
