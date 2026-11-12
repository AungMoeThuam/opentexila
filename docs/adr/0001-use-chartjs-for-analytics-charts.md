# Use Chart.js (via vue-chartjs) for analytics charts

The lecturer attendance analytics dashboard needs line, doughnut and bar charts. We use `chart.js` with the `vue-chartjs` Vue 3 wrapper, loaded lazily so it only downloads when the analytics page opens.

The project rule is "no extra UI libraries". We treat Chart.js as a charting library, not a UI kit, so this is a deliberate, documented exception rather than a change to the rule. The alternative was hand-rolled SVG charts, which avoids the dependency but means building and maintaining axes, tooltips, legends, responsiveness and accessibility behaviour ourselves.

Consequences: only the Chart.js parts we use are registered to keep the bundle small, and chart components are async so the library stays out of the main bundle. Replacing the library later would touch the chart wrapper and every chart component.
