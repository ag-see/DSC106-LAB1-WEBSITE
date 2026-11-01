import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import { fetchJSON, renderProjects } from '../global.js';

// Open and roll project data
const projects = await fetchJSON('../lib/projects.json');

const projectsContainer = document.querySelector('.projects');
renderProjects(projects, projectsContainer, 'h2');

const projectsTitle = document.querySelector('.projects_title');
projectsTitle.textContent = `Projects (${projects.length})`;

let selectedIndex = -1;

// Graph Data
function renderPieChart(projectsGiven) {
  // Group projects by year and count them
  let newRolledData = d3.rollups(
    projectsGiven,
    (v) => v.length,
    (d) => d.year
  );

  // Convert grouped data into chart data
  let newData = newRolledData.map(([year, count]) => {
    return { value: count, label: year };
  });

  // Generate pie chart slices
  let newArcGenerator = d3.arc().innerRadius(0).outerRadius(50);

  let newSliceGenerator = d3.pie().value((d) => d.value);
  let newArcData = newSliceGenerator(newData);
  let newArcs = newArcData.map((d) => newArcGenerator(d));

  // Color scale
  let colors = d3.scaleOrdinal(d3.schemeTableau10);

  // Clear previous chart and legend
  let newSVG = d3.select('svg');
  newSVG.selectAll('path').remove();

  let legend = d3.select('.legend');
  legend.selectAll('li').remove();

  // Render pie chart
newArcs.forEach((arc, i) => {
  newSVG
    .append('path')
    .attr('d', arc)
    .attr('fill', colors(i))
    .on('click', () => {
  selectedIndex = selectedIndex === i ? -1 : i;

  newSVG
    .selectAll('path')
    .attr('class', (_, idx) => (
      selectedIndex === idx ? 'selected' : ''
    ));

  legend
    .selectAll('li')
    .attr('class', (_, idx) => (
      selectedIndex === idx ? 'selected' : ''
    ));

    if (selectedIndex === -1) {
  renderProjects(searchedProjects, projectsContainer, 'h2');
} else {
  let selectedYear = newData[selectedIndex].label;

  let filteredProjects = searchedProjects.filter(
    project => project.year == selectedYear
  );

  renderProjects(filteredProjects, projectsContainer, 'h2');
}

});
});
// Render legend
newData.forEach((d, idx) => {
  legend
    .append('li')
    .attr('style', `--color:${colors(idx)}`)
    .attr('class', `legend-item ${selectedIndex === idx ? 'selected' : ''}`)
    .html(`<span class="swatch"></span> ${d.label} <em>(${d.value})</em>`);
});
}
let searchedProjects = projects;

renderPieChart(projects);

// Search Functionality
let query = '';
let searchInput = document.querySelector('.searchBar');

searchInput.addEventListener('change', (event) => {
  query = event.target.value;

  searchedProjects = projects.filter((project) => {
    let values = Object.values(project).join('\n').toLowerCase();
    return values.includes(query.toLowerCase());
  });

  selectedIndex = -1;

  renderProjects(searchedProjects, projectsContainer, 'h2');
  renderPieChart(searchedProjects);
});