// auth token
let currentToken = localStorage.getItem('access_token');  // load token

function showLogin() {  // show login
  document.getElementById('authSection').style.display = 'block';  // show sect
  document.getElementById('loginForm').style.display = 'block';    // show form
  document.getElementById('userInfo').style.display = 'none';     // hide info
}

function login() {  // perform login
  const username = document.getElementById('username').value.trim();  // get user
  const password = document.getElementById('password').value;        // get pass
  const errorDiv = document.getElementById('error');                // get err
  errorDiv.textContent = '';                                        // clear err

  fetch('/token', {  // request token
    method: 'POST',
    headers: {'content-type': 'application/x-www-form-urlencoded'},  // form
    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`  // creds
  })
  .then(res => {
    if (!res.ok) throw res;  // bad
    return res.json();       // parse
  })
  .then(data => {
    currentToken = data.access_token;               // set token
    localStorage.setItem('access_token', currentToken);  // save
    updateUI();                                    // refresh ui
  })
  .catch(async errRes => {  // handle err
    let msg = 'login failed';
    try { const err = await errRes.json(); msg = err.detail || msg; } catch {}
    errorDiv.textContent = msg;  // show err
  });
}

function logout() {  // clear auth
  currentToken = null;                    // reset
  localStorage.removeItem('access_token');  // remove
  updateUI();                             // refresh ui
}

async function fetchUserInfo() {  // get user
  const res = await fetch('/users/me', {
    headers: { 'authorization': `Bearer ${currentToken}` }  // auth header
  });
  return res.ok ? res.json() : null;  // json or null
}

async function updateUI() {  // update nav
  const authSection = document.getElementById('authSection');  // sect
  const loginForm   = document.getElementById('loginForm');    // form
  const userInfo    = document.getElementById('userInfo');     // info
  const signinLink  = document.getElementById('signinLink');   // sign
  const signupLink  = document.getElementById('signupLink');   // sign up
  const logoutLink  = document.getElementById('logoutLink');   // log out
  const navUser     = document.getElementById('navUserName');  // user

  if (!currentToken) {  // no auth
    authSection.style.display = 'none';      // hide sect
    signinLink.style.display  = 'inline';    // show sign
    signupLink.style.display  = 'inline';    // show sign up
    logoutLink.style.display  = 'none';      // hide out
    navUser.style.display     = 'none';      // hide user
    return;
  }

  const user = await fetchUserInfo();  // call user
  if (!user) return logout();         // expire

  authSection.style.display   = 'block';  // show sect
  loginForm.style.display     = 'none';   // hide form
  userInfo.style.display      = 'block';  // show info
  document.getElementById('userName').textContent = user.username;  // set name

  signinLink.style.display    = 'none';   // hide sign
  signupLink.style.display    = 'none';   // hide sign up
  logoutLink.style.display    = 'inline'; // show out
  navUser.textContent         = user.username;  // set nav
  navUser.style.display       = 'inline'; // show nav
}

// on page load
document.addEventListener('DOMContentLoaded', updateUI);  // init ui



// menu toggle
const menuBtn = document.getElementById('menu-btn');
const navbar = document.querySelector('.header .navbar');

menuBtn.addEventListener('click', () => {
  navbar.classList.toggle('active');
  // swap icon between bars and X
  if (navbar.classList.contains('active')) {
    menuBtn.classList.replace('fa-bars', 'fa-times');
  } else {
    menuBtn.classList.replace('fa-times', 'fa-bars');
  }
});
