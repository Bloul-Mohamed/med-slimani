const API_BASE = ''; // api root

// get token
let currentToken = localStorage.getItem('access_token') || null;

// clear session
function logout() {
  currentToken = null;                         // reset memory
  localStorage.removeItem('access_token');     // remove token
  updateUI();                                  // refresh ui
}

// get user
async function fetchUserInfo() {
  if (!currentToken) return null;              // no token

  const res = await fetch('/users/me', {
    headers: { 'authorization': `Bearer ${currentToken}` } // bearer token
  });

  return res.ok ? res.json() : null;           // user or null
}

// update screen
async function updateUI() {
  const signinLink       = document.getElementById('signinLink');       // top sign in
  const signupLink       = document.getElementById('signupLink');       // top sign up
  const logoutLink       = document.getElementById('logoutLink');       // top logout
  const navUser          = document.getElementById('navUserName');      // username text
  const signinFooter     = document.getElementById('signinLinkFooter'); // footer sign in
  const logoutFooter     = document.getElementById('logoutLinkFooter'); // footer logout

  if (!currentToken) {
    signinLink.style.display   = 'inline';     // show sign in
    signupLink.style.display   = 'inline';     // show sign up
    logoutLink.style.display   = 'none';       // hide logout
    navUser.style.display      = 'none';       // hide username
    signinFooter.style.display = 'inline';     // show footer sign in
    logoutFooter.style.display = 'none';       // hide footer logout
    return;
  }

  const user = await fetchUserInfo();          // try user
  if (!user) return logout();                  // fallback logout

  signinLink.style.display   = 'none';         // hide sign in
  signupLink.style.display   = 'none';         // hide sign up
  logoutLink.style.display   = 'inline';       // show logout
  navUser.textContent        = user.username;  // set username
  navUser.style.display      = 'inline';       // show username
  signinFooter.style.display = 'none';         // hide footer sign in
  logoutFooter.style.display = 'inline';       // show footer logout
}

// side effect tool logic
async function checkSideEffects() {
  const med = document.getElementById('medicationInput').value.trim(); // input value
  const out = document.getElementById('sideEffectsResponse');          // result box

  if (!med) {
    out.textContent = 'please enter a medication name.'; // empty input
    return;
  }

  out.textContent = 'analyzing safety profile…';         // loading text

  try {
    const res = await fetch(API_BASE + '/api/side-effects', {
      method: 'POST',                                   // query api
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ med })                     // send med name
    });

    if (!res.ok) {
      throw new Error((await res.json().catch(() => {}))?.detail || res.statusText); // error msg
    }

    const data = await res.json();                      // get response
    const reply = data.reply || 'no safety info found.';// fallback text

    // extract header from markdown
    const HEADER_RX = /^(<div class="query-header">[\s\S]*?<\/div><hr\/?>)/;
    let headerHTML = '';                                // header html
    let bodyMD     = reply;                             // markdown body
    const m = reply.match(HEADER_RX);
    if (m) {
      headerHTML = m[1];                                // save header
      bodyMD     = reply.slice(m[1].length);            // cut header
    }

    // show header + parsed markdown
    out.innerHTML = headerHTML + marked.parse(bodyMD);  // render result
  } catch (err) {
    out.textContent = 'error: ' + err.message;          // show error
  }
}

// form submit
document
  .getElementById('sideEffectsForm')
  .addEventListener('submit', e => {
    e.preventDefault();   // block reload
    checkSideEffects();   // run check
  });

// autocomplete input
document
  .getElementById('medicationInput')
  .addEventListener('input', async e => {
    const list = document.getElementById('medicationList'); // suggestion list
    list.innerHTML = '';                                    // clear list
    for (const name of await fetchDrugSuggestions(e.target.value)) {
      const opt = document.createElement('option');         // new option
      opt.value = name;                                     // set value
      list.appendChild(opt);                                // add to list
    }
  });

// drug autocomplete api
async function fetchDrugSuggestions(q) {
  if (!q) return []; // no query

  const res = await fetch(
    `https://clinicaltables.nlm.nih.gov/api/rxterms/v1/search?terms=${encodeURIComponent(
      q
    )}&df=DISPLAY_NAME&autocomp=1`
  );

  const [, names] = await res.json();                   // get names
  return names.map(n => n.replace(/\s*\(.*?\)\s*$/, '').trim()); // clean names
}

// init on load
window.addEventListener('DOMContentLoaded', updateUI);  // ui refresh
