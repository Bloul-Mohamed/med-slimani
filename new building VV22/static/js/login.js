// get token
let currentToken = localStorage.getItem('access_token') || null;

// clear session
function logout() {
  currentToken = null;                         // remove token memory
  localStorage.removeItem('access_token');     // remove token storage
  updateUI();                                  // refresh screen
}

// fetch user
async function fetchUserInfo() {
  if (!currentToken) return null;              // no token found

  const res = await fetch('/users/me', {
    headers: { 'authorization': `Bearer ${currentToken}` } // add token header
  });

  return res.ok ? res.json() : null;           // return user or null
}

// change display
async function updateUI() {
  const signinLink   = document.getElementById('signinLink');       // sign in button
  const signupLink   = document.getElementById('signupLink');       // sign up button
  const logoutLink   = document.getElementById('logoutLink');       // logout button
  const navUser      = document.getElementById('navUserName');      // username text
  const logoutFooter = document.getElementById('logoutLinkFooter'); // footer logout

  if (!currentToken) {
    signinLink.style.display   = 'inline';     // show sign in
    signupLink.style.display   = 'inline';     // show sign up
    logoutLink.style.display   = 'none';       // hide logout
    navUser.style.display      = 'none';       // hide user
    logoutFooter.style.display = 'none';       // hide footer logout
    return;
  }

  const user = await fetchUserInfo();          // try get user
  if (!user) return logout();                  // logout if failed

  signinLink.style.display   = 'none';         // hide sign in
  signupLink.style.display   = 'none';         // hide sign up
  logoutLink.style.display   = 'inline';       // show logout
  navUser.textContent        = user.username;  // set username
  navUser.style.display      = 'inline';       // show user
  logoutFooter.style.display = 'inline';       // show footer logout
}

// login logic
const form = document.getElementById('loginForm');     // form element
const errorDiv = document.getElementById('error');     // error message

form.addEventListener('submit', async e => {
  e.preventDefault();                      // stop reload
  errorDiv.textContent = '';              // clear error

  const username = form.username.value.trim(); // get username
  const password = form.password.value;        // get password

  try {
    const res = await fetch('/token', {
      method: 'POST',                                     // post request
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password })   // form body
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));     // try parse error
      throw new Error(err.detail || res.statusText);       // throw error
    }

    const { access_token } = await res.json();             // get token
    localStorage.setItem('access_token', access_token);    // save token
    window.location.href = '/static/index.html';           // go home
  } catch (err) {
    errorDiv.textContent = 'login failed: ' + err.message; // show error
  }
});

// on load
document.addEventListener('DOMContentLoaded', updateUI); // update screen
