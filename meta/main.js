import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale;
let yScale;

let filteredCommits = [];

let colors = d3.scaleOrdinal(d3.schemeTableau10);

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

function renderSelectionCount(selection) {
    const selectedCommits = selection
        ? filteredCommits.filter((d) => isCommitSelected(selection, d))
        : [];

    const countElement = document.querySelector('#selection-count');

    countElement.textContent = `${
        selectedCommits.length || 'No'
    } commits selected`;

    return selectedCommits;
}

function processCommits(data) {
    return d3
        .groups(data, d => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;

            let ret = {
                id: commit,
                url: 'https://github.com/ag-see/DSC106-LAB1-WEBSITE/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };

            Object.defineProperty(ret, 'lines', {
                value: lines,
            });

            return ret;
        })
        .sort((a, b) => a.datetime - b.datetime);
}

function renderCommitInfo(data, commits) {
    d3.select('#stats').selectAll('*').remove();
    const dl = d3.select('#stats').append('dl').attr('class', 'info');

    // Total LOC
    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    // Total commits
    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    // Number of files
    const files = d3.group(data, d => d.file);
    dl.append('dt').text('Number of files');
    dl.append('dd').text(files.size);

    // Longest file
    const fileLengths = Array.from(files, ([file, lines]) => ({
        file,
        length: lines.length
    }));

    const longestFile = d3.greatest(fileLengths, d => d.length);

    dl.append('dt').text('Longest file');
    dl.append('dd').text(
        `${longestFile.file} (${longestFile.length} lines)`
    );

    // Average file length
    const averageLength = d3.mean(fileLengths, d => d.length);

    dl.append('dt').text('Average file length');
    dl.append('dd').text(`${averageLength.toFixed(2)} lines`);

    // Most active day of the week
    const commitsByDay = d3.rollup(
        commits,
        v => v.length,
        d => new Date(d.date).toLocaleDateString('en-US', {
            weekday: 'long'
        })
    );

    const mostActiveDay = d3.greatest(
        Array.from(commitsByDay, ([day, count]) => ({ day, count })),
        d => d.count
    );

    dl.append('dt').text('Most active day');
    dl.append('dd').text(
        `${mostActiveDay.day} (${mostActiveDay.count} commits)`
    );
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateScatterPlot(data, commits) {


    if (commits.length === 0) {
        return;
    }

    const svg = d3.select('#chart').select('svg');

    xScale = xScale.domain(d3.extent(commits, d => d.datetime));

    const [minLines, maxLines] = d3.extent(
        commits,
        d => d.totalLines
    );

    const rScale = d3.scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    const xAxis = d3.axisBottom(xScale);

    const xAxisGroup = svg.select('g.x-axis');
    xAxisGroup.selectAll('*').remove();
    xAxisGroup.call(xAxis);

    const dots = svg.select('g.dots');

    const sortedCommits = d3.sort(
        commits,
        d => -d.totalLines
    );

    dots
        .selectAll('circle')
        .data(sortedCommits, d => d.id)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 1);

            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', event => {
            d3.select(event.currentTarget)
                .style('fill-opacity', 0.7);

            updateTooltipVisibility(false);
        });
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
    const brush = d3.brush()
        .on('start brush end', brushed);

    svg.call(brush);

    svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function updateFileDisplay(filteredCommits) {
    let lines = filteredCommits.flatMap(d => d.lines);

    let files = d3
        .groups(lines, d => d.file)
        .map(([name, lines]) => {
            return {
                name,
                lines,
                type: lines[0]?.type
            };
        })
        .sort((a, b) => b.lines.length - a.lines.length);

    let filesContainer = d3
        .select('#files')
        .selectAll('div')
        .data(files, d => d.name)
        .join(
            enter =>
                enter.append('div').call(div => {
                    div.append('dt').append('code');
                    div.append('dd');
                })
        );

    filesContainer
    .select('dt > code')
    .html(d => `${d.name}<small>${d.lines.length} lines</small>`);

filesContainer
    .attr('style', d => `--color: ${colors(d.type)}`);

filesContainer
    .select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc');
}

function isCommitSelected(selection, commit) {
    if (!selection) {
        return false;
    }

    const [[x0, y0], [x1, y1]] = selection;

    const x = xScale(commit.datetime);
    const y = yScale(commit.hourFrac);

    return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 50 };

    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    const svg = d3
        .select('#chart')
        .selectAll('svg')
        .data([null])
        .join('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

    yScale = d3
    .scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

    // Sort commits by total lines in descending order
    const sortedCommits = d3.sort(commits, d => -d.totalLines);

    // Scale circle radius based on total lines
    const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
    const rScale = d3
        .scaleSqrt()
        .domain([minLines, maxLines])
        .range([2, 30]);

    // Add gridlines before dots so they appear behind them
    const gridlines = svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`);

    gridlines.call(
        d3.axisLeft(yScale)
            .tickFormat('')
            .tickSize(-usableArea.width)
    );

    // Draw dots
    const dots = svg.append('g').attr('class', 'dots');

    dots
        .selectAll('circle')
        .data(sortedCommits, d => d.id)
        .join('circle')
        .attr('cx', d => xScale(d.datetime))
        .attr('cy', d => yScale(d.hourFrac))
        .attr('r', d => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });

    // Create the axes
    const xAxis = d3.axisBottom(xScale);

    const yAxis = d3
        .axisLeft(yScale)
        .tickFormat(d => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
        .append('g')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .attr('class', 'x-axis')
        .call(xAxis);

    // Add Y axis
    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .attr('class', 'y-axis')
        .call(yAxis);

    createBrushSelector(svg);
}


function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');

  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? filteredCommits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : filteredCommits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

let data = await loadData();
let commits = processCommits(data);

filteredCommits = commits;

renderScatterPlot(data, commits);
renderCommitInfo(data, commits);

console.log(commits);

d3.select('#scatter-story')
  .selectAll('.step')
  .data(commits)
  .join('div')
  .attr('class', 'step')
  .html(
    (d, i) => `
		On ${d.datetime.toLocaleString('en', {
      dateStyle: 'full',
      timeStyle: 'short',
    })},
		I made <a href="${d.url}" target="_blank">${
      i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
    }</a>.
		I edited ${d.totalLines} lines across ${
      d3.rollups(
        d.lines,
        (D) => D.length,
        (d) => d.file,
      ).length
    } files.
		Then I looked over all I had made, and I saw that it was very good. <br> <br>
	`,
  );

function onStepEnter(response) {
    const commit = response.element.__data__;

    const commitIndex = commits.findIndex(
        d => d.id === commit.id
    );

    if (commitIndex === -1) return;

    filteredCommits = commits.slice(0, commitIndex + 1);

    updateScatterPlot(data, filteredCommits);
    updateFileDisplay(filteredCommits);

    // Keep total LOC and file count based on the complete dataset
    renderCommitInfo(data, filteredCommits);
}

d3.select('#file-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html(
        (d, i) => `
            On ${d.datetime.toLocaleString('en', {
                dateStyle: 'full',
                timeStyle: 'short',
            })},
            I made<a href="${d.url}" target="_blank">${
                i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
            }</a>.
            I edited ${d.totalLines} lines across ${
                d3.rollups(
                    d.lines,
                    D => D.length,
                    d => d.file
                ).length
            } files.
            Let's see how the file sizes changed. <br><br>
        `
    );

// Scrollytelling for the commit scatterplot
const scroller = scrollama();

scroller
    .setup({
        container: '#scrolly-1',
        step: '#scrolly-1 .step',
    })
    .onStepEnter(onStepEnter);


// Scrollytelling for the file-size visualization
const scroller2 = scrollama();

scroller2
    .setup({
        container: '#scrolly-2',
        step: '#scrolly-2 .step',
    })
    .onStepEnter(onStepEnter);