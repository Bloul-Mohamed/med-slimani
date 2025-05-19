// get token
let currentToken = localStorage.getItem('access_token') || null;

// clear session
function logout() {
  currentToken = null;                         // clear memory
  localStorage.removeItem('access_token');     // clear storage
  updateUI();                                  // refresh ui
}

// fetch user
async function fetchUserInfo() {
  if (!currentToken) return null;              // no token found

  const res = await fetch('/users/me', {
    headers: { 'authorization': `Bearer ${currentToken}` } // token header
  });

  return res.ok ? res.json() : null;           // return user
}

// refresh ui
async function updateUI() {
  const signinLink       = document.getElementById('signinLink');       // top sign in
  const signupLink       = document.getElementById('signupLink');       // top sign up
  const logoutLink       = document.getElementById('logoutLink');       // top logout
  const navUser          = document.getElementById('navUserName');      // username text
  const signinFooter     = document.getElementById('signinLinkFooter'); // footer sign in
  const signupFooter     = document.getElementById('signupLinkFooter'); // footer sign up
  const logoutFooter     = document.getElementById('logoutLinkFooter'); // footer logout

  if (!currentToken) {
    signinLink.style.display   = 'inline';     // show sign in
    signupLink.style.display   = 'inline';     // show sign up
    logoutLink.style.display   = 'none';       // hide logout
    navUser.style.display      = 'none';       // hide user
    signinFooter.style.display = 'inline';     // show footer sign in
    signupFooter.style.display = 'inline';     // show footer sign up
    logoutFooter.style.display = 'none';       // hide footer logout
    return;
  }

  const user = await fetchUserInfo();          // try get user
  if (!user) return logout();                  // logout if bad

  signinLink.style.display   = 'none';         // hide sign in
  signupLink.style.display   = 'none';         // hide sign up
  logoutLink.style.display   = 'inline';       // show logout
  navUser.textContent        = user.username;  // set username
  navUser.style.display      = 'inline';       // show username

  signinFooter.style.display = 'none';         // hide footer sign in
  signupFooter.style.display = 'none';         // hide footer sign up
  logoutFooter.style.display = 'inline';       // show footer logout
}

// registration + auto-login logic
const form     = document.getElementById('registerForm'); // form element
const errorDiv = document.getElementById('error');        // error message

form.addEventListener('submit', async e => {
  e.preventDefault();                      // stop reload
  errorDiv.textContent = '';              // clear error

  const username = form.username.value.trim(); // get username
  const email    = form.email.value.trim();    // get email
  const password = form.password.value;        // get password

  //  REGISTER
  let res = await fetch('/register', {
    method: 'POST',                                   // register request
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password, role: 'patient' })
  });

  if (!res.ok) {
    let msg;
    try { msg = (await res.json()).detail || res.statusText; }
    catch { msg = res.statusText; }
    return void (errorDiv.textContent = 'registration failed: ' + msg); // show error
  }

  //  AUTO-LOGIN
  res = await fetch('/token', {
    method: 'POST',                                     // login request
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
  });

  if (res.ok) {
    const { access_token } = await res.json();          // get token
    localStorage.setItem('access_token', access_token); // store token
  }

  //  REDIRECT
  window.location.href = '/static/index.html';          // go home
});

// on load
document.addEventListener('DOMContentLoaded', updateUI); // run ui check
