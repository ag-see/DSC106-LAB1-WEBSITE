console.log('IT’S ALIVE!');

// Insert theme selector
document.body.insertAdjacentHTML(
  'afterbegin',
  `
	<label class="color-scheme">
		Theme:
		<select>
			<option>System Theme</option>
            <option>Light</option>
            <option>Dark</option>
		</select>
	</label>`,
);

export async function fetchJSON(url) {
    try {
    // Fetch the JSON file from the given URL
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch projects: ${response.statusText}`);
        }   

    const data = await response.json();
    return data;

    } catch (error) {
     console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
        
    containerElement.innerHTML = '';
    for (const project of projects) {
        const article = document.createElement('article');

        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
            <p>${project.year}</p>
        `;

        containerElement.appendChild(article);
    }
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}

// Check current host name, adjust urls according to hosting rules
const BASE_PATH = (location.hostname === "localhost" || location.hostname === "127.0.0.1")
  ? "/"                  // Local server
  : "/DSC106-LAB1-WEBSITE/";         // GitHub Pages repo name


// Define and store urls and their respective titles for the navigation bar
let pages = [
  { url: '', title: 'Home' },
  { url: 'projects/', title: 'Projects' },
  { url: 'contact/', title: 'Contact'},
  { url: 'https://github.com/ag-see', title: 'GitHub'},
  { url: 'cv/', title: 'Resume'},
];

// Create nav element in body 
let nav = document.createElement('nav');
document.body.prepend(nav);

// Loop through 'pages' and add elements to nav bar
for (let p of pages) {
    let url = p.url;
    url = !url.startsWith('http') ? BASE_PATH + url : url;
    let title = p.title;
    let a = document.createElement('a');

    a.href = url;
    a.textContent = title;

    a.classList.toggle(
        'current',
        a.host === location.host && a.pathname === location.pathname,
    );

    if (a.host !== location.host) {
    a.target = "_blank";
    }

    nav.append(a);
}


const select = document.querySelector('select');

if ("colorScheme" in localStorage) {
    document.documentElement.style.colorScheme = localStorage.colorScheme;
    select.value = localStorage.colorScheme;
}

select.addEventListener('input', function (event) {
    console.log('color scheme changed to', event.target.value);
    document.documentElement.style.setProperty('color-scheme', event.target.value);
    localStorage.colorScheme = event.target.value
});