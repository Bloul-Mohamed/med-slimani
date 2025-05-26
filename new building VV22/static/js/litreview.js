   
    let currentToken = localStorage.getItem('access_token') || null;  // load token

    function logout() {  // clear auth
      currentToken = null;  // reset
      localStorage.removeItem('access_token');  // remove token
      updateUI();  // refresh ui
    }

    async function fetchUserInfo() {  // get profile
      const res = await fetch('/users/me', {  // request
        headers: { 'authorization': `Bearer ${currentToken}` }  // auth header
      });
      return res.ok ? res.json() : null;  // parse or null
    }

    async function updateUI() {  // refresh navbar
      const signinLink    = document.getElementById('signinLink');    // sign in
      const signupLink    = document.getElementById('signupLink');    // sign up
      const logoutLink    = document.getElementById('logoutLink');    // log out
      const navUser       = document.getElementById('navUserName');   // user name
      const logoutFooter  = document.getElementById('logoutLinkFooter');  // footer

      if (!currentToken) {  // not authed
        signinLink.style.display   = 'inline';  // show sign in
        signupLink.style.display   = 'inline';  // show sign up
        logoutLink.style.display   = 'none';    // hide logout
        navUser.style.display      = 'none';    // hide user
        logoutFooter.style.display = 'none';    // hide footer
        return;  // exit
      }

      const user = await fetchUserInfo();  // load user
      if (!user) return logout();  // expired

      signinLink.style.display   = 'none';  // hide sign in
      signupLink.style.display   = 'none';  // hide sign up
      logoutLink.style.display   = 'inline';  // show logout
      navUser.textContent        = user.username;  // set text
      navUser.style.display      = 'inline';  // show user
      logoutFooter.style.display = 'inline';  // show footer
    }

    // PubMed side effect tool logic
    const pubmedForm    = document.getElementById('pubmedForm');  // form
    const pubmedInput   = document.getElementById('pubmedInput');  // input
    const pubmedList    = document.getElementById('pubmedList');   // datalist
    const pubmedResults = document.getElementById('pubmedResults');  // results

    function stripDosageForm(name) {  // clean name
      return name.replace(/\s*\(.*?\)\s*$/, '').trim();  // strip form
    }

    async function fetchDrugSuggestions(q) {  // nlm lookup
      if (!q) return [];  // empty
      const url = `https://clinicaltables.nlm.nih.gov/api/rxterms/v1/search?terms=${encodeURIComponent(q)}&df=DISPLAY_NAME&autocomp=1`;  // query
      const res = await fetch(url);  // fetch
      const [, names] = await res.json();  // parse
      return names.map(stripDosageForm);  // clean
    }

    function populateDatalist(listEl, items) {  // fill list
      listEl.innerHTML = '';  // clear
      items.forEach(name => {  // loop
        const opt = document.createElement('option');  // option
        opt.value = name;  // set
        listEl.appendChild(opt);  // append
      });
    }
    
    
    
    //This is a free tier Unlimited use key only 
 const API_KEY = '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';  
    async function correctDrugName(rawName) {  // typo fix
      const prompt = `Correct any typos in this drug name and return ONLY the corrected name, with no extra text: ${rawName}`;  // prompt
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {  // llm
          method: 'POST',
          headers: {'Content-Type':'application/json','Authorization':`Bearer ${API_KEY}`},  // headers
          body: JSON.stringify({model:'deepseek/deepseek-chat',messages:[{role:'user',content:prompt}],max_tokens:8})  // body
        });
        const j = await res.json();  // parse
        return j.choices[0].message.content.trim().replace(/^['"“”]+|['"“”]+$/g,'');  // clean
      } catch {
        return rawName;  // fallback
      }
    }

    async function getPubMedArticles() {  // search
      let term = pubmedInput.value.trim();  // get term
      term = await correctDrugName(term);  // correct
      if (!term) { pubmedResults.textContent = 'please enter a medication name.'; return; }  // validate

      pubmedResults.textContent = 'searching pubmed…';  // status
      try {
        const resp = await fetch(`/api/pubmed?term=${encodeURIComponent(term)}`);  // api call
        if (!resp.ok) throw new Error(resp.statusText);  // check
        const articles = await resp.json();  // parse
        if (!articles.length) {  // none
          pubmedResults.textContent = 'no studies found.';  // status
          return;
        }
        pubmedResults.innerHTML = articles.map(a => `  
          <div class="pubmed-card">  
            <a href="https://pubmed.ncbi.nlm.nih.gov/${a.pmid}" target="_blank">${a.title}</a>  
            <p>${a.authors.join(', ')}</p>  
            <p>published: ${a.pubdate}</p>  
          </div>
        `).join('');  // render
      } catch (err) {
        pubmedResults.textContent = 'error: ' + err.message;  // error
      }
    }

    pubmedInput.addEventListener('input', async e => {  // suggestions
      const suggestions = await fetchDrugSuggestions(e.target.value);  // fetch
      populateDatalist(pubmedList, suggestions);  // update
    });

    pubmedForm.addEventListener('submit', e => {  // form submit
      e.preventDefault();  // stop
      getPubMedArticles();  // run
    });

    document.addEventListener('DOMContentLoaded', updateUI);  // init
