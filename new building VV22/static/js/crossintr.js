

let currentToken = localStorage.getItem('access_token') || null;  // load token

function logout() {  // clear auth
  currentToken = null;
  localStorage.removeItem('access_token');
  updateUI();  // refresh ui
}

async function fetchUserInfo() {  // get user
  const res = await fetch('/users/me', {
    headers: { 'authorization': `Bearer ${currentToken}` }
  });
  return res.ok ? res.json() : null;  // parse or null
}

async function updateUI() {  // refresh navbar
  const signinLink    = document.getElementById('signinLink');
  const signupLink    = document.getElementById('signupLink');
  const logoutLink    = document.getElementById('logoutLink');
  const navUser       = document.getElementById('navUserName');
  const signinFooter  = document.getElementById('signinLinkFooter');
  const signupFooter  = document.getElementById('signupLinkFooter');
  const logoutFooter  = document.getElementById('logoutLinkFooter');

  if (!currentToken) {
    signinLink.style.display  = 'inline';  // show sign
    signupLink.style.display  = 'inline';  // show register
    logoutLink.style.display  = 'none';    // hide logout
    navUser.style.display     = 'none';    // hide user

    signinFooter.style.display = 'inline';  // show footer
    signupFooter.style.display = 'inline';
    logoutFooter.style.display = 'none';
    return;
  }

  const user = await fetchUserInfo();  // get profile
  if (!user) return logout();  // expired

  signinLink.style.display  = 'none';   // hide sign
  signupLink.style.display  = 'none';   // hide register
  logoutLink.style.display  = 'inline'; // show logout
  navUser.textContent       = user.username;  // set name
  navUser.style.display     = 'inline'; // show user

  signinFooter.style.display = 'none';  // hide foot
  signupFooter.style.display = 'none';
  logoutFooter.style.display = 'inline';
}

// drug suggestion logic
function stripDosageForm(name) {  // clean name
  return name.replace(/\s*\(.*?\)\s*$/, '').trim();
}

async function fetchDrugSuggestions(q) {  // query nlm
  if (!q) return [];
  const url = `https://clinicaltables.nlm.nih.gov/api/rxterms/v1/search?terms=${encodeURIComponent(q)}&df=DISPLAY_NAME&autocomp=1`;
  const res = await fetch(url);
  const [, names] = await res.json();
  return names;  // return list
}

function populateDatalist(id, items) {  // fill options
  const dl = document.getElementById(id);
  dl.innerHTML = '';
  for (const name of items) {
    const opt = document.createElement('option');
    opt.value = stripDosageForm(name);  // set value
    dl.appendChild(opt);
  }
}

document.querySelectorAll('input[list]').forEach(input => {  // attach datalist
  const dlId = input.getAttribute('list');
  input.addEventListener('input', async () => {
    const suggestions = await fetchDrugSuggestions(input.value);
    populateDatalist(dlId, suggestions);  // update list
  });
});



// This is a free tier Unlimited use key only
const API_KEY='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';

async function correctDrugName(rawName) {  // fix typos
  const prompt = `Correct any typos in this drug name and return ONLY the corrected name: ${rawName}`;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8
      })
    });
    const j = await res.json();
    return j.choices[0].message.content.trim().replace(/^['"“”‘’]+|['"“”‘’]+$/g, '');  // strip quotes
  } catch {
    return rawName;  // fallback
  }
}

async function fetchInteractions(drugName) {  // get interactions
  const url = `https://api.fda.gov/drug/label.json?search=openfda.generic_name:"${encodeURIComponent(drugName)}"&limit=1`;
  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    const field = data.results?.[0]?.drug_interactions;
    return Array.isArray(field) ? field : [];
  } catch {
    return [];
  }
}
function cleanLLMHTML(raw) {
  return raw
    .replace(/^```[a-z]*\s*/i, '')   // remove ```html or ``` etc
    .replace(/```$/, '')             // remove ending ```
    .replace(/^<div[^>]*>/, '<div>') // sanitize div tags if extra attrs
    .trim();
}

async function formatInteractionText(rawText) {
  try {
    const res = await fetch('/api/format-interactions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ text: rawText })
    });
    if (!res.ok) throw new Error((await res.json()).detail || res.statusText);
    const { html } = await res.json();
    return html;
  } catch (err) {
    console.warn('Formatting via proxy failed:', err.message);
    return `<pre style="white-space: pre-wrap;">${rawText}</pre>`;
  }
}




async function checkDrugInteraction() {  // run check
  
  
  
  
  
  let raw1 = document.getElementById('drug1Input').value.trim();
  let raw2 = document.getElementById('drug2Input').value.trim();
  raw1 = await correctDrugName(raw1);  // fix first
  raw2 = await correctDrugName(raw2);  // fix second

  const out = document.getElementById('interactionResult');
   





  if (!raw1 || !raw2) {
    out.textContent = 'Please enter both drug names.';  // require both
    return;
  }

  out.textContent = 'Fetching raw interaction data…';  // feedback
  const [list1, list2] = await Promise.all([fetchInteractions(raw1), fetchInteractions(raw2)]);  // parallel
  const rawText = list1.concat(list2).join('\n\n');  // combine

  if (!rawText) {
    out.textContent = `No direct interactions found between "${raw1}" and "${raw2}".`;  // none
    return;
  }

  out.textContent = 'Organizing results…';  // feedback
  out.innerHTML = await formatInteractionText(rawText);  // display

 


}

document.getElementById('interactionForm').addEventListener('submit', function (e) {  // bind form
  e.preventDefault();
  checkDrugInteraction();  // invoke
});

document.addEventListener('DOMContentLoaded', updateUI);  // init ui
